from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user_id
from app.db.session import get_db
from app.pipelines.rag.retriever import RetrievalFilter, retrieve
from app.schemas.schemas import SearchRequest, SearchResultOut

router = APIRouter(prefix="/search", tags=["search"])


def _scope_filter(scope: str) -> tuple[str | None, list[str] | None]:
    if scope == "notes":
        return "note", None
    if scope == "documents":
        return "document", None
    if scope == "assignments":
        return "document", ["assignment", "pyq", "practice"]
    return None, None


@router.post("", response_model=list[SearchResultOut])
async def hybrid_search(
    body: SearchRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    source_type, note_types = _scope_filter(body.scope)
    filters = RetrievalFilter(
        source_type=source_type,
        subject_id=body.subject_id,
        note_types=note_types,
        source_ids=body.source_ids or None,
    )

    rag_context = await retrieve(
        query=body.query,
        user_id=user_id,
        db=db,
        limit=body.limit,
        filters=filters,
    )

    return [
        SearchResultOut(
            id=chunk.id,
            source_type=chunk.metadata.get("source_type", ""),
            source_id=chunk.metadata.get("source_id", ""),
            title=chunk.metadata.get("title", ""),
            excerpt=chunk.content[:300],
            score=round(chunk.rrf_score, 6),
            citations=[
                {
                    "source_id": c.source_id,
                    "source_type": c.source_type,
                    "title": c.title,
                    "excerpt": c.excerpt,
                    "page": c.page,
                    "chunk_index": c.chunk_index,
                }
                for c in rag_context.citations
                if c.source_id == chunk.metadata.get("source_id")
            ],
            metadata=chunk.metadata,
        )
        for chunk in rag_context.chunks
    ]
