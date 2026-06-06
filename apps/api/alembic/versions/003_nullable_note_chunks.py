"""Allow non-document chunks for notes and assignments.

Revision ID: 003_nullable_note_chunks
Revises: 002_document_chunks
Create Date: 2026-06-03
"""

from alembic import op


revision = "003_nullable_note_chunks"
down_revision = "002_document_chunks"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("document_chunks", "document_id", nullable=True)


def downgrade() -> None:
    op.alter_column("document_chunks", "document_id", nullable=False)
