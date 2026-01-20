"""Add ui_preferences to users

Revision ID: f3gbcde569cd
Revises: e2fabcd458bc
Create Date: 2025-12-28 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'f3gbcde569cd'
down_revision: Union[str, None] = 'e2fabcd458bc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add ui_preferences JSON column to users table
    op.add_column('users', sa.Column('ui_preferences', postgresql.JSON(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'ui_preferences')
