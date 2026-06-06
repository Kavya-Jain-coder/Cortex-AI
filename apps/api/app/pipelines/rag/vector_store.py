import logging
from dataclasses import dataclass
from functools import lru_cache

from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models as qmodels
from qdrant_client.http.exceptions import UnexpectedResponse
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential, before_sleep_log

from app.core.config import get_settings

logger = logging.getLogger(__name__)

COLLECTION_NAME = "studyos_chunks"

# Keyword-indexed payload fields — must match ChunkMetadata.to_qdrant_payload keys
_KEYWORD_INDEXES = (
    "user_id",
    "source_id",
    "source_type",
    "subject_id",
    "topic",
    "semester",
    "note_type",
)


@dataclass
class RetrievedChunk:
    id: str
    content: str
    score: float
    metadata: dict


@lru_cache(maxsize=1)
def get_qdrant_client() -> AsyncQdrantClient:
    settings = get_settings()
    return AsyncQdrantClient(
        url=settings.qdrant_url,
        api_key=settings.qdrant_api_key or None,
        timeout=30,
    )


async def ensure_collection() -> None:
    client = get_qdrant_client()
    settings = get_settings()
    collections = await client.get_collections()
    existing = {c.name for c in collections.collections}

    if COLLECTION_NAME not in existing:
        logger.info("Creating Qdrant collection: %s", COLLECTION_NAME)
        await client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=qmodels.VectorParams(
                size=settings.embedding_dimension,
                distance=qmodels.Distance.COSINE,
                on_disk=False,
            ),
            optimizers_config=qmodels.OptimizersConfigDiff(
                indexing_threshold=10_000,
            ),
        )
        for field in _KEYWORD_INDEXES:
            await client.create_payload_index(
                collection_name=COLLECTION_NAME,
                field_name=field,
                field_schema=qmodels.PayloadSchemaType.KEYWORD,
            )
        logger.info("Qdrant collection and indexes created.")


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type((UnexpectedResponse, ConnectionError, TimeoutError)),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
async def upsert_chunks(
    chunk_ids: list[str],
    vectors: list[list[float]],
    payloads: list[dict],
    batch_size: int = 128,
) -> None:
    """Upserts in batches to avoid Qdrant request size limits."""
    client = get_qdrant_client()

    for i in range(0, len(chunk_ids), batch_size):
        batch_ids = chunk_ids[i : i + batch_size]
        batch_vectors = vectors[i : i + batch_size]
        batch_payloads = payloads[i : i + batch_size]

        points = [
            qmodels.PointStruct(id=cid, vector=vec, payload=payload)
            for cid, vec, payload in zip(batch_ids, batch_vectors, batch_payloads)
        ]
        await client.upsert(collection_name=COLLECTION_NAME, points=points, wait=True)
        logger.debug("Upserted Qdrant batch %d–%d", i, i + len(batch_ids))


async def delete_by_source(source_id: str) -> None:
    client = get_qdrant_client()
    await client.delete(
        collection_name=COLLECTION_NAME,
        points_selector=qmodels.FilterSelector(
            filter=qmodels.Filter(
                must=[
                    qmodels.FieldCondition(
                        key="source_id", match=qmodels.MatchValue(value=source_id)
                    )
                ]
            )
        ),
        wait=True,
    )
    logger.info("Deleted Qdrant points for source_id=%s", source_id)


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type((UnexpectedResponse, ConnectionError, TimeoutError)),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
async def vector_search(
    query_vector: list[float],
    user_id: str,
    limit: int,
    source_type: str | None = None,
    subject_id: str | None = None,
    topic: str | None = None,
    semester: str | None = None,
    note_type: str | None = None,
    note_types: list[str] | None = None,
    source_ids: list[str] | None = None,
    score_threshold: float = 0.40,
) -> list[RetrievedChunk]:
    client = get_qdrant_client()

    must: list[qmodels.Condition] = [
        qmodels.FieldCondition(key="user_id", match=qmodels.MatchValue(value=user_id))
    ]

    _add_filter(must, "source_type", source_type)
    _add_filter(must, "subject_id", subject_id)
    _add_filter(must, "topic", topic)
    _add_filter(must, "semester", semester)
    _add_filter(must, "note_type", note_type)

    if note_types:
        must.append(
            qmodels.FieldCondition(key="note_type", match=qmodels.MatchAny(any=note_types))
        )

    if source_ids:
        must.append(
            qmodels.FieldCondition(key="source_id", match=qmodels.MatchAny(any=source_ids))
        )

    results = await client.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_vector,
        query_filter=qmodels.Filter(must=must),
        limit=limit,
        score_threshold=score_threshold,
        with_payload=True,
    )

    return [
        RetrievedChunk(
            id=str(r.id),
            content=r.payload.get("content", "") if r.payload else "",
            score=r.score,
            metadata=r.payload or {},
        )
        for r in results
    ]


def _add_filter(must: list, key: str, value: str | None) -> None:
    if value:
        must.append(qmodels.FieldCondition(key=key, match=qmodels.MatchValue(value=value)))
