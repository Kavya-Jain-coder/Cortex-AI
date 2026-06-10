import asyncio
from dotenv import load_dotenv
load_dotenv('apps/api/.env')

import google.generativeai as genai
from app.core.config import get_settings

genai.configure(api_key=get_settings().gemini_api_key)
for m in genai.list_models():
    if 'embedContent' in m.supported_generation_methods:
        print(m.name)
