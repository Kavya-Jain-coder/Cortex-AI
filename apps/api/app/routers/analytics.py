from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user_id
from app.db.session import get_db
from app.models.models import ChatMessage, ChatSession, Document, Note, StudySession, Subject

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary")
async def get_summary(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    total_notes = await db.scalar(
        select(func.count(Note.id)).where(Note.user_id == user_id)
    ) or 0

    total_docs = await db.scalar(
        select(func.count(Document.id)).where(Document.user_id == user_id)
    ) or 0

    total_minutes = await db.scalar(
        select(func.sum(StudySession.duration_minutes)).where(StudySession.user_id == user_id)
    ) or 0

    total_messages = await db.scalar(
        select(func.count(ChatMessage.id))
        .join(ChatSession, ChatMessage.session_id == ChatSession.id)
        .where(ChatMessage.role == "user", ChatSession.user_id == user_id)
    ) or 0

    # Weekly activity: last 7 days
    since = datetime.utcnow() - timedelta(days=7)
    sessions = await db.scalars(
        select(StudySession)
        .where(StudySession.user_id == user_id, StudySession.created_at >= since)
    )
    sessions_list = list(sessions)

    daily: dict[str, int] = {}
    for session in sessions_list:
        day = session.created_at.strftime("%Y-%m-%d")
        daily[day] = daily.get(day, 0) + session.duration_minutes

    weekly_activity = [
        {"date": day, "minutes": mins}
        for day, mins in sorted(daily.items())
    ]

    # Subject breakdown
    subjects = await db.scalars(select(Subject).where(Subject.user_id == user_id))
    subject_list = list(subjects)

    subject_breakdown = []
    for subject in subject_list:
        note_count = await db.scalar(
            select(func.count(Note.id)).where(
                Note.user_id == user_id, Note.subject_id == subject.id
            )
        ) or 0
        study_mins = await db.scalar(
            select(func.sum(StudySession.duration_minutes)).where(
                StudySession.user_id == user_id, StudySession.subject_id == subject.id
            )
        ) or 0
        subject_breakdown.append({
            "subject_id": subject.id,
            "subject_name": subject.name,
            "study_minutes": study_mins,
            "note_count": note_count,
        })

    return {
        "total_study_minutes": total_minutes,
        "total_notes": total_notes,
        "total_documents": total_docs,
        "total_chat_messages": total_messages,
        "subject_breakdown": subject_breakdown,
        "weekly_activity": weekly_activity,
    }
