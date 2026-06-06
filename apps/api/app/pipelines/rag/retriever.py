import asyncio
import logging
import time
from dataclasses import dataclass, field

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.pipelines.embeddings.service import embed_query
from app.pipelines.rag.fusion import FusedChunk, reciprocal_rank_fusion
from app.pipelines.rag.keyword_search import keyword_search
from app.pipelines.rag.vector_store import vector_search

logger = logging.getLogger(__name__)


@dataclass
class RetrievalFilter:
    source_type: str | None = None   # document | note | assignment
    subject_id: str | None = None
    topic: str | None = None
    semester: str | None = None
    note_type: str | None = None
    note_types: list[str] | None = None
    source_ids: list[str] | None = None


@dataclass
class Citation:
    source_id: str
    source_type: str
    title: str
    excerpt: str
    page: int | None
    chunk_index: int
    vector_rank: int | None
    keyword_rank: int | None
    rrf_score: float


@dataclass
class RAGContext:
    chunks: list[FusedChunk]
    citations: list[Citation]
    context_text: str
    retrieval_meta: dict = field(default_factory=dict)


async def retrieve(
    query: str,
    user_id: str,
    db: AsyncSession,
    limit: int = 8,
    filters: RetrievalFilter | None = None,
) -> RAGContext:
    """
    Full hybrid retrieval:
    1. Embed query once (BGE query prefix applied inside embed_query)
    2. Parallel vector search (Qdrant) + keyword search (PostgreSQL FTS)
    3. Weighted RRF fusion
    4. Citation + context assembly
    """
    filters = filters or RetrievalFilter()
    settings = get_settings()
    t_start = time.monotonic()

    # Candidates are fetched 3x the final limit so RRF has room to rerank
    candidate_limit = limit * 3

    query_vector = await embed_query(query)

    vector_results, keyword_results = await asyncio.gather(
        vector_search(
            query_vector=query_vector,
            user_id=user_id,
            limit=candidate_limit,
            source_type=filters.source_type,
            subject_id=filters.subject_id,
            topic=filters.topic,
            semester=filters.semester,
            note_type=filters.note_type,
            note_types=filters.note_types,
            source_ids=filters.source_ids,
            score_threshold=settings.ingestion_score_threshold,
        ),
        keyword_search(
            query=query,
            db=db,
            user_id=user_id,
            limit=candidate_limit,
            source_type=filters.source_type,
            subject_id=filters.subject_id,
            topic=filters.topic,
            semester=filters.semester,
            note_type=filters.note_type,
            note_types=filters.note_types,
            source_ids=filters.source_ids,
        ),
    )

    fused = reciprocal_rank_fusion(
        vector_results=vector_results,
        keyword_results=keyword_results,
        k=settings.rrf_k,
        vector_weight=settings.vector_weight,
        keyword_weight=settings.keyword_weight,
        limit=limit,
    )

    citations = _build_citations(fused)
    context_text = _build_context_text(fused)

    elapsed_ms = round((time.monotonic() - t_start) * 1000)
    logger.info(
        "Retrieval: query=%r user=%s vector=%d keyword=%d fused=%d elapsed=%dms",
        query[:60],
        user_id,
        len(vector_results),
        len(keyword_results),
        len(fused),
        elapsed_ms,
    )

    return RAGContext(
        chunks=fused,
        citations=citations,
        context_text=context_text,
        retrieval_meta={
            "query": query,
            "vector_results_count": len(vector_results),
            "keyword_results_count": len(keyword_results),
            "fused_count": len(fused),
            "elapsed_ms": elapsed_ms,
            "filters": {
                "source_type": filters.source_type,
                "subject_id": filters.subject_id,
                "topic": filters.topic,
                "semester": filters.semester,
                "note_type": filters.note_type,
                "note_types": filters.note_types,
            },
        },
    )


def _build_citations(chunks: list[FusedChunk]) -> list[Citation]:
    return [
        Citation(
            source_id=c.metadata.get("source_id", ""),
            source_type=c.metadata.get("source_type", ""),
            title=c.metadata.get("title", "Unknown"),
            excerpt=c.content[:200],
            page=c.metadata.get("page"),
            chunk_index=c.metadata.get("chunk_index", 0),
            vector_rank=c.vector_rank,
            keyword_rank=c.keyword_rank,
            rrf_score=round(c.rrf_score, 6),
        )
        for c in chunks
    ]


def _build_context_text(chunks: list[FusedChunk]) -> str:
    if not chunks:
        return ""
    parts: list[str] = []
    for i, chunk in enumerate(chunks, 1):
        title = chunk.metadata.get("title", "Unknown")
        page = chunk.metadata.get("page")
        page_label = f"p. {page}" if page else "no page"
        topic = chunk.metadata.get("topic")
        topic_label = f" · {topic}" if topic else ""
        parts.append(f"[{i}] {title} ({page_label}{topic_label})\n{chunk.content}")
    return "\n\n---\n\n".join(parts)
