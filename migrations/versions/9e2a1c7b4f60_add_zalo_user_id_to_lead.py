"""add zalo_user_id to lead

Revision ID: 9e2a1c7b4f60
Revises: 5c1d3e7f9a2b
Create Date: 2026-06-01
"""
from collections.abc import Sequence
from typing import Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9e2a1c7b4f60"
down_revision: Union[str, Sequence[str], None] = "5c1d3e7f9a2b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "lead",
        sa.Column("zalo_user_id", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("lead", "zalo_user_id")
