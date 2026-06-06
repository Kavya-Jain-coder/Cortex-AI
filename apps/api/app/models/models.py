import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, TSVECTOR, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.utcnow()


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    color: Mapped[str] = mapped_column(String(7), nullable=False, default="#6366f1")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    notes: Mapped[list["Note"]] = relationship(back_populates="subject")
    documents: Mapped[list["Document"]] = relationship(back_populates="subject")


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    type: Mapped[str] = mapped_column(
        Enum("typed", "canvas", name="note_type"), nullable=False, default="typed"
    )
    content: Mapped[str | None] = mapped_column(Text)
    canvas_data: Mapped[str | None] = mapped_column(Text)
    subject_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True
    )
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)

    subject: Mapped["Subject | None"] = relationship(back_populates="notes")

    __table_args__ = (
        Index("ix_notes_user_subject", "user_id", "subject_id"),
        Index("ix_notes_tags", "tags", postgresql_using="gin"),
    )


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    file_name: Mapped[str] = mapped_column(String(500), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(1000), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    page_count: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(
        Enum("pending", "processing", "ready", "failed", name="document_status"),
        nullable=False,
        default="pending",
    )
    subject_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True
    )
    # Rich metadata for scoped retrieval
    topic: Mapped[str | None] = mapped_column(String(500))
    semester: Mapped[str | None] = mapped_column(String(100))
    note_type: Mapped[str | None] = mapped_column(String(100))  # lecture, textbook, pyq, assignment
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)

    subject: Mapped["Subject | None"] = relationship(back_populates="documents")
    chunks: Mapped[list["DocumentChunk"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )


class DocumentChunk(Base):
    """Mirrors Qdrant chunks in PostgreSQL for keyword/BM25 search and retrieval eval."""
    __tablename__ = "document_chunks"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)  # same ID as Qdrant point
    document_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("documents.id", ondelete="CASCADE"), nullable=True
    )
    user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)  # document | note | assignment
    source_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    page: Mapped[int | None] = mapped_column(Integer)
    token_count: Mapped[int] = mapped_column(Integer, nullable=False)
    # Metadata for scoped retrieval
    subject_id: Mapped[str | None] = mapped_column(String, index=True)
    topic: Mapped[str | None] = mapped_column(String(500))
    semester: Mapped[str | None] = mapped_column(String(100))
    note_type: Mapped[str | None] = mapped_column(String(100))
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    # PostgreSQL full-text search vector — updated via trigger
    search_vector: Mapped[str | None] = mapped_column(TSVECTOR)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    document: Mapped["Document | None"] = relationship(back_populates="chunks")

    __table_args__ = (
        Index("ix_doc_chunks_source", "source_id", "chunk_index"),
        Index("ix_doc_chunks_user_subject", "user_id", "subject_id"),
        Index("ix_doc_chunks_search_vector", "search_vector", postgresql_using="gin"),
    )


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    type: Mapped[str] = mapped_column(
        Enum("assignment", "pyq", "practice", name="assignment_type"), nullable=False
    )
    document_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    subject_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True
    )
    year: Mapped[int | None] = mapped_column(Integer)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False, default="New Chat")
    subject_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)

    messages: Mapped[list["ChatMessage"]] = relationship(
        back_populates="session", order_by="ChatMessage.created_at"
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    session_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(
        Enum("user", "assistant", "system", name="message_role"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    citations: Mapped[list] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    session: Mapped["ChatSession"] = relationship(back_populates="messages")

    __table_args__ = (Index("ix_chat_messages_session", "session_id", "created_at"),)


class StudySession(Base):
    __tablename__ = "study_sessions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    subject_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True
    )
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    activity_type: Mapped[str] = mapped_column(
        Enum("notes", "canvas", "chat", "search", "review", name="activity_type"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
