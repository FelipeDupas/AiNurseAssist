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
    full_name: str       # Mudou de fullName para full_name
    birth_date: str      # Mudou de birthDate para birth_date
    gender: str
    medical_history: Optional[str] = "" # Mudou de medicalHistory para medical_history

class PatientResponse(PatientBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

# --- CASE SCHEMAS ---
class CaseCreate(BaseModel):
    patient_id: Optional[int] = None
    patient_data: Optional[PatientBase] = None
    symptoms: str
    exams: Optional[str] = ""

class CaseResponse(BaseModel):
    id: int
    patient_id: int
    status: str
    created_at: Any
    ai_analysis_json: Optional[Any] = None
    patient_name: Optional[str] = None 

    class Config:
        from_attributes = True

class CaseDetailResponse(CaseResponse):
    birth_date: Optional[str] = None
    gender: Optional[str] = None
    medical_history: Optional[str] = None
    symptoms: str
    exams_input: Optional[str] = None
    
    class Config:
        from_attributes = True