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
from datetime import datetime, timedelta
import uvicorn
from google import genai
from google.genai import types
from collections import Counter

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

@app.put("/users/{user_id}", response_model=schemas.UserResponse)
def update_user(user_id: int, user_update: schemas.UserUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    update_data = user_update.model_dump(exclude_none=True)
    for key, value in update_data.items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user

# --- ROTAS DE PACIENTES ---

@app.get("/patients/", response_model=list[schemas.PatientResponse])
def list_patients(owner_id: int, db: Session = Depends(get_db)):
    return db.query(models.Patient).filter(models.Patient.owner_id == owner_id).all()

# --- ROTAS DE CASOS CLÍNICOS ---

@app.post("/cases/", response_model=schemas.CaseResponse)
def create_case(case_data: schemas.CaseCreate, owner_id: int, db: Session = Depends(get_db)):
    patient = None

    if case_data.patient_id:
        patient = db.query(models.Patient).filter(models.Patient.id == case_data.patient_id).first()

    if not patient and case_data.patient_data:
        if case_data.patient_data.cpf:
            patient = db.query(models.Patient).filter(
                models.Patient.cpf == case_data.patient_data.cpf
            ).first()

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

    extended_anamnesis = {}
    if case_data.antecedentes_pessoais:
        extended_anamnesis["antecedentes_pessoais"] = case_data.antecedentes_pessoais
    if case_data.antecedentes_familiares:
        extended_anamnesis["antecedentes_familiares"] = case_data.antecedentes_familiares
    if case_data.antecedentes_cirurgicos:
        extended_anamnesis["antecedentes_cirurgicos"] = case_data.antecedentes_cirurgicos
    if case_data.historia_gineco_obstetrica:
        extended_anamnesis["historia_gineco_obstetrica"] = case_data.historia_gineco_obstetrica
    if case_data.habitos_vida:
        extended_anamnesis["habitos_vida"] = case_data.habitos_vida
    if case_data.medicamentos_uso:
        extended_anamnesis["medicamentos_uso"] = case_data.medicamentos_uso
    if case_data.alergias:
        extended_anamnesis["alergias"] = case_data.alergias
    if case_data.revisao_sistemas:
        extended_anamnesis["revisao_sistemas"] = case_data.revisao_sistemas
    if case_data.pediatric_responsible:
        extended_anamnesis["pediatric_responsible"] = case_data.pediatric_responsible
    if case_data.pediatric_vaccines:
        extended_anamnesis["pediatric_vaccines"] = case_data.pediatric_vaccines
    if case_data.pediatric_breastfed:
        extended_anamnesis["pediatric_breastfed"] = case_data.pediatric_breastfed
    if case_data.pediatric_dnpm:
        extended_anamnesis["pediatric_dnpm"] = case_data.pediatric_dnpm

    idade = calcular_idade(patient.birth_date)
    care_type = case_data.care_type or "Clínica Geral"
    is_pediatric = isinstance(idade, int) and idade < 12

    contexto_anamnese = ""
    if case_data.anamnesis:
        contexto_anamnese += f"\nAnamnese Geral: {case_data.anamnesis}"
    if case_data.hpma:
        contexto_anamnese += f"\nHPMA (História da Presente Moléstia Atual): {case_data.hpma}"
    if extended_anamnesis.get("antecedentes_pessoais"):
        contexto_anamnese += f"\nAntecedentes Pessoais: {extended_anamnesis['antecedentes_pessoais']}"
    if extended_anamnesis.get("antecedentes_familiares"):
        contexto_anamnese += f"\nAntecedentes Familiares: {extended_anamnesis['antecedentes_familiares']}"
    if extended_anamnesis.get("antecedentes_cirurgicos"):
        contexto_anamnese += f"\nAntecedentes Cirúrgicos: {extended_anamnesis['antecedentes_cirurgicos']}"
    if extended_anamnesis.get("historia_gineco_obstetrica"):
        contexto_anamnese += f"\nHistória Gineco-Obstétrica: {extended_anamnesis['historia_gineco_obstetrica']}"
    if extended_anamnesis.get("habitos_vida"):
        contexto_anamnese += f"\nHábitos de Vida: {extended_anamnesis['habitos_vida']}"
    if extended_anamnesis.get("medicamentos_uso"):
        contexto_anamnese += f"\nMedicamentos em Uso: {extended_anamnesis['medicamentos_uso']}"
    if extended_anamnesis.get("alergias"):
        contexto_anamnese += f"\nAlergias: {extended_anamnesis['alergias']}"
    if extended_anamnesis.get("revisao_sistemas"):
        contexto_anamnese += f"\nRevisão por Sistemas: {extended_anamnesis['revisao_sistemas']}"
    if extended_anamnesis.get("pediatric_vaccines"):
        contexto_anamnese += f"\nSituação Vacinal: {extended_anamnesis['pediatric_vaccines']}"
    if extended_anamnesis.get("pediatric_dnpm"):
        contexto_anamnese += f"\nDesenvolvimento Neuropsicomotor (DNPM): {extended_anamnesis['pediatric_dnpm']}"
    if extended_anamnesis.get("pediatric_breastfed"):
        contexto_anamnese += f"\nAleitamento Materno: {extended_anamnesis['pediatric_breastfed']}"

    if care_type == "Urgência":
        instrucao_tipo = (
            "ATENÇÃO: Este é um atendimento de URGÊNCIA/EMERGÊNCIA. "
            "Priorize a identificação de condições que ameaçam a vida. "
            "A urgência tende a ser Alta. Seja objetivo e direto na justificativa."
        )
    elif care_type == "Pediátrico" or is_pediatric:
        instrucao_tipo = (
            "ATENÇÃO: Paciente PEDIÁTRICO. "
            "Adapte todas as dosagens de medicamentos ao peso/idade pediátrica (mg/kg quando aplicável). "
            "Considere diagnósticos diferenciais prevalentes na faixa etária. "
            "Verifique esquema vacinal e desenvolvimento neuropsicomotor no raciocínio clínico."
        )
    else:
        instrucao_tipo = (
            "Realize triagem clínica completa de Clínica Geral. "
            "Considere diagnósticos diferenciais amplos e condutas baseadas em evidências."
        )

    prompt = f"""
    Campos ausentes do contexto indicam que a informação não estava disponível — ignore-os na análise clínica.

    Atue como um médico especialista sênior. {instrucao_tipo}

    TIPO DE ATENDIMENTO: {care_type}

    DADOS DO PACIENTE:
    - Nome: {patient.full_name}
    - Idade: {idade} anos
    - Sexo: {patient.gender}
    - Histórico Base (Condições Preexistentes): {patient.medical_history or "Não informado"}
    {contexto_anamnese}

    QUEIXA PRINCIPAL / SINTOMAS ATUAIS: {case_data.symptoms}
    EXAMES INFORMADOS: {case_data.exams or "Nenhum"}

    Retorne ESTRITAMENTE um JSON com as seguintes chaves:
    - referral: string. DEVE ser exatamente um dos valores: "Urgência", "Clínica Geral", "Pediatra", "Cardiologia", "Ortopedia", "Neurologia", "Ginecologia", "Psiquiatria", "Dermatologia", "Oftalmologia", "Otorrinolaringologia", "Urologia", "Gastroenterologia", "Pneumologia", "Endocrinologia", "Oncologia", "Reumatologia", "Infectologia", "Nefrologia", "Hematologia", "Outro"
    - urgency: string exatamente "Alta", "Média" ou "Baixa"
    - justification: string com justificativa clínica detalhada
    - pathology_type: string com o tipo de patologia. DEVE ser exatamente um dos valores: "Infecciosa", "Cardiovascular", "Respiratória", "Neurológica", "Gastrointestinal", "Musculoesquelética", "Dermatológica", "Endócrina/Metabólica", "Psiquiátrica", "Oncológica", "Ginecológica/Obstétrica", "Urológica", "Oftalmológica", "Otorrinolaringológica", "Hematológica", "Imunológica/Autoimune", "Neonatal/Pediátrica", "Traumatológica/Ortopédica", "Renal/Nefrologica", "Outra"
    - cid10: objeto com "code" (código CID-10 principal, ex: "J18.0") e "description" (descrição em português)
    - cid10_secondary: lista de objetos com "code" e "description" para diagnósticos secundários relevantes (pode ser lista vazia se não houver)
    - diagnoses: lista de objetos com "name" (nome do diagnóstico) e "probability" (ex: "75%"), ordenados do mais ao menos provável
    - exams: lista de strings com exames sugeridos. Se nenhum exame for necessário, retorne lista vazia []
    - medications: lista de strings com medicações sugeridas (nome genérico + dosagem). Se nenhuma medicação for indicada agora, retorne lista vazia []
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

        if "diagnoses" not in ai_result: ai_result["diagnoses"] = []
        if "exams" not in ai_result: ai_result["exams"] = []
        if "medications" not in ai_result: ai_result["medications"] = []
        if "pathology_type" not in ai_result: ai_result["pathology_type"] = "Outra"
        if "cid10" not in ai_result: ai_result["cid10"] = {"code": "Z99", "description": "Não classificado"}
        if "cid10_secondary" not in ai_result: ai_result["cid10_secondary"] = []

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

    new_case = models.Case(
        patient_id=patient.id,
        care_type=care_type,
        anamnesis=case_data.anamnesis,
        hpma=case_data.hpma,
        extended_anamnesis_json=extended_anamnesis if extended_anamnesis else None,
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

@app.put("/cases/{case_id}", response_model=schemas.CaseDetailResponse)
def update_case(case_id: int, case_update: schemas.CaseUpdate, db: Session = Depends(get_db)):
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Caso não encontrado")

    update_data = case_update.model_dump(exclude_none=True)

    extended_fields = {
        "antecedentes_pessoais", "antecedentes_familiares", "antecedentes_cirurgicos",
        "historia_gineco_obstetrica", "habitos_vida", "medicamentos_uso", "alergias", "revisao_sistemas"
    }

    extended_updates = {k: v for k, v in update_data.items() if k in extended_fields}
    direct_updates = {k: v for k, v in update_data.items() if k not in extended_fields}

    if extended_updates:
        existing_ext = dict(case.extended_anamnesis_json) if case.extended_anamnesis_json else {}
        existing_ext.update(extended_updates)
        case.extended_anamnesis_json = existing_ext

    if "symptoms" in direct_updates:
        case.symptoms = direct_updates["symptoms"]
    if "exams" in direct_updates:
        case.exams_input = direct_updates["exams"]
    if "anamnesis" in direct_updates:
        case.anamnesis = direct_updates["anamnesis"]
    if "hpma" in direct_updates:
        case.hpma = direct_updates["hpma"]
    if "doctor_conclusion" in direct_updates:
        case.doctor_conclusion = direct_updates["doctor_conclusion"]

    db.commit()
    db.refresh(case)

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
        case.medical_history = None

    return case

@app.get("/cases/", response_model=list[schemas.CaseResponse])
def read_cases(owner_id: int, db: Session = Depends(get_db)):
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
    case = db.query(models.Case).filter(models.Case.id == case_id, models.Case.owner_id == owner_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Caso não encontrado")
    db.delete(case)
    db.commit()
    return None

@app.get("/dashboard/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(owner_id: int, db: Session = Depends(get_db)):
    cases = db.query(models.Case).filter(models.Case.owner_id == owner_id).all()

    urgency_counter: Counter = Counter()
    care_type_counter: Counter = Counter()
    pathology_counter: Counter = Counter()

    for case in cases:
        ai = case.ai_analysis_json or {}
        urgency_val = ai.get("urgency", "Indefinida")
        if urgency_val not in ("Alta", "Média", "Baixa"):
            urgency_val = "Indefinida"
        urgency_counter[urgency_val] += 1

        care_type_counter[case.care_type or "Clínica Geral"] += 1

        pathology_val = ai.get("pathology_type")
        if pathology_val:
            pathology_counter[pathology_val] += 1

    urgency_order = ["Alta", "Média", "Baixa", "Indefinida"]
    urgency_result = [
        {"name": k, "value": urgency_counter[k]}
        for k in urgency_order if urgency_counter[k] > 0
    ]

    care_type_result = [
        {"name": k, "value": v} for k, v in care_type_counter.most_common()
    ]

    pathology_result = [
        {"name": k, "value": v} for k, v in pathology_counter.most_common(5)
    ]

    today = datetime.now().date()
    cases_by_date_map: dict = {}
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        cases_by_date_map[day.isoformat()] = 0

    for case in cases:
        if case.created_at:
            day_str = case.created_at.date().isoformat() if hasattr(case.created_at, 'date') else str(case.created_at)[:10]
            if day_str in cases_by_date_map:
                cases_by_date_map[day_str] += 1

    cases_by_date_result = [
        {"date": date_str, "total": total}
        for date_str, total in cases_by_date_map.items()
    ]

    return {
        "urgency": urgency_result,
        "care_type": care_type_result,
        "pathology": pathology_result,
        "cases_by_date": cases_by_date_result,
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
