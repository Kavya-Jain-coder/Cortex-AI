import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user_id
from app.db.session import get_db
from app.models.models import Note
from app.pipelines.rag.vector_store import delete_by_source
from app.schemas.schemas import NoteCreate, NoteOut, NoteUpdate, PaginatedOut
from app.services.document_processor import index_note

router = APIRouter(prefix="/notes", tags=["notes"])


@router.get("", response_model=PaginatedOut)
async def list_notes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    subject_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    base_query = select(Note).where(Note.user_id == user_id)
    if subject_id:
        base_query = base_query.where(Note.subject_id == subject_id)

    total = await db.scalar(select(func.count()).select_from(base_query.subquery()))
    notes = await db.scalars(
        base_query.order_by(Note.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    note_list = list(notes)

    return PaginatedOut(
        data=[NoteOut.model_validate(n) for n in note_list],
        total=total or 0,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < (total or 0),
    )


@router.post("", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
async def create_note(
    body: NoteCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    note = Note(
        id=str(uuid.uuid4()),
        user_id=user_id,
        title=body.title,
        type=body.type,
        subject_id=body.subject_id,
        tags=body.tags,
    )
    db.add(note)
    await db.flush()
    return NoteOut.model_validate(note)


@router.get("/{note_id}", response_model=NoteOut)
async def get_note(
    note_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    note = await _get_note_or_404(note_id, user_id, db)
    return NoteOut.model_validate(note)


@router.patch("/{note_id}", response_model=NoteOut)
async def update_note(
    note_id: str,
    body: NoteUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    note = await _get_note_or_404(note_id, user_id, db)

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(note, field, value)

    # Re-index into Qdrant + PostgreSQL FTS if content changed
    if body.content and note.content and note.content.strip():
        await index_note(
            note_id=note.id,
            user_id=user_id,
            content=note.content,
            title=note.title,
            subject_id=note.subject_id,
            tags=note.tags or [],
            db=db,
        )

    return NoteOut.model_validate(note)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    note = await _get_note_or_404(note_id, user_id, db)
    await delete_by_source(note.id)
    await db.delete(note)


async def _get_note_or_404(note_id: str, user_id: str, db: AsyncSession) -> Note:
    result = await db.scalar(
        select(Note).where(Note.id == note_id, Note.user_id == user_id)
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return result
