"""Add waste tracking fields to groceries

Revision ID: a1b2c3d4e5f6
Revises: 95f75082523a
Create Date: 2025-12-10 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '95f75082523a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add waste tracking fields to groceries table
    op.add_column('groceries', sa.Column('is_wasted', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('groceries', sa.Column('wasted_at', sa.DateTime(), nullable=True))
    op.add_column('groceries', sa.Column('waste_reason', sa.String(length=50), nullable=True))
    op.add_column('groceries', sa.Column('waste_notes', sa.String(length=500), nullable=True))

    # Update existing rows to have is_wasted = false
    op.execute("UPDATE groceries SET is_wasted = false WHERE is_wasted IS NULL")

    # Make is_wasted not nullable after setting defaults
    op.alter_column('groceries', 'is_wasted', nullable=False, server_default=None)


def downgrade() -> None:
    op.drop_column('groceries', 'waste_notes')
    op.drop_column('groceries', 'waste_reason')
    op.drop_column('groceries', 'wasted_at')
    op.drop_column('groceries', 'is_wasted')
