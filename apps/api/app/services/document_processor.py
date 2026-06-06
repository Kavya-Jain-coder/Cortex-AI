import asyncio
import io
import logging
import time
import uuid
from dataclasses import dataclass

import pdfplumber
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionFactory
from app.models.models import Document, DocumentChunk
from app.pipelines.chunking.chunker import TextChunk, chunk_text
from app.pipelines.embeddings.service import embed_texts
from app.pipelines.rag.vector_store import delete_by_source, upsert_chunks

logger = logging.getLogger(__name__)


@dataclass
class IngestionResult:
    doc_id: str
    chunk_count: int
    page_count: int
    elapsed_ms: int
    status: str  # ready | failed


async def process_document_async(
    doc_id: str,
    pdf_bytes: bytes,
    user_id: str,
) -> None:
    """Fire-and-forget ingestion. Replace with a task queue (ARQ/Celery) at scale."""
    asyncio.create_task(
        _run_ingestion(doc_id, pdf_bytes, user_id),
        name=f"ingest:{doc_id}",
    )


async def reindex_document(doc_id: str, user_id: str, db: AsyncSession) -> IngestionResult:
    """
    Re-ingests a document that's already in storage.
    Fetches the stored PDF bytes from Supabase and re-runs the full pipeline.
    Called from the re-index router endpoint.
    """
    from sqlalchemy import select
    from app.core.config import get_settings
    from supabase import create_async_client

    doc = await db.scalar(select(Document).where(Document.id == doc_id, Document.user_id == user_id))
    if not doc:
        raise ValueError(f"Document {doc_id} not found for user {user_id}")

    settings = get_settings()
    supabase = await create_async_client(settings.supabase_url, settings.supabase_service_role_key)
    response = await supabase.storage.from_(settings.storage_bucket).download(doc.storage_key)
    pdf_bytes: bytes = response

    return await _run_ingestion(doc_id, pdf_bytes, user_id)


async def _run_ingestion(doc_id: str, pdf_bytes: bytes, user_id: str) -> IngestionResult:
    t_start = time.monotonic()

    async with AsyncSessionFactory() as session:
        from sqlalchemy import select
        doc = await session.scalar(select(Document).where(Document.id == doc_id))
        if not doc:
            logger.error("Ingestion aborted: document %s not found", doc_id)
            return IngestionResult(doc_id=doc_id, chunk_count=0, page_count=0, elapsed_ms=0, status="failed")

        try:
            doc.status = "processing"
            await session.commit()
            logger.info("Ingestion started: doc_id=%s file=%s", doc_id, doc.file_name)

            pages = _extract_pages(pdf_bytes)
            doc.page_count = len(pages)
            logger.info("Extracted %d pages from %s", len(pages), doc.file_name)

            all_chunks = _build_chunks(pages, doc, user_id)
            logger.info("Built %d chunks from %s", len(all_chunks), doc.file_name)

            if not all_chunks:
                doc.status = "ready"
                await session.commit()
                return IngestionResult(
                    doc_id=doc_id, chunk_count=0, page_count=len(pages),
                    elapsed_ms=_elapsed(t_start), status="ready",
                )

            # Delete existing vectors and chunk records before re-indexing
            await delete_by_source(doc_id)
            await _delete_pg_chunks(session, doc_id)

            # Embed all chunks in batches
            texts = [c.content for c in all_chunks]
            vectors = await embed_texts(texts)

            # Qdrant upsert
            chunk_ids = [str(uuid.uuid4()) for _ in all_chunks]
            payloads = [c.metadata.to_qdrant_payload(c.content) for c in all_chunks]
            await upsert_chunks(chunk_ids, vectors, payloads)

            # PostgreSQL chunk mirror
            await _persist_pg_chunks(session, all_chunks, chunk_ids, doc_id, user_id, doc)
            await _update_search_vectors(session, doc_id)

            doc.status = "ready"
            await session.commit()

            elapsed = _elapsed(t_start)
            logger.info(
                "Ingestion complete: doc_id=%s chunks=%d pages=%d elapsed=%dms",
                doc_id, len(all_chunks), len(pages), elapsed,
            )
            return IngestionResult(
                doc_id=doc_id, chunk_count=len(all_chunks),
                page_count=len(pages), elapsed_ms=elapsed, status="ready",
            )

        except Exception:
            doc.status = "failed"
            await session.commit()
            logger.exception("Ingestion failed: doc_id=%s", doc_id)
            return IngestionResult(
                doc_id=doc_id, chunk_count=0, page_count=0,
                elapsed_ms=_elapsed(t_start), status="failed",
            )


def _extract_pages(pdf_bytes: bytes) -> list[tuple[int, str]]:
    pages: list[tuple[int, str]] = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for i, page in enumerate(pdf.pages, 1):
            text = page.extract_text() or ""
            pages.append((i, text))
    return pages


