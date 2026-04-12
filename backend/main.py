from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
import models
import schemas
from database import engine, get_db
import os 
from dotenv import load_dotenv
import json
from datetime import datetime
import uvicorn
from google import genai
from google.genai import types

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY") 
if not api_key:
    raise ValueError("ERRO: A variável GEMINI_API_KEY não foi encontrada no arquivo .env")

client = genai.Client(api_key=api_key)

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Nurse Assist API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def calcular_idade(data_nascimento_str):
    """Calcula a idade exata para precisão clínica da IA"""
    try:
        data_nasc = datetime.strptime(data_nascimento_str, "%Y-%m-%d")
        hoje = datetime.now()
        return hoje.year - data_nasc.year - ((hoje.month, hoje.day) < (data_nasc.month, data_nasc.day))
    except Exception as e:
        print(f"Erro ao calcular idade: {e}")
        return "não identificada"


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

# --- ROTAS DE CASOS CLÍNICOS ---

@app.post("/cases/", response_model=schemas.CaseResponse)
def create_case(case_data: schemas.CaseCreate, owner_id: int, db: Session = Depends(get_db)):
    """
    Cria ou localiza um paciente e gera uma nova análise de caso via Gemini
    """
    # 1. IDENTIFICAR OU CRIAR O PACIENTE
    patient = None
    
    if case_data.patient_id:
        patient = db.query(models.Patient).filter(models.Patient.id == case_data.patient_id).first()
    
    if not patient and case_data.patient_data:
        # Busca por CPF primeiro (se fornecido) para evitar duplicatas
        if case_data.patient_data.cpf:
            patient = db.query(models.Patient).filter(
                models.Patient.cpf == case_data.patient_data.cpf
            ).first()
        
        # Fallback: busca por Nome + Data de Nascimento
        if not patient:
            patient = db.query(models.Patient).filter(
                models.Patient.full_name == case_data.patient_data.full_name,
                models.Patient.birth_date == case_data.patient_data.birth_date
            ).first()
            
        if not patient:
            patient = models.Patient(
                full_name=case_data.patient_data.full_name,
                birth_date=case_data.patient_data.birth_date,
                gender=case_data.patient_data.gender,
                cpf=case_data.patient_data.cpf,
                mother_name=case_data.patient_data.mother_name,
                medical_history=case_data.patient_data.medical_history,
                owner_id=owner_id
            )
            db.add(patient)
            db.commit()
            db.refresh(patient)

    if not patient:
        raise HTTPException(status_code=400, detail="Dados do paciente não encontrados ou incompletos.")

    # 2. CONSULTAR O GEMINI
    idade = calcular_idade(patient.birth_date)

    # Monta contexto clínico completo incluindo anamnese e HPMA
    contexto_anamnese = ""
    if case_data.anamnesis:
        contexto_anamnese += f"\nAnamnese Médica: {case_data.anamnesis}"
    if case_data.hpma:
        contexto_anamnese += f"\nHPMA (História da Presente Moléstia Atual): {case_data.hpma}"

    prompt = f"""
    Atue como um médico especialista sênior. Realize a triagem clínica completa:
    
    DADOS DO PACIENTE:
    - Nome: {patient.full_name}
    - Idade: {idade} anos
    - Sexo: {patient.gender}
    - Histórico Base (Condições Preexistentes): {patient.medical_history or "Não informado"}
    {contexto_anamnese}
    
    QUEIXA PRINCIPAL / SINTOMAS ATUAIS: {case_data.symptoms}
    EXAMES INFORMADOS: {case_data.exams or "Nenhum"}

    Retorne ESTRITAMENTE um JSON com as seguintes chaves:
    - referral: string com o encaminhamento sugerido. DEVE ser um dos valores: "Urgência", "Clínica Geral", "Pediatra", "Cardiologia", "Ortopedia", "Neurologia", "Ginecologia", "Psiquiatria", "Dermatologia", "Oftalmologia", "Otorrinolaringologia", "Urologia", "Gastroenterologia", "Pneumologia", "Endocrinologia", "Oncologia", "Reumatologia", "Infectologia", "Nefrologia", "Hematologia", "Outro"
    - urgency: string "Alta", "Média" ou "Baixa"
    - justification: string com a justificativa clínica detalhada
    - pathology_type: string com o tipo de patologia (ex: "Infecciosa", "Cardiovascular", "Neurológica", "Ortopédica", "Gastrointestinal", "Respiratória", "Dermatológica", "Endocrinológica", "Psiquiátrica", "Oncológica", "Autoimune", "Metabólica", "Congênita", "Traumática", "Outra")
    - cid10: objeto com "code" (código CID-10, ex: "J06.9") e "description" (descrição, ex: "Infecção aguda das vias aéreas superiores")
    - diagnoses: lista de objetos com "name" (nome do diagnóstico) e "probability" (probabilidade como porcentagem, ex: "75%")
    - exams: lista de strings com exames sugeridos
    - medications: lista de strings com medicações sugeridas (nome genérico + dosagem sugerida)
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )
        
        ai_result = json.loads(response.text)
        
        # Proteção contra chaves faltantes
        if "diagnoses" not in ai_result: ai_result["diagnoses"] = []
        if "exams" not in ai_result: ai_result["exams"] = []
        if "medications" not in ai_result: ai_result["medications"] = []
        if "pathology_type" not in ai_result: ai_result["pathology_type"] = "Não classificado"
        if "cid10" not in ai_result: ai_result["cid10"] = {"code": "Z99", "description": "Não classificado"}

    except Exception as e:
        print(f"Erro Gemini: {e}")
        ai_result = {
            "referral": "Clínica Geral", 
            "urgency": "Indefinida", 
            "justification": "Erro no processamento da IA. Avaliação manual necessária.", 
            "pathology_type": "Não classificado",
            "cid10": {"code": "Z99", "description": "Sem classificação disponível"},
            "diagnoses": [],
            "exams": [],
            "medications": []
        }

    # 3. SALVAR O CASO
    new_case = models.Case(
        patient_id=patient.id,
        anamnesis=case_data.anamnesis,
        hpma=case_data.hpma,
        symptoms=case_data.symptoms,
        exams_input=case_data.exams,
        owner_id=owner_id,
        status="Analisado",
        ai_analysis_json=ai_result
    )
    
    db.add(new_case)
    db.commit()
    db.refresh(new_case)
    
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
        case.patient_name = name
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
        case.cpf = patient.cpf
        case.mother_name = patient.mother_name
        case.medical_history = patient.medical_history
    else:
        case.patient_name = "Desconhecido"
        case.birth_date = None
        case.gender = "N/A"
        case.cpf = None
        case.mother_name = None
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

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)