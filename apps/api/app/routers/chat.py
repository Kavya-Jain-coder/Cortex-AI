import uuid
from dataclasses import asdict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user_id
from app.db.session import get_db
from app.models.models import ChatMessage, ChatSession
from app.pipelines.llm.tutor import generate_tutor_response
from app.pipelines.rag.retriever import RetrievalFilter, retrieve
from app.schemas.schemas import (
    ChatMessageOut,
    ChatRequest,
    ChatResponse,
    ChatSessionCreate,
    ChatSessionOut,
)

router = APIRouter(prefix="/chat", tags=["chat"])


def _scope_filter(scope: str) -> tuple[str | None, list[str] | None]:
    if scope == "notes":
        return "note", None
    if scope == "documents":
        return "document", None
    if scope == "assignments":
        return "document", ["assignment", "pyq", "practice"]
    return None, None


@router.get("/sessions", response_model=list[ChatSessionOut])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    results = await db.scalars(
        select(ChatSession)
        .where(ChatSession.user_id == user_id)
        .order_by(ChatSession.updated_at.desc())
        .limit(50)
    )
    return [ChatSessionOut.model_validate(s) for s in results]


@router.post("/sessions", response_model=ChatSessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(
    body: ChatSessionCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    session = ChatSession(
        id=str(uuid.uuid4()),
        user_id=user_id,
        subject_id=body.subject_id,
    )
    db.add(session)
    await db.flush()
    return ChatSessionOut.model_validate(session)


@router.get("/sessions/{session_id}/messages", response_model=list[ChatMessageOut])
async def get_messages(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    chat_session = await _get_session_or_404(session_id, user_id, db)
    results = await db.scalars(
        select(ChatMessage)
        .where(ChatMessage.session_id == chat_session.id)
        .order_by(ChatMessage.created_at.asc())
    )
    return [ChatMessageOut.model_validate(m) for m in results]


@router.post("/sessions/{session_id}/messages", response_model=ChatResponse)
async def send_message(
    session_id: str,
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    chat_session = await _get_session_or_404(session_id, user_id, db)

    user_msg = ChatMessage(
        id=str(uuid.uuid4()),
        session_id=chat_session.id,
        role="user",
        content=body.message,
        citations=[],
    )
    db.add(user_msg)

    history_rows = await db.scalars(
        select(ChatMessage)
        .where(ChatMessage.session_id == chat_session.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(12)
    )
    history = [{"role": m.role, "content": m.content} for m in reversed(list(history_rows))]

    source_type, note_types = _scope_filter(body.scope)
    filters = RetrievalFilter(
        source_type=source_type,
        subject_id=body.subject_id or chat_session.subject_id,
        note_types=note_types,
        source_ids=body.source_ids or None,
    )

    rag_context = await retrieve(
        query=body.message,
        user_id=user_id,
        db=db,
        filters=filters,
    )

    if not chat_session.title or chat_session.title == "New Chat":
        chat_session.title = body.message[:60]

    response_text = await generate_tutor_response(
        user_message=body.message,
        rag_context=rag_context,
        conversation_history=history,
    )

    # Serialize Citation dataclasses to dicts for JSONB storage
    citations_json = [asdict(c) for c in rag_context.citations]

    assistant_msg = ChatMessage(
        id=str(uuid.uuid4()),
        session_id=chat_session.id,
        role="assistant",
        content=response_text,
        citations=citations_json,
    )
    db.add(assistant_msg)
    await db.flush()

    return ChatResponse(
        message=ChatMessageOut.model_validate(assistant_msg),
        citations=citations_json,
    )


async def _get_session_or_404(session_id: str, user_id: str, db: AsyncSession) -> ChatSession:
    result = await db.scalar(
        select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user_id)
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return result
