import asyncio
from dotenv import load_dotenv
load_dotenv('apps/api/.env')

from app.pipelines.embeddings.service import embed_texts

async def main():
    try:
        res = await embed_texts(["Perimeter of a square", "Gradient Descent"])
        print("Success! Got", len(res), "embeddings")
    except Exception as e:
        print("ERROR:", e)

asyncio.run(main())
