import asyncio
from dotenv import load_dotenv
load_dotenv('apps/api/.env')

import google.generativeai as genai
from app.core.config import get_settings

genai.configure(api_key=get_settings().gemini_api_key)

async def main():
    for model in ['models/embedding-001', 'models/text-embedding-004']:
        try:
            res = await genai.embed_content_async(
                model=model,
                content=['hello'],
                task_type='RETRIEVAL_DOCUMENT'
            )
            print(model, "dimension:", len(res['embedding'][0]))
        except Exception as e:
            print(model, type(e).__name__, e)

asyncio.run(main())
