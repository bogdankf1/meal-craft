"""Add nutrition fields to restaurant_meals and nutrition tables

Revision ID: 6506209a622a
Revises: f6g7h8i9j0k1
Create Date: 2025-12-12 13:24:54.423883

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6506209a622a'
down_revision: Union[str, None] = 'f6g7h8i9j0k1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add nutrition fields to nutrition_goals
    op.add_column('nutrition_goals', sa.Column('daily_sugar_g', sa.Integer(), nullable=True))
    op.add_column('nutrition_goals', sa.Column('daily_sodium_mg', sa.Integer(), nullable=True))

    # Add fields to nutrition_logs
    op.add_column('nutrition_logs', sa.Column('restaurant_meal_id', sa.UUID(), nullable=True))
    op.add_column('nutrition_logs', sa.Column('name', sa.String(length=255), nullable=True))
    op.add_column('nutrition_logs', sa.Column('sugar_g', sa.Numeric(precision=10, scale=1), nullable=True))
    op.add_column('nutrition_logs', sa.Column('sodium_mg', sa.Numeric(precision=10, scale=1), nullable=True))
    op.add_column('nutrition_logs', sa.Column('is_archived', sa.Boolean(), nullable=True, server_default='false'))
    op.create_foreign_key(
        'fk_nutrition_logs_restaurant_meal_id',
        'nutrition_logs', 'restaurant_meals',
        ['restaurant_meal_id'], ['id'],
        ondelete='SET NULL'
    )

    # Add nutrition estimation fields to restaurant_meals
    op.add_column('restaurant_meals', sa.Column('estimated_protein_g', sa.Numeric(precision=10, scale=1), nullable=True))
    op.add_column('restaurant_meals', sa.Column('estimated_carbs_g', sa.Numeric(precision=10, scale=1), nullable=True))
    op.add_column('restaurant_meals', sa.Column('estimated_fat_g', sa.Numeric(precision=10, scale=1), nullable=True))
    op.add_column('restaurant_meals', sa.Column('estimated_fiber_g', sa.Numeric(precision=10, scale=1), nullable=True))
    op.add_column('restaurant_meals', sa.Column('estimated_sugar_g', sa.Numeric(precision=10, scale=1), nullable=True))
    op.add_column('restaurant_meals', sa.Column('estimated_sodium_mg', sa.Numeric(precision=10, scale=1), nullable=True))


def downgrade() -> None:
    # Remove nutrition estimation fields from restaurant_meals
    op.drop_column('restaurant_meals', 'estimated_sodium_mg')
    op.drop_column('restaurant_meals', 'estimated_sugar_g')
    op.drop_column('restaurant_meals', 'estimated_fiber_g')
    op.drop_column('restaurant_meals', 'estimated_fat_g')
    op.drop_column('restaurant_meals', 'estimated_carbs_g')
    op.drop_column('restaurant_meals', 'estimated_protein_g')

    # Remove fields from nutrition_logs
    op.drop_constraint('fk_nutrition_logs_restaurant_meal_id', 'nutrition_logs', type_='foreignkey')
    op.drop_column('nutrition_logs', 'is_archived')
    op.drop_column('nutrition_logs', 'sodium_mg')
    op.drop_column('nutrition_logs', 'sugar_g')
    op.drop_column('nutrition_logs', 'name')
    op.drop_column('nutrition_logs', 'restaurant_meal_id')

    # Remove nutrition fields from nutrition_goals
    op.drop_column('nutrition_goals', 'daily_sodium_mg')
    op.drop_column('nutrition_goals', 'daily_sugar_g')
