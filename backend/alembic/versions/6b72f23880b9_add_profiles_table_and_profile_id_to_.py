"""Add profiles table and profile_id to meal_plans, nutrition_goals, nutrition_logs, health_metrics

Revision ID: 6b72f23880b9
Revises: e4ea5f483e9d
Create Date: 2025-12-19 16:50:53.596284

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6b72f23880b9'
down_revision: Union[str, None] = 'e4ea5f483e9d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create profiles table
    op.create_table('profiles',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('color', sa.String(length=7), nullable=True),
        sa.Column('avatar_url', sa.String(length=500), nullable=True),
        sa.Column('is_default', sa.Boolean(), nullable=True),
        sa.Column('is_archived', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Add profile_id to related tables
    op.add_column('meal_plans', sa.Column('profile_id', sa.UUID(), nullable=True))
    op.create_foreign_key('fk_meal_plans_profile_id', 'meal_plans', 'profiles', ['profile_id'], ['id'], ondelete='SET NULL')

    op.add_column('nutrition_goals', sa.Column('profile_id', sa.UUID(), nullable=True))
    op.create_foreign_key('fk_nutrition_goals_profile_id', 'nutrition_goals', 'profiles', ['profile_id'], ['id'], ondelete='SET NULL')

    op.add_column('nutrition_logs', sa.Column('profile_id', sa.UUID(), nullable=True))
    op.create_foreign_key('fk_nutrition_logs_profile_id', 'nutrition_logs', 'profiles', ['profile_id'], ['id'], ondelete='SET NULL')

    op.add_column('health_metrics', sa.Column('profile_id', sa.UUID(), nullable=True))
    op.create_foreign_key('fk_health_metrics_profile_id', 'health_metrics', 'profiles', ['profile_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    # Remove foreign keys and columns
    op.drop_constraint('fk_health_metrics_profile_id', 'health_metrics', type_='foreignkey')
    op.drop_column('health_metrics', 'profile_id')

    op.drop_constraint('fk_nutrition_logs_profile_id', 'nutrition_logs', type_='foreignkey')
    op.drop_column('nutrition_logs', 'profile_id')

    op.drop_constraint('fk_nutrition_goals_profile_id', 'nutrition_goals', type_='foreignkey')
    op.drop_column('nutrition_goals', 'profile_id')

    op.drop_constraint('fk_meal_plans_profile_id', 'meal_plans', type_='foreignkey')
    op.drop_column('meal_plans', 'profile_id')

    # Drop profiles table
    op.drop_table('profiles')
