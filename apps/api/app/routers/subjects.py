import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user_id
from app.db.session import get_db
from app.models.models import Subject
from app.schemas.schemas import SubjectCreate, SubjectOut

router = APIRouter(prefix="/subjects", tags=["subjects"])


@router.get("", response_model=list[SubjectOut])
async def list_subjects(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    results = await db.scalars(
        select(Subject).where(Subject.user_id == user_id).order_by(Subject.name)
    )
    return [SubjectOut.model_validate(s) for s in results]


@router.post("", response_model=SubjectOut, status_code=status.HTTP_201_CREATED)
async def create_subject(
    body: SubjectCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    subject = Subject(id=str(uuid.uuid4()), user_id=user_id, name=body.name, color=body.color)
    db.add(subject)
    await db.flush()
    return SubjectOut.model_validate(subject)


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(
    subject_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    subject = await db.scalar(
        select(Subject).where(Subject.id == subject_id, Subject.user_id == user_id)
    )
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    await db.delete(subject)
