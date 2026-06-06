"""initial schema

Revision ID: 001
Revises:
Create Date: 2025-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "subjects",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("user_id", sa.String, nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("color", sa.String(7), nullable=False, server_default="#6366f1"),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "notes",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("user_id", sa.String, nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("type", sa.Enum("typed", "canvas", name="note_type"), nullable=False),
        sa.Column("content", sa.Text),
        sa.Column("canvas_data", sa.Text),
        sa.Column(
            "subject_id",
            UUID(as_uuid=False),
            sa.ForeignKey("subjects.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("tags", ARRAY(sa.String), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_notes_user_subject", "notes", ["user_id", "subject_id"])
    op.create_index("ix_notes_tags", "notes", ["tags"], postgresql_using="gin")

    op.create_table(
        "documents",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("user_id", sa.String, nullable=False, index=True),
        sa.Column("file_name", sa.String(500), nullable=False),
        sa.Column("storage_key", sa.String(1000), nullable=False),
        sa.Column("mime_type", sa.String(100), nullable=False),
        sa.Column("size_bytes", sa.BigInteger, nullable=False),
        sa.Column("page_count", sa.Integer),
        sa.Column(
            "status",
            sa.Enum("pending", "processing", "ready", "failed", name="document_status"),
            nullable=False,
        ),
        sa.Column(
            "subject_id",
            UUID(as_uuid=False),
            sa.ForeignKey("subjects.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("tags", ARRAY(sa.String), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "assignments",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("user_id", sa.String, nullable=False, index=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column(
            "type",
            sa.Enum("assignment", "pyq", "practice", name="assignment_type"),
            nullable=False,
        ),
        sa.Column(
            "document_id",
            UUID(as_uuid=False),
            sa.ForeignKey("documents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "subject_id",
            UUID(as_uuid=False),
            sa.ForeignKey("subjects.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("year", sa.Integer),
        sa.Column("tags", ARRAY(sa.String), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "chat_sessions",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("user_id", sa.String, nullable=False, index=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column(
            "subject_id",
            UUID(as_uuid=False),
            sa.ForeignKey("subjects.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "chat_messages",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "session_id",
            UUID(as_uuid=False),
            sa.ForeignKey("chat_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "role",
            sa.Enum("user", "assistant", "system", name="message_role"),
            nullable=False,
        ),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("citations", JSONB, nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_chat_messages_session", "chat_messages", ["session_id", "created_at"])

    op.create_table(
        "study_sessions",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column("user_id", sa.String, nullable=False, index=True),
        sa.Column(
            "subject_id",
            UUID(as_uuid=False),
            sa.ForeignKey("subjects.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("duration_minutes", sa.Integer, nullable=False),
        sa.Column(
            "activity_type",
            sa.Enum("notes", "canvas", "chat", "search", "review", name="activity_type"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )


def downgrade() -> None:
    op.drop_table("study_sessions")
    op.drop_table("chat_messages")
    op.drop_table("chat_sessions")
    op.drop_table("assignments")
    op.drop_table("documents")
    op.drop_table("notes")
    op.drop_table("subjects")
    op.execute("DROP TYPE IF EXISTS note_type")
    op.execute("DROP TYPE IF EXISTS document_status")
    op.execute("DROP TYPE IF EXISTS assignment_type")
    op.execute("DROP TYPE IF EXISTS message_role")
    op.execute("DROP TYPE IF EXISTS activity_type")
