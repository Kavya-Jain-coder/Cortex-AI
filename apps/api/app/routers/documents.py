import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from supabase import AsyncClient, create_async_client

from app.core.auth import get_current_user_id
from app.core.config import get_settings
from app.db.session import get_db
from app.models.models import Document
from app.schemas.schemas import DocumentOut, DocumentUpdate
from app.services.document_processor import process_document_async

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_MIME_TYPES = {"application/pdf"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


async def _get_supabase() -> AsyncClient:
    settings = get_settings()
    return await create_async_client(settings.supabase_url, settings.supabase_service_role_key)


@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile,
    subject_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Only PDF files are supported")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File exceeds 50MB limit")

    settings = get_settings()
    storage_key = f"{user_id}/{uuid.uuid4()}/{file.filename}"

    supabase = await _get_supabase()
    await supabase.storage.from_(settings.storage_bucket).upload(
        path=storage_key,
        file=contents,
        file_options={"content-type": file.content_type},
    )

    doc = Document(
        id=str(uuid.uuid4()),
        user_id=user_id,
        file_name=file.filename or "document.pdf",
        storage_key=storage_key,
        mime_type=file.content_type or "application/pdf",
        size_bytes=len(contents),
        status="pending",
        subject_id=subject_id,
        tags=[],
    )
    db.add(doc)
    await db.flush()

    # Fire-and-forget processing (indexing happens async)
    await process_document_async(doc.id, contents, user_id)

    return DocumentOut.model_validate(doc)


@router.get("", response_model=list[DocumentOut])
async def list_documents(
    subject_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    query = select(Document).where(Document.user_id == user_id)
    if subject_id:
        query = query.where(Document.subject_id == subject_id)
    results = await db.scalars(query.order_by(Document.created_at.desc()))
    return [DocumentOut.model_validate(d) for d in results]


@router.get("/{doc_id}", response_model=DocumentOut)
async def get_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    doc = await _get_doc_or_404(doc_id, user_id, db)
    return DocumentOut.model_validate(doc)


@router.patch("/{doc_id}", response_model=DocumentOut)
async def update_document(
    doc_id: str,
    body: DocumentUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    doc = await _get_doc_or_404(doc_id, user_id, db)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(doc, field, value)
    return DocumentOut.model_validate(doc)


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    from app.pipelines.rag.vector_store import delete_by_source
    doc = await _get_doc_or_404(doc_id, user_id, db)
    await delete_by_source(doc.id)
    await db.delete(doc)


async def _get_doc_or_404(doc_id: str, user_id: str, db: AsyncSession) -> Document:
    result = await db.scalar(
        select(Document).where(Document.id == doc_id, Document.user_id == user_id)
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return result
