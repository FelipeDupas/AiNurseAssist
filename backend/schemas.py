from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime

# --- USER SCHEMAS ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    crm: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    crm: Optional[str] = None
    phone: Optional[str] = None
    specialty: Optional[str] = None

class UserResponse(UserBase):
    id: int
    phone: Optional[str] = None
    specialty: Optional[str] = None
    class Config:
        from_attributes = True

# --- PATIENT SCHEMAS ---
class PatientBase(BaseModel):
    full_name: str
    birth_date: str
    gender: str
    cpf: Optional[str] = None
    mother_name: Optional[str] = None
    medical_history: Optional[str] = ""

class PatientResponse(PatientBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

# --- CASE SCHEMAS ---
class CaseCreate(BaseModel):
    patient_id: Optional[int] = None
    patient_data: Optional[PatientBase] = None

    care_type: Optional[str] = "Clínica Geral"

    anamnesis: Optional[str] = None
    hpma: Optional[str] = None

    antecedentes_pessoais: Optional[str] = None
    antecedentes_familiares: Optional[str] = None
    antecedentes_cirurgicos: Optional[str] = None
    historia_gineco_obstetrica: Optional[str] = None
    habitos_vida: Optional[str] = None
    medicamentos_uso: Optional[str] = None
    alergias: Optional[str] = None
    revisao_sistemas: Optional[str] = None

    pediatric_responsible: Optional[str] = None
    pediatric_vaccines: Optional[str] = None
    pediatric_breastfed: Optional[str] = None
    pediatric_dnpm: Optional[str] = None

    symptoms: str
    exams: Optional[str] = None

class CaseUpdate(BaseModel):
    symptoms: Optional[str] = None
    exams: Optional[str] = None
    anamnesis: Optional[str] = None
    hpma: Optional[str] = None
    antecedentes_pessoais: Optional[str] = None
    antecedentes_familiares: Optional[str] = None
    antecedentes_cirurgicos: Optional[str] = None
    historia_gineco_obstetrica: Optional[str] = None
    habitos_vida: Optional[str] = None
    medicamentos_uso: Optional[str] = None
    alergias: Optional[str] = None
    revisao_sistemas: Optional[str] = None
    doctor_conclusion: Optional[str] = None

class CaseResponse(BaseModel):
    id: int
    patient_id: int
    status: str
    created_at: Any
    ai_analysis_json: Optional[Any] = None
    patient_name: Optional[str] = None
    care_type: Optional[str] = None

    class Config:
        from_attributes = True

class CaseDetailResponse(CaseResponse):
    birth_date: Optional[str] = None
    gender: Optional[str] = None
    cpf: Optional[str] = None
    mother_name: Optional[str] = None
    medical_history: Optional[str] = None
    anamnesis: Optional[str] = None
    hpma: Optional[str] = None
    extended_anamnesis_json: Optional[Any] = None
    symptoms: str
    exams_input: Optional[str] = None
    doctor_conclusion: Optional[str] = None

    class Config:
        from_attributes = True

# --- DASHBOARD SCHEMAS ---
class NameValueItem(BaseModel):
    name: str
    value: int

class DateTotalItem(BaseModel):
    date: str
    total: int

class DashboardStats(BaseModel):
    urgency: List[NameValueItem]
    care_type: List[NameValueItem]
    pathology: List[NameValueItem]
    cases_by_date: List[DateTotalItem]
