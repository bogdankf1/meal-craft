"""Add recipe integration fields for equipment, techniques, and seasonality

Revision ID: 01c3dc94f8f4
Revises: g7h8i9j0k1l2
Create Date: 2025-12-14 21:03:04.030825

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '01c3dc94f8f4'
down_revision: Union[str, None] = 'g7h8i9j0k1l2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new JSONB and ARRAY columns for recipe integrations
    op.add_column('recipes', sa.Column('required_equipment', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('recipes', sa.Column('techniques', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('recipes', sa.Column('seasonal_info', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('recipes', sa.Column('best_season_months', sa.ARRAY(sa.Integer()), nullable=True))


def downgrade() -> None:
    op.drop_column('recipes', 'best_season_months')
    op.drop_column('recipes', 'seasonal_info')
    op.drop_column('recipes', 'techniques')
    op.drop_column('recipes', 'required_equipment')
