from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ─── Subjects ────────────────────────────────────────────────────────────────

class SubjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    color: str = Field(default="#6366f1", pattern=r"^#[0-9a-fA-F]{6}$")


class SubjectOut(BaseModel):
    id: str
    user_id: str
    name: str
    color: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Notes ───────────────────────────────────────────────────────────────────

class NoteCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    type: str = Field(default="typed", pattern=r"^(typed|canvas)$")
    subject_id: str | None = None
    tags: list[str] = Field(default_factory=list)


class NoteUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=500)
    content: str | None = None
    canvas_data: str | None = None
    subject_id: str | None = None
    tags: list[str] | None = None


class NoteOut(BaseModel):
    id: str
    user_id: str
    title: str
    type: str
    content: str | None
    canvas_data: str | None
    subject_id: str | None
    tags: list[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ─── Documents ───────────────────────────────────────────────────────────────

class DocumentOut(BaseModel):
    id: str
    user_id: str
    file_name: str
    storage_key: str
    mime_type: str
    size_bytes: int
    page_count: int | None
    status: str
    subject_id: str | None
    tags: list[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentUpdate(BaseModel):
    subject_id: str | None = None
    tags: list[str] | None = None


# ─── Assignments ─────────────────────────────────────────────────────────────

class AssignmentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    type: str = Field(..., pattern=r"^(assignment|pyq|practice)$")
    document_id: str
    subject_id: str | None = None
    year: int | None = Field(None, ge=1990, le=2100)
    tags: list[str] = Field(default_factory=list)


class AssignmentOut(BaseModel):
    id: str
    user_id: str
    title: str
    type: str
    document_id: str
    subject_id: str | None
    year: int | None
    tags: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Chat ────────────────────────────────────────────────────────────────────

class ChatSessionCreate(BaseModel):
    subject_id: str | None = None


class ChatSessionOut(BaseModel):
    id: str
    user_id: str
    title: str
    subject_id: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ChatMessageOut(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    citations: list[Any]
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)
    scope: str = Field(default="all", pattern=r"^(all|notes|documents|assignments)$")
    subject_id: str | None = None
    source_ids: list[str] = Field(default_factory=list)


class ChatResponse(BaseModel):
    message: ChatMessageOut
    citations: list[Any]


# ─── Search ──────────────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)
    scope: str = Field(default="all", pattern=r"^(all|notes|documents|assignments)$")
    subject_id: str | None = None
    source_ids: list[str] = Field(default_factory=list)
    limit: int = Field(default=10, ge=1, le=50)


class SearchResultOut(BaseModel):
    id: str
    source_type: str
    source_id: str
    title: str
    excerpt: str
    score: float
    citations: list[Any]
    metadata: dict[str, Any]


# ─── AI Study Tools ──────────────────────────────────────────────────────────

class StudyToolRequest(BaseModel):
    query: str = Field(default="course exam preparation", max_length=1000)
    scope: str = Field(default="all", pattern=r"^(all|notes|documents|assignments)$")
    subject_id: str | None = None
    source_ids: list[str] = Field(default_factory=list)
    count: int = Field(default=8, ge=1, le=20)
    difficulty: str | None = Field(default="medium", pattern=r"^(easy|medium|hard)$")


class QuizQuestionOut(BaseModel):
    question: str
    options: list[str] = Field(default_factory=list)
    answer: str
    difficulty: str
    source_hint: str | None = None


class WeakTopicOut(BaseModel):
    topic: str
    confidence: float
    reason: str
    next_action: str


class PredictedQuestionOut(BaseModel):
    question: str
    topic: str
    difficulty: str
    rationale: str
    source_hints: list[str] = Field(default_factory=list)


class StudyToolResponse(BaseModel):
    items: list[Any]
    citations: list[Any]
    retrieval_meta: dict[str, Any]


# ─── Pagination ──────────────────────────────────────────────────────────────

class PaginatedOut(BaseModel):
    data: list[Any]
    total: int
    page: int
    page_size: int
    has_more: bool
