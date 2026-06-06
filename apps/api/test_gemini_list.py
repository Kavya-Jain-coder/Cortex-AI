import asyncio
import google.generativeai as genai
from dotenv import load_dotenv
import os

load_dotenv()

def main():
    api_key = os.getenv("GEMINI_API_KEY")
    genai.configure(api_key=api_key)
    try:
        models = genai.list_models()
        print("Supported models:")
        for model in models:
            print(f"- {model.name}")
    except Exception as e:
        print("Failed to list models:", str(e))

if __name__ == "__main__":
    main()
