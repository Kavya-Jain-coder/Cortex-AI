import asyncio
import logging
from functools import lru_cache

from sentence_transformers import SentenceTransformer
from tenacity import retry, stop_after_attempt, wait_exponential, before_sleep_log

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Using sentence-transformers directly for proper async/executor support.
# BGE requires the query prefix for asymmetric retrieval.
_QUERY_PREFIX = "Represent this sentence for searching relevant passages: "


@lru_cache(maxsize=1)
def _load_model() -> SentenceTransformer:
    settings = get_settings()
    logger.info("Loading embedding model: %s", settings.embedding_model)
    model = SentenceTransformer(settings.embedding_model)
    logger.info("Embedding model loaded. Dimension: %d", settings.embedding_dimension)
    return model


def _encode_sync(texts: list[str], is_query: bool = False) -> list[list[float]]:
    """Runs in a thread executor — sentence-transformers is not async-native."""
    model = _load_model()
    if is_query and texts:
        texts = [_QUERY_PREFIX + texts[0]]
    embeddings = model.encode(
        texts,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return embeddings.tolist()


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
async def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Embed a list of passage texts in batches.
    Runs the blocking model call in a thread executor.
    """
    if not texts:
        return []

    settings = get_settings()
    batch_size = settings.embedding_batch_size
    loop = asyncio.get_running_loop()
    all_vectors: list[list[float]] = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        vectors = await loop.run_in_executor(None, _encode_sync, batch, False)
        all_vectors.extend(vectors)
        logger.debug("Embedded batch %d–%d of %d", i, i + len(batch), len(texts))

    return all_vectors


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
async def embed_query(query: str) -> list[float]:
    """Embed a single search query with the BGE query prefix."""
    loop = asyncio.get_running_loop()
    vectors = await loop.run_in_executor(None, _encode_sync, [query], True)
    return vectors[0]
