import asyncio
from dotenv import load_dotenv
load_dotenv('apps/api/.env')
import google.generativeai as genai
from app.core.config import get_settings

genai.configure(api_key=get_settings().gemini_api_key)

async def main():
    res = await genai.embed_content_async(
        model='models/gemini-embedding-2',
        content=['hello'],
        task_type='RETRIEVAL_DOCUMENT',
        output_dimensionality=768
    )
    print(len(res['embedding'][0]))

asyncio.run(main())