def _build_chunks(
    pages: list[tuple[int, str]],
    doc: Document,
    user_id: str,
) -> list[TextChunk]:
    all_chunks: list[TextChunk] = []
    for page_num, page_text in pages:
        if not page_text.strip():
            continue
        chunks = chunk_text(
            text=page_text,
            source_id=doc.id,
            source_type="document",
            user_id=user_id,
            title=doc.file_name,
            subject_id=doc.subject_id,
            topic=doc.topic,
            semester=doc.semester,
            note_type=doc.note_type,
            page=page_num,
            tags=doc.tags or [],
        )
        all_chunks.extend(chunks)
    return all_chunks


async def _delete_pg_chunks(session: AsyncSession, doc_id: str) -> None:
    await session.execute(
        text("DELETE FROM document_chunks WHERE document_id = :doc_id"),
        {"doc_id": doc_id},
    )


async def _persist_pg_chunks(
    session: AsyncSession,
    chunks: list[TextChunk],
    chunk_ids: list[str],
    doc_id: str,
    user_id: str,
    doc: Document,
) -> None:
    db_chunks = [
        DocumentChunk(
            id=cid,
            document_id=doc_id,
            user_id=user_id,
            source_type="document",
            source_id=doc.id,
            chunk_index=chunk.chunk_index,
            content=chunk.content,
            page=chunk.page,
            token_count=chunk.token_count,
            subject_id=doc.subject_id,
            topic=doc.topic,
            semester=doc.semester,
            note_type=doc.note_type,
            tags=doc.tags or [],
        )
        for cid, chunk in zip(chunk_ids, chunks)
    ]
    session.add_all(db_chunks)
    await session.flush()


async def _update_search_vectors(session: AsyncSession, doc_id: str) -> None:
    """Populate tsvector column for full-text search using PostgreSQL's built-in to_tsvector."""
    await session.execute(
        text("""
            UPDATE document_chunks
            SET search_vector = to_tsvector('english', content)
            WHERE document_id = :doc_id
        """),
        {"doc_id": doc_id},
    )


def _elapsed(t_start: float) -> int:
    return round((time.monotonic() - t_start) * 1000)


# ─── Note ingestion ───────────────────────────────────────────────────────────

async def index_note(
    note_id: str,
    user_id: str,
    content: str,
    title: str,
    subject_id: str | None,
    tags: list[str],
    db: AsyncSession,
) -> int:
    """
    Index or re-index a typed note into Qdrant + PostgreSQL.
    Returns number of chunks indexed.
    """
    from app.models.models import Note

    if not content.strip():
        return 0

    chunks = chunk_text(
        text=content,
        source_id=note_id,
        source_type="note",
        user_id=user_id,
        title=title,
        subject_id=subject_id,
        note_type="typed",
        tags=tags,
    )
    if not chunks:
        return 0

    await delete_by_source(note_id)

    texts = [c.content for c in chunks]
    vectors = await embed_texts(texts)
    chunk_ids = [str(uuid.uuid4()) for _ in chunks]
    payloads = [c.metadata.to_qdrant_payload(c.content) for c in chunks]
    await upsert_chunks(chunk_ids, vectors, payloads)

    # Persist to document_chunks for keyword search
    # Notes don't have a document row — we use a synthetic document_id = note_id
    # and handle the FK constraint by inserting directly with a nullable FK via raw SQL
    await db.execute(
        text("DELETE FROM document_chunks WHERE source_id = :note_id"),
        {"note_id": note_id},
    )

    note_chunks = [
        {
            "id": cid,
            "document_id": None,   # notes have no document row
            "user_id": user_id,
            "source_type": "note",
            "source_id": note_id,
            "chunk_index": c.chunk_index,
            "content": c.content,
            "page": None,
            "token_count": c.token_count,
            "subject_id": subject_id,
            "topic": None,
            "semester": None,
            "note_type": "typed",
            "tags": tags,
        }
        for cid, c in zip(chunk_ids, chunks)
    ]

    await db.execute(
        text("""
            INSERT INTO document_chunks
                (id, document_id, user_id, source_type, source_id, chunk_index,
                 content, page, token_count, subject_id, topic, semester, note_type,
                 tags, search_vector, created_at)
            VALUES
                (:id, :document_id, :user_id, :source_type, :source_id, :chunk_index,
                 :content, :page, :token_count, :subject_id, :topic, :semester, :note_type,
                 :tags, to_tsvector('english', :content), NOW())
        """),
        note_chunks,
    )
    await db.flush()

    logger.info("Indexed note %s: %d chunks", note_id, len(chunks))
    return len(chunks)
