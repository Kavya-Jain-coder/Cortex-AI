from functools import lru_cache

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq

from app.core.config import get_settings


@lru_cache(maxsize=1)
def get_gemini() -> ChatGoogleGenerativeAI:
    settings = get_settings()
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=settings.gemini_api_key,
        temperature=0.3,
        max_retries=3,
    )


@lru_cache(maxsize=1)
def get_groq_llama() -> ChatGroq:
    settings = get_settings()
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=settings.groq_api_key,
        temperature=0.5,
        max_retries=3,
    )
