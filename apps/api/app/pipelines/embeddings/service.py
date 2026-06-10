import asyncio
import logging
from functools import lru_cache

import google.generativeai as genai
from tenacity import retry, stop_after_attempt, wait_exponential, before_sleep_log

from app.core.config import get_settings

logger = logging.getLogger(__name__)

def _init_genai():
    settings = get_settings()
    genai.configure(api_key=settings.gemini_api_key)

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
async def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Embed a list of passage texts in batches using Gemini Embeddings API.
    Replaces local SentenceTransformers to avoid OOM on Render.
    """
    if not texts:
        return []

    _init_genai()

    settings = get_settings()
    batch_size = 100
    all_vectors: list[list[float]] = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        res = await genai.embed_content_async(
            model='models/gemini-embedding-2',
            content=batch,
            task_type='RETRIEVAL_DOCUMENT',
            output_dimensionality=768
        )
        
        embeddings = res['embedding']
        # The Gemini API might return a flat list if the batch has 1 item
        if len(batch) == 1 and isinstance(embeddings[0], float):
            all_vectors.append(embeddings)
        else:
            all_vectors.extend(embeddings)

        logger.debug("Embedded batch %d–%d of %d", i, i + len(batch), len(texts))

    return all_vectors


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
async def embed_query(query: str) -> list[float]:
    """Embed a single search query using Gemini."""
    _init_genai()
    res = await genai.embed_content_async(
        model='models/gemini-embedding-2',
        content=query,
        task_type='RETRIEVAL_QUERY',
        output_dimensionality=768
    )
    return res['embedding']
