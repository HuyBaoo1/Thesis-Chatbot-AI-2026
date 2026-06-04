"""merge crawl heads

Revision ID: 2de363c3aed9
Revises: d63a97039108
Create Date: 2026-05-02 02:08:33.675490

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2de363c3aed9'
down_revision: Union[str, Sequence[str], None] = 'd63a97039108'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
