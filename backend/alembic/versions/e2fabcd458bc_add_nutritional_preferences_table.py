"""Add nutritional preferences table

Revision ID: e2fabcd458bc
Revises: d1fadce457ab
Create Date: 2025-12-22 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'e2fabcd458bc'
down_revision: Union[str, None] = 'd1fadce457ab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create nutritional_preferences table
    op.create_table('nutritional_preferences',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('profile_id', sa.UUID(), nullable=False),
        sa.Column('diet_type', sa.String(length=30), nullable=False, server_default='omnivore'),
        sa.Column('goals', postgresql.ARRAY(sa.String()), nullable=False, server_default='{}'),
        sa.Column('preferences', postgresql.ARRAY(sa.String()), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['profile_id'], ['profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('profile_id')
    )

    # Create index on profile_id for faster lookups
    op.create_index('ix_nutritional_preferences_profile_id', 'nutritional_preferences', ['profile_id'])


def downgrade() -> None:
    op.drop_index('ix_nutritional_preferences_profile_id', table_name='nutritional_preferences')
    op.drop_table('nutritional_preferences')
