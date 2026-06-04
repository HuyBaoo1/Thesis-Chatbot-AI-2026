"""add STAFF value to notificationtarget enum

Revision ID: 5c1d3e7f9a2b
Revises: 4b9f8a6c1d2e
Create Date: 2026-05-11 08:30:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "5c1d3e7f9a2b"
down_revision: Union[str, Sequence[str], None] = "4b9f8a6c1d2e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_enum
                WHERE enumtypid = 'notificationtarget'::regtype
                AND enumlabel = 'STAFF'
            ) THEN
                ALTER TYPE notificationtarget ADD VALUE 'STAFF';
            END IF;
        END $$;
        """
    )


def downgrade() -> None:
    # PostgreSQL does not support removing values from enums.
    pass
