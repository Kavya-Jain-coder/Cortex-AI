import asyncio
from dotenv import load_dotenv
load_dotenv('apps/api/.env')
import google.generativeai as genai
from app.core.config import get_settings

genai.configure(api_key=get_settings().gemini_api_key)
for m in genai.list_models():
    if 'embed' in m.name.lower() or 'text' in m.name.lower():
        print(m.name, m.supported_generation_methods)
