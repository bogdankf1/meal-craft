"""Add dietary restrictions table

Revision ID: d1fadce457ab
Revises: 6b72f23880b9
Create Date: 2025-12-22 17:24:01.485550

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'd1fadce457ab'
down_revision: Union[str, None] = '6b72f23880b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create dietary_restrictions table using String for restriction_type
    # to avoid enum creation issues
    op.create_table('dietary_restrictions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('profile_id', sa.UUID(), nullable=False),
        sa.Column('ingredient_name', sa.String(length=100), nullable=False),
        sa.Column('restriction_type', sa.String(length=20), nullable=False),  # 'allergy' or 'dislike'
        sa.Column('notes', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['profile_id'], ['profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create index on profile_id for faster lookups
    op.create_index('ix_dietary_restrictions_profile_id', 'dietary_restrictions', ['profile_id'])


def downgrade() -> None:
    op.drop_index('ix_dietary_restrictions_profile_id', table_name='dietary_restrictions')
    op.drop_table('dietary_restrictions')
