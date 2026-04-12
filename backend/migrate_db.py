"""
Migração do banco PostgreSQL para adicionar novos campos:
- patients: cpf, mother_name
- cases: anamnesis, hpma
"""
import psycopg2

# Mesma connection string do database.py
DB_URL = "postgresql://postgres:Projeto10*@localhost/ainurse_db"

# Extrai as partes da URL
import re
match = re.match(r"postgresql://(\w+):([^@]+)@([^/]+)/(.+)", DB_URL)
user, password, host, dbname = match.groups()

try:
    conn = psycopg2.connect(
        dbname=dbname,
        user=user,
        password=password,
        host=host
    )
    conn.autocommit = True
    cursor = conn.cursor()

    migrations = [
        ("ALTER TABLE patients ADD COLUMN IF NOT EXISTS cpf VARCHAR", "patients.cpf"),
        ("ALTER TABLE patients ADD COLUMN IF NOT EXISTS mother_name VARCHAR", "patients.mother_name"),
        ("ALTER TABLE cases ADD COLUMN IF NOT EXISTS anamnesis TEXT", "cases.anamnesis"),
        ("ALTER TABLE cases ADD COLUMN IF NOT EXISTS hpma TEXT", "cases.hpma"),
    ]

    for sql, field_name in migrations:
        try:
            cursor.execute(sql)
            print(f"✅ '{field_name}' OK")
        except Exception as e:
            print(f"❌ Erro em '{field_name}': {e}")

    cursor.close()
    conn.close()
    print("\n✅ Migração PostgreSQL concluída!")

except Exception as e:
    print(f"❌ Erro de conexão: {e}")
