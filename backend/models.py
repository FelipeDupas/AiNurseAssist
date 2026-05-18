from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    crm = Column(String)
    hashed_password = Column(String)
    phone = Column(String, nullable=True)
    specialty = Column(String, default="Clínico Geral")
    is_active = Column(Boolean, default=True)

    patients = relationship("Patient", back_populates="owner")
    cases = relationship("Case", back_populates="owner")

class Patient(Base):
    __tablename__ = "patients"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    birth_date = Column(String)
    gender = Column(String)
    cpf = Column(String, nullable=True)
    mother_name = Column(String, nullable=True)
    medical_history = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="patients")
    cases = relationship("Case", back_populates="patient", cascade="all, delete-orphan")

class Case(Base):
    __tablename__ = "cases"
    id = Column(Integer, primary_key=True, index=True)

    patient_id = Column(Integer, ForeignKey("patients.id"))
    patient = relationship("Patient", back_populates="cases")

    care_type = Column(String, default="Clínica Geral")
    anamnesis = Column(Text, nullable=True)
    hpma = Column(Text, nullable=True)
    extended_anamnesis_json = Column(JSON, nullable=True)
    symptoms = Column(Text)
    exams_input = Column(Text, nullable=True)
    ai_analysis_json = Column(JSON, nullable=True)
    doctor_conclusion = Column(Text, nullable=True)
    status = Column(String, default="Pendente")

    created_at = Column(DateTime, default=func.now())

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="cases")
