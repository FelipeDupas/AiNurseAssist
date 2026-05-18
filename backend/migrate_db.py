import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "ainurse_dev.db")

def run_migrations():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        cursor.execute("ALTER TABLE cases ADD COLUMN doctor_conclusion TEXT")
        print("Coluna 'doctor_conclusion' adicionada com sucesso.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Coluna 'doctor_conclusion' já existe. Nenhuma alteração necessária.")
        else:
            raise e

    conn.commit()
    conn.close()
    print("Migração concluída.")

if __name__ == "__main__":
    run_migrations()
