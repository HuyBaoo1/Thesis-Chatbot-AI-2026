"""add source_domain to conversation

Revision ID: 8a1b2c3d4e5f
Revises: 6d6f6f2f7b71
Create Date: 2026-05-08
"""
from collections.abc import Sequence
from typing import Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8a1b2c3d4e5f"
down_revision: Union[str, Sequence[str], None] = "6d6f6f2f7b71"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "conversation",
        sa.Column("source_domain", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("conversation", "source_domain")
