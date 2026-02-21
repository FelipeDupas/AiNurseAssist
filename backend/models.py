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
    
    # Um médico tem vários pacientes e vários casos
    patients = relationship("Patient", back_populates="owner")
    cases = relationship("Case", back_populates="owner")

class Patient(Base):
    __tablename__ = "patients"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    birth_date = Column(String) # A data fixa para cálculo de idade
    gender = Column(String)
    medical_history = Column(Text, nullable=True) # Histórico base (DM, HAS, Alergias)
    created_at = Column(DateTime, default=func.now())
    
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="patients")
    
    # Um paciente pode ter vários casos (consultas/retornos)
    cases = relationship("Case", back_populates="patient", cascade="all, delete-orphan")

class Case(Base):
    __tablename__ = "cases"
    id = Column(Integer, primary_key=True, index=True)
    
    # Vínculo com o paciente
    patient_id = Column(Integer, ForeignKey("patients.id"))
    patient = relationship("Patient", back_populates="cases")
    
    symptoms = Column(Text)
    exams_input = Column(Text, nullable=True)
    ai_analysis_json = Column(JSON, nullable=True)
    status = Column(String, default="Pendente")
    
    # Usando func.now() para ter data e hora exatas da consulta
    created_at = Column(DateTime, default=func.now())
    
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="cases")