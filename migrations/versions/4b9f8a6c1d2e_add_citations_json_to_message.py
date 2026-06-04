"""add citations json to message

Revision ID: 4b9f8a6c1d2e
Revises: 8a1b2c3d4e5f
Create Date: 2026-05-10 10:30:00.000000
"""
from collections.abc import Sequence
from typing import Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "4b9f8a6c1d2e"
down_revision: Union[str, Sequence[str], None] = "8a1b2c3d4e5f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "message",
        sa.Column("citations_json", sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("message", "citations_json")
