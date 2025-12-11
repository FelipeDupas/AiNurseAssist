from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# CONFIGURAÇÃO DO BANCO DE DADOS
# Formato: postgresql://USUARIO:SENHA@LOCALHOST/NOME_DO_BANCO
# IMPORTANTE: Troque 'postgres' e '123456' pelo seu usuário e senha reais do Postgres
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:Projeto10*@localhost/ainurse_db"

# Cria a conexão
engine = create_engine(SQLALCHEMY_DATABASE_URL)

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