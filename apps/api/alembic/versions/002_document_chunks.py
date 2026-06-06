"""add document_chunks and enrich document metadata

Revision ID: 002_document_chunks
Revises: 001
Create Date: 2025-01-02 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY, TSVECTOR, UUID

revision = "002_document_chunks"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Extend documents with rich metadata fields
    op.add_column("documents", sa.Column("topic", sa.String(500), nullable=True))
    op.add_column("documents", sa.Column("semester", sa.String(100), nullable=True))
    op.add_column("documents", sa.Column("note_type", sa.String(100), nullable=True))

    # document_chunks mirrors Qdrant points for keyword/BM25 search
    op.create_table(
        "document_chunks",
        sa.Column("id", UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "document_id",
            UUID(as_uuid=False),
            sa.ForeignKey("documents.id", ondelete="CASCADE"),
            nullable=True,   # nullable so notes (no document row) can be indexed
        ),
        sa.Column("user_id", sa.String, nullable=False, index=True),
        sa.Column("source_type", sa.String(50), nullable=False),
        sa.Column("source_id", sa.String, nullable=False, index=True),
        sa.Column("chunk_index", sa.Integer, nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("page", sa.Integer, nullable=True),
        sa.Column("token_count", sa.Integer, nullable=False),
        sa.Column("subject_id", sa.String, nullable=True, index=True),
        sa.Column("topic", sa.String(500), nullable=True),
        sa.Column("semester", sa.String(100), nullable=True),
        sa.Column("note_type", sa.String(100), nullable=True),
        sa.Column("tags", ARRAY(sa.String), nullable=False, server_default="{}"),
        sa.Column("search_vector", TSVECTOR, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    op.create_index(
        "ix_doc_chunks_source",
        "document_chunks",
        ["source_id", "chunk_index"],
    )
    op.create_index(
        "ix_doc_chunks_user_subject",
        "document_chunks",
        ["user_id", "subject_id"],
    )
    op.create_index(
        "ix_doc_chunks_search_vector",
        "document_chunks",
        ["search_vector"],
        postgresql_using="gin",
    )


def downgrade() -> None:
    op.drop_table("document_chunks")
    op.drop_column("documents", "note_type")
    op.drop_column("documents", "semester")
    op.drop_column("documents", "topic")
