import google.generativeai as genai
import os
from dotenv import load_dotenv

# Carrega a chave do arquivo .env
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("ERRO: Chave não encontrada no .env")
else:
    print(f"Chave encontrada: {api_key[:4]}... (ok)")
    genai.configure(api_key=api_key)

    print("\n🔍 Consultando modelos disponíveis para esta chave...")
    try:
        found = False
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"✅ Disponível: {m.name}")
                found = True
        
        if not found:
            print("❌ Nenhum modelo de texto encontrado. Verifique se sua API Key é válida.")
            
    except Exception as e:
        print(f"❌ Erro ao conectar na API: {e}")