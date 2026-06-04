"""add handoff ai fallback deadline

Revision ID: 6d6f6f2f7b71
Revises: 2de363c3aed9
Create Date: 2026-05-07 11:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6d6f6f2f7b71"
down_revision: Union[str, Sequence[str], None] = "2de363c3aed9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "conversation",
        sa.Column("ai_fallback_deadline_at", sa.DateTime(), nullable=True),
    )
    op.create_index(
        "idx_conversation_ai_fallback_deadline_at",
        "conversation",
        ["ai_fallback_deadline_at"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("idx_conversation_ai_fallback_deadline_at", table_name="conversation")
    op.drop_column("conversation", "ai_fallback_deadline_at")
