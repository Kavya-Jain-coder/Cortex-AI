import asyncio
from supabase import create_async_client
import os
from dotenv import load_dotenv

load_dotenv(".env")
async def main():
    supabase = await create_async_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
    res = supabase.storage.from_("test").download("test")
    print("Type of res:", type(res))

asyncio.run(main())
