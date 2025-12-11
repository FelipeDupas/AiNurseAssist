from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any

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

# --- CASE SCHEMAS ---
class CaseCreate(BaseModel):
    fullName: str
    age: int # Frontend manda string, mas convertemos, ou mudamos aqui para str se preferir
    gender: str
    medicalHistory: Optional[str] = ""
    symptoms: str
    exams: Optional[str] = ""

class CaseResponse(BaseModel):
    id: int
    patient_name: str
    status: str
    created_at: str
    ai_analysis_json: Optional[Any] = None

    class Config:
        from_attributes = True