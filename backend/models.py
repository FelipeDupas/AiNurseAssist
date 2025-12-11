from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    crm = Column(String)
    hashed_password = Column(String)
    phone = Column(String, nullable=True) # Novo campo settings
    specialty = Column(String, default="Clínico Geral") # Novo campo settings
    is_active = Column(Boolean, default=True)
    
    # Relacionamento: Um médico tem vários casos
    cases = relationship("Case", back_populates="owner")

class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    patient_name = Column(String)
    age = Column(Integer)
    gender = Column(String)
    medical_history = Column(Text, nullable=True)
    symptoms = Column(Text)
    exams_input = Column(Text, nullable=True)
    
    # Resultados da IA (vamos salvar como JSON para flexibilidade)
    ai_analysis_json = Column(JSON, nullable=True)
    
    status = Column(String, default="Pendente") # Pendente, Analisado
    created_at = Column(String, default=datetime.datetime.now().strftime("%Y-%m-%d"))
    
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="cases")