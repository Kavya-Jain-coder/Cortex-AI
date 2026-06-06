import asyncio
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
import os

load_dotenv()

async def main():
    api_key = os.getenv("GEMINI_API_KEY")
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=api_key,
        )
        res = await llm.ainvoke("Say 'Success!'")
        print("Response:", res.content)
    except Exception as e:
        print("Failed:", str(e))

if __name__ == "__main__":
    asyncio.run(main())
