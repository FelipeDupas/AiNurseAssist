from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models
import schemas
from database import engine, get_db
import os 
from dotenv import load_dotenv
import google.generativeai as genai
import json
import re

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY") 
if not api_key:
    raise ValueError("ERRO: A variável GEMINI_API_KEY não foi encontrada no arquivo .env")

genai.configure(api_key=api_key)

# Cria as tabelas no banco se não existirem
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Nurse Assist API")

# --- CONFIGURAÇÃO DE CORS ---
# Permite que o Front-end (React) converse com o Back-end
origins = [
    "http://localhost:5173",
    "http://localhost:8080",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Em produção, use a lista 'origins'
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ROTAS DE USUÁRIO ---

# 1. CADASTRO
@app.post("/users/", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Verifica se email já existe
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    # Cria usuário (simulação de hash na senha)
    fake_hashed_password = user.password # Em produção use bcrypt!
    
    new_user = models.User(
        email=user.email, 
        hashed_password=fake_hashed_password, 
        full_name=user.full_name,
        crm=user.crm
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

# 2. LOGIN (Essa é a rota que estava faltando ou com erro!)
@app.post("/login", response_model=schemas.UserResponse)
def login(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    # Busca usuário pelo email
    user = db.query(models.User).filter(models.User.email == user_credentials.email).first()

    # Verifica se usuário existe
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Verifica a senha
    if user.hashed_password != user_credentials.password:
        raise HTTPException(status_code=403, detail="Senha incorreta")

    return user

@app.get("/users/{user_id}", response_model=schemas.UserResponse)
def read_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return db_user

# 4. ATUALIZAR DADOS DO USUÁRIO
@app.put("/users/{user_id}", response_model=schemas.UserResponse)
def update_user(user_id: int, user_data: schemas.UserUpdate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Atualiza apenas os campos enviados
    if user_data.full_name: db_user.full_name = user_data.full_name
    if user_data.email: db_user.email = user_data.email
    if user_data.crm: db_user.crm = user_data.crm
    if user_data.phone: db_user.phone = user_data.phone
    if user_data.specialty: db_user.specialty = user_data.specialty
    
    db.commit()
    db.refresh(db_user)
    return db_user

# --- ROTAS DE CASOS CLÍNICOS ---

# 3. CRIAR CASO (IA SIMULADA)
@app.post("/cases/", response_model=schemas.CaseResponse)
def create_case(
    case_data: schemas.CaseCreate, 
    owner_id: int, 
    db: Session = Depends(get_db)
):
    print("🤖 Consultando o Gemini...")

    # Configuração do modelo
    model = genai.GenerativeModel('models/gemini-2.0-flash') # Modelo rápido e barato

    # Montamos o prompt pedindo ESTRITAMENTE um JSON
    prompt = f"""
    Atue como um médico especialista sênior realizando uma triagem.
    Analise o seguinte caso clínico:

    Paciente: {case_data.fullName}, {case_data.age} anos, Sexo: {case_data.gender}
    Histórico: {case_data.medicalHistory}
    Sintomas atuais: {case_data.symptoms}
    Exames prévios: {case_data.exams}

    Retorne APENAS um objeto JSON (sem markdown, sem ```json) com a seguinte estrutura exata:
    {{
        "referral": "Especialidade médica sugerida (ex: Cardiologista)",
        "urgency": "Alta, Média ou Baixa",
        "justification": "Explicação técnica e direta do motivo do encaminhamento (max 3 linhas)",
        "diagnoses": [
            {{"name": "Nome do diagnóstico provável", "probability": "Alta/Média/Baixa"}}
        ],
        "exams": ["Lista de exames complementares sugeridos"],
        "medications": ["Lista de classes medicamentosas ou fármacos sugeridos (se aplicável)"]
    }}
    """

    try:
        response = model.generate_content(prompt)
        ai_text = response.text
        
        # Limpeza de segurança (caso o Gemini mande ```json no começo)
        ai_text = re.sub(r"```json", "", ai_text)
        ai_text = re.sub(r"```", "", ai_text).strip()
        
        # Converte o texto em Dicionário Python
        ai_result = json.loads(ai_text)

    except Exception as e:
        print(f"Erro no Gemini: {e}")
        # Fallback caso a API falhe
        ai_result = {
            "referral": "Clínico Geral",
            "urgency": "Indefinida",
            "justification": "Erro ao processar análise inteligente. Requer avaliação manual.",
            "diagnoses": [],
            "exams": [],
            "medications": []
        }

    # Salva no banco
    new_case = models.Case(
        patient_name=case_data.fullName,
        age=case_data.age,
        gender=case_data.gender,
        medical_history=case_data.medicalHistory,
        symptoms=case_data.symptoms,
        exams_input=case_data.exams,
        owner_id=owner_id,
        status="Analisado",
        ai_analysis_json=ai_result
    )
    
    db.add(new_case)
    db.commit()
    db.refresh(new_case)
    return new_case

# 4. LISTAR CASOS DO MÉDICO
@app.get("/cases/", response_model=list[schemas.CaseResponse])
def read_cases(owner_id: int, db: Session = Depends(get_db)):
    cases = db.query(models.Case).filter(models.Case.owner_id == owner_id).all()
    return cases

# 5. DETALHES DO CASO
@app.get("/cases/{case_id}")
def read_case_detail(case_id: int, db: Session = Depends(get_db)):
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Caso não encontrado")
    return case