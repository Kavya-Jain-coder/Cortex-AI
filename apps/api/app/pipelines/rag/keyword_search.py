import logging
from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


@dataclass
class KeywordResult:
    chunk_id: str
    content: str
    rank: float
    metadata: dict


async def keyword_search(
    query: str,
    db: AsyncSession,
    user_id: str,
    limit: int = 20,
    source_type: str | None = None,
    subject_id: str | None = None,
    topic: str | None = None,
    semester: str | None = None,
    note_type: str | None = None,
    note_types: list[str] | None = None,
    source_ids: list[str] | None = None,
) -> list[KeywordResult]:
    """
    PostgreSQL ts_rank_cd full-text search over document_chunks.
    Filters are applied as WHERE clauses before ranking.
    """
    filters = ["dc.user_id = :user_id", "dc.search_vector @@ plainto_tsquery('english', :query)"]
    params: dict = {"user_id": user_id, "query": query, "limit": limit}

    if source_type:
        filters.append("dc.source_type = :source_type")
        params["source_type"] = source_type
    if subject_id:
        filters.append("dc.subject_id = :subject_id")
        params["subject_id"] = subject_id
    if topic:
        filters.append("dc.topic = :topic")
        params["topic"] = topic
    if semester:
        filters.append("dc.semester = :semester")
        params["semester"] = semester
    if note_type:
        filters.append("dc.note_type = :note_type")
        params["note_type"] = note_type
    if note_types:
        filters.append("dc.note_type = ANY(:note_types)")
        params["note_types"] = note_types
    if source_ids:
        filters.append("dc.source_id = ANY(:source_ids)")
        params["source_ids"] = source_ids

    where_clause = " AND ".join(filters)

    sql = text(f"""
        SELECT
            dc.id,
            dc.content,
            dc.source_id,
            dc.source_type,
            dc.subject_id,
            dc.topic,
            dc.semester,
            dc.note_type,
            dc.page,
            dc.chunk_index,
            dc.token_count,
            dc.tags,
            ts_rank_cd(dc.search_vector, plainto_tsquery('english', :query)) AS rank
        FROM document_chunks dc
        WHERE {where_clause}
        ORDER BY rank DESC
        LIMIT :limit
    """)

    try:
        result = await db.execute(sql, params)
        rows = result.mappings().all()
    except Exception:
        logger.exception("Keyword search query failed")
        return []

    return [
        KeywordResult(
            chunk_id=str(row["id"]),
            content=row["content"],
            rank=float(row["rank"]),
            metadata={
                "source_id": row["source_id"],
                "source_type": row["source_type"],
                "subject_id": row["subject_id"],
                "topic": row["topic"],
                "semester": row["semester"],
                "note_type": row["note_type"],
                "page": row["page"],
                "chunk_index": row["chunk_index"],
                "token_count": row["token_count"],
                "tags": row["tags"] or [],
            },
        )
        for row in rows
    ]
