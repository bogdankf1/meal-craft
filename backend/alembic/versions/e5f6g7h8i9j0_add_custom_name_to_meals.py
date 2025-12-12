"""add custom_name to meals

Revision ID: e5f6g7h8i9j0
Revises: d4e5f6g7h8i9_extend_recipes_add_collections_history
Create Date: 2024-12-11 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e5f6g7h8i9j0'
down_revision = 'd4e5f6g7h8i9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add custom_name column to meals table for non-recipe meals
    op.add_column('meals', sa.Column('custom_name', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('meals', 'custom_name')
