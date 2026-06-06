import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user_id
from app.db.session import get_db
from app.models.models import Document
from app.services.document_processor import reindex_document

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ingestion", tags=["ingestion"])


class ReindexResponse(BaseModel):
    doc_id: str
    chunk_count: int
    page_count: int
    elapsed_ms: int
    status: str


class DocumentStatusOut(BaseModel):
    id: str
    status: str
    page_count: int | None
    chunk_count: int | None


@router.post("/documents/{doc_id}/reindex", response_model=ReindexResponse)
async def reindex(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """
    Re-ingests a document synchronously and returns the result.
    Use this after updating document metadata (topic, semester, note_type).
    For large documents, consider moving this behind a task queue.
    """
    try:
        result = await reindex_document(doc_id, user_id, db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.exception("Reindex failed for doc_id=%s", doc_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Reindex failed — check server logs",
        )

    return ReindexResponse(
        doc_id=result.doc_id,
        chunk_count=result.chunk_count,
        page_count=result.page_count,
        elapsed_ms=result.elapsed_ms,
        status=result.status,
    )


@router.get("/documents/{doc_id}/status", response_model=DocumentStatusOut)
async def get_ingestion_status(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Poll ingestion status for a document. Used by the frontend upload zone."""
    from sqlalchemy import func, select
    from app.models.models import DocumentChunk

    doc = await db.scalar(
        select(Document).where(Document.id == doc_id, Document.user_id == user_id)
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    chunk_count = await db.scalar(
        select(func.count(DocumentChunk.id)).where(DocumentChunk.source_id == doc_id)
    )

    return DocumentStatusOut(
        id=doc.id,
        status=doc.status,
        page_count=doc.page_count,
        chunk_count=chunk_count or 0,
    )
