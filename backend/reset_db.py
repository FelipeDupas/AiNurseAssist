from database import engine
import models

print("💣 INICIANDO RESET DO BANCO DE DADOS...")

# 1. Força a exclusão de todas as tabelas
print("🗑️  Apagando tabelas antigas...")
models.Base.metadata.drop_all(bind=engine)

# 2. Cria tudo de novo do zero (com as colunas novas)
print("✨ Criando tabelas novas (com phone e specialty)...")
models.Base.metadata.create_all(bind=engine)

print("✅ SUCESSO! O banco de dados está novo e vazio.")