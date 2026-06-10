import asyncio
import os
from dotenv import load_dotenv
load_dotenv('apps/api/.env')

from app.services.document_processor import index_note
from app.db.session import AsyncSessionFactory

async def main():
    async with AsyncSessionFactory() as db:
        res = await index_note(
            note_id="0e6b6d5e-5add-40e3-a637-76d5449815f0",
            user_id="test",
            content="Perimeter of a square",
            title="test",
            subject_id=None,
            tags=[],
            db=db
        )
        print("Indexed chunks:", res)

asyncio.run(main())
