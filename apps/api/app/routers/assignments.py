import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user_id
from app.db.session import get_db
from app.models.models import Assignment, Document
from app.schemas.schemas import AssignmentCreate, AssignmentOut

router = APIRouter(prefix="/assignments", tags=["assignments"])


@router.get("", response_model=list[AssignmentOut])
async def list_assignments(
    subject_id: str | None = None,
    type: str | None = None,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    query = select(Assignment).where(Assignment.user_id == user_id)
    if subject_id:
        query = query.where(Assignment.subject_id == subject_id)
    if type:
        query = query.where(Assignment.type == type)
    results = await db.scalars(query.order_by(Assignment.created_at.desc()))
    return [AssignmentOut.model_validate(a) for a in results]


@router.post("", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    body: AssignmentCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    # Verify the document belongs to this user
    doc = await db.scalar(
        select(Document).where(Document.id == body.document_id, Document.user_id == user_id)
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    assignment = Assignment(
        id=str(uuid.uuid4()),
        user_id=user_id,
        **body.model_dump(),
    )
    doc.note_type = body.type
    doc.subject_id = body.subject_id or doc.subject_id
    doc.tags = sorted(set((doc.tags or []) + body.tags + [body.type]))
    db.add(assignment)
    await db.flush()
    return AssignmentOut.model_validate(assignment)


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment(
    assignment_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    assignment = await db.scalar(
        select(Assignment).where(Assignment.id == assignment_id, Assignment.user_id == user_id)
    )
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    await db.delete(assignment)
