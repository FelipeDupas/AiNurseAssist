from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
import models
import schemas
from database import engine, get_db
import os 
from dotenv import load_dotenv
import google.generativeai as genai
import json
import re
from datetime import datetime

load_dotenv()

# --- CONFIGURAÇÃO IA ---
api_key = os.getenv("GEMINI_API_KEY") 
if not api_key:
    raise ValueError("ERRO: A variável GEMINI_API_KEY não foi encontrada no arquivo .env")

genai.configure(api_key=api_key)

# Cria as tabelas no banco se não existirem
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Nurse Assist API")

# --- CONFIGURAÇÃO DE CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- FUNÇÕES AUXILIARES ---

def calcular_idade(data_nascimento_str):
    """Calcula a idade exata para precisão clínica da IA"""
    try:
        data_nasc = datetime.strptime(data_nascimento_str, "%Y-%m-%d")
        hoje = datetime.now()
        # Cálculo considerando se já fez aniversário no ano corrente
        return hoje.year - data_nasc.year - ((hoje.month, hoje.day) < (data_nasc.month, data_nasc.day))
    except Exception as e:
        print(f"Erro ao calcular idade: {e}")
        return "não identificada"

# --- ROTAS DE USUÁRIO (MÉDICO) ---

@app.post("/login", response_model=schemas.UserResponse)
def login(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_credentials.email).first()
    if not user or user.hashed_password != user_credentials.password:
        raise HTTPException(status_code=403, detail="Credenciais incorretas")
    return user

@app.post("/users/", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    new_user = models.User(
        email=user.email, 
        hashed_password=user.password, 
        full_name=user.full_name,
        crm=user.crm
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.get("/users/{user_id}", response_model=schemas.UserResponse)
def read_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# --- ROTAS DE PACIENTES ---

@app.get("/patients/", response_model=list[schemas.PatientResponse])
def list_patients(owner_id: int, db: Session = Depends(get_db)):
    """Lista todos os pacientes cadastrados pelo médico"""
    return db.query(models.Patient).filter(models.Patient.owner_id == owner_id).all()

# --- ROTAS DE CASOS CLÍNICOS (COM SEPARAÇÃO DE PACIENTE) ---

@app.post("/cases/", response_model=schemas.CaseResponse)
def create_case(case_data: schemas.CaseCreate, owner_id: int, db: Session = Depends(get_db)):
    """
    Cria ou localiza um paciente e gera uma nova análise de caso via Gemini
    """
    # 1. IDENTIFICAR OU CRIAR O PACIENTE
    patient = None
    
    # Prioridade 1: Buscar por ID se fornecido (fluxo de retorno)
    if case_data.patient_id:
        patient = db.query(models.Patient).filter(models.Patient.id == case_data.patient_id).first()
    
    # Prioridade 2: Buscar por Nome + Data de Nascimento se dados do paciente forem enviados
    if not patient and case_data.patient_data:
        patient = db.query(models.Patient).filter(
            # AQUI MUDOU: usamos .full_name e .birth_date do schema também
            models.Patient.full_name == case_data.patient_data.full_name,
            models.Patient.birth_date == case_data.patient_data.birth_date
        ).first()
        
        if not patient:
            patient = models.Patient(
                full_name=case_data.patient_data.full_name,     # Ajustado
                birth_date=case_data.patient_data.birth_date,   # Ajustado
                gender=case_data.patient_data.gender,
                medical_history=case_data.patient_data.medical_history, # Ajustado
                owner_id=owner_id
            )
            db.add(patient)
            db.commit()
            db.refresh(patient)

    if not patient:
        raise HTTPException(status_code=400, detail="Dados do paciente não encontrados ou incompletos.")

    # 2. CONSULTAR O GEMINI (USANDO SEU SALDO DISPONÍVEL)
    idade = calcular_idade(patient.birth_date)
    model = genai.GenerativeModel('models/gemini-2.0-flash')

    prompt = f"""
    Atue como um médico especialista sênior. Realize a triagem:
    Paciente: {patient.full_name}, {idade} anos, Sexo: {patient.gender}.
    Histórico Base (Condições Preexistentes): {patient.medical_history}
    Sintomas Atuais da Consulta: {case_data.symptoms}
    Exames Informados: {case_data.exams}

    Retorne ESTRITAMENTE um JSON com as chaves: referral, urgency (Alta/Média/Baixa), justification, diagnoses (lista com name e probability), exams, medications.
    """

    try:
        response = model.generate_content(prompt)
        # Limpeza de markdown para garantir o parse do JSON
        ai_text = re.sub(r"```json|```", "", response.text).strip()
        ai_result = json.loads(ai_text)
        # Proteção contra campos vazios que quebram a interface
        if "diagnoses" not in ai_result: ai_result["diagnoses"] = []
    except Exception as e:
        print(f"Erro Gemini: {e}")
        ai_result = {
            "referral": "Clínico Geral", 
            "urgency": "Indefinida", 
            "justification": "Erro no processamento da IA. Avaliação manual necessária.", 
            "diagnoses": []
        }

    # 3. SALVAR O CASO VINCULADO AO PACIENTE
    new_case = models.Case(
        patient_id=patient.id,
        symptoms=case_data.symptoms,
        exams_input=case_data.exams,
        owner_id=owner_id,
        status="Analisado",
        ai_analysis_json=ai_result
    )
    
    db.add(new_case)
    db.commit()
    db.refresh(new_case)
    
    # Preenche o nome para a resposta do schemas.CaseResponse exigida pelo Frontend
    new_case.patient_name = patient.full_name
    return new_case

@app.get("/cases/", response_model=list[schemas.CaseResponse])
def read_cases(owner_id: int, db: Session = Depends(get_db)):
    """Retorna todos os casos com o nome do paciente via JOIN para o Dashboard"""
    results = db.query(models.Case, models.Patient.full_name).\
              join(models.Patient, models.Case.patient_id == models.Patient.id).\
              filter(models.Case.owner_id == owner_id).\
              order_by(models.Case.id.desc()).all()
    
    cases_list = []
    for case, name in results:
        case.patient_name = name # Mapeia o nome do paciente para o schema de resposta
        cases_list.append(case)
    return cases_list

@app.get("/cases/{case_id}", response_model=schemas.CaseDetailResponse)
def read_case_detail(case_id: int, db: Session = Depends(get_db)):
    """Busca detalhes de um caso específico e o nome do paciente vinculado"""
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Caso não encontrado")
    
    patient = db.query(models.Patient).filter(models.Patient.id == case.patient_id).first()
    if patient:
        case.patient_name = patient.full_name
        case.birth_date = patient.birth_date
        case.gender = patient.gender
        case.medical_history = patient.medical_history
    else:
        case.patient_name = "Desconhecido"
        case.birth_date = None
        case.gender = "N/A"
        case.medical_history = "N/A"

    return case

@app.delete("/cases/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_case(case_id: int, owner_id: int, db: Session = Depends(get_db)):
    """Remove um caso clínico do banco de dados"""
    case = db.query(models.Case).filter(models.Case.id == case_id, models.Case.owner_id == owner_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Caso não encontrado")
    db.delete(case)
    db.commit()
    return None