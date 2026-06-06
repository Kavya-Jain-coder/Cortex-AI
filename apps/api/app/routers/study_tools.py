from dataclasses import asdict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user_id
from app.db.session import get_db
from app.pipelines.llm.question_predictor import predict_questions
from app.pipelines.llm.study_tools import detect_weak_topics, generate_quiz
from app.pipelines.rag.retriever import RetrievalFilter, retrieve
from app.schemas.schemas import StudyToolRequest, StudyToolResponse

router = APIRouter(prefix="/study-tools", tags=["study-tools"])


def _scope_filter(scope: str) -> tuple[str | None, list[str] | None]:
    if scope == "notes":
        return "note", None
    if scope == "documents":
        return "document", None
    if scope == "assignments":
        return "document", ["assignment", "pyq", "practice"]
    return None, None


def _filters(body: StudyToolRequest) -> RetrievalFilter:
    source_type, note_types = _scope_filter(body.scope)
    return RetrievalFilter(
        source_type=source_type,
        subject_id=body.subject_id,
        note_types=note_types,
        source_ids=body.source_ids or None,
    )


async def _context(body: StudyToolRequest, user_id: str, db: AsyncSession):
    return await retrieve(
        query=body.query,
        user_id=user_id,
        db=db,
        limit=min(max(body.count, 6), 12),
        filters=_filters(body),
    )


@router.post("/quiz", response_model=StudyToolResponse)
async def create_quiz(
    body: StudyToolRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    rag_context = await _context(body, user_id, db)
    if not rag_context.context_text:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No context found for this scope")
    items = await generate_quiz(rag_context, body.count, body.difficulty or "medium")
    return StudyToolResponse(
        items=items,
        citations=[asdict(c) for c in rag_context.citations],
        retrieval_meta=rag_context.retrieval_meta,
    )


@router.post("/weak-topics", response_model=StudyToolResponse)
async def weak_topics(
    body: StudyToolRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    rag_context = await _context(body, user_id, db)
    if not rag_context.context_text:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No context found for this scope")
    items = await detect_weak_topics(rag_context, body.count)
    return StudyToolResponse(
        items=items,
        citations=[asdict(c) for c in rag_context.citations],
        retrieval_meta=rag_context.retrieval_meta,
    )


@router.post("/predictions", response_model=StudyToolResponse)
async def predicted_questions(
    body: StudyToolRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    rag_context = await _context(body, user_id, db)
    if not rag_context.context_text:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No context found for this scope")

    pyq_context = await retrieve(
        query=f"previous year questions pyq exam {body.query}",
        user_id=user_id,
        db=db,
        limit=8,
        filters=RetrievalFilter(
            source_type="document" if body.scope in ("all", "documents", "assignments") else "note",
            subject_id=body.subject_id,
            note_type="pyq" if body.scope in ("all", "documents", "assignments") else None,
            source_ids=body.source_ids or None,
        ),
    )
    items = await predict_questions(rag_context, pyq_context, body.count)
    return StudyToolResponse(
        items=items,
        citations=[asdict(c) for c in rag_context.citations],
        retrieval_meta=rag_context.retrieval_meta,
    )
