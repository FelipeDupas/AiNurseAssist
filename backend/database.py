from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# CONFIGURAÇÃO DO BANCO DE DADOS
# Para uso local/testes use SQLite (não requer instalação):
SQLALCHEMY_DATABASE_URL = "sqlite:///./ainurse_dev.db"
# Para produção com PostgreSQL, comente a linha acima e use:
# SQLALCHEMY_DATABASE_URL = "postgresql://postgres:Projeto10*@localhost/ainurse_db"

# Cria a conexão
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

# Cria a sessão (é o que vamos usar para mandar comandos pro banco)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para nossos modelos (tabelas) herdarem
Base = declarative_base()

# Função utilitária para pegar a conexão em cada requisição
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()