"""Add pantry_items table

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2025-12-10 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6g7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create pantry_items table
    op.create_table('pantry_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('item_name', sa.String(length=255), nullable=False),
        sa.Column('quantity', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('unit', sa.String(length=50), nullable=True),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('storage_location', sa.String(length=50), nullable=False, server_default='pantry'),
        sa.Column('expiry_date', sa.Date(), nullable=True),
        sa.Column('opened_date', sa.Date(), nullable=True),
        sa.Column('minimum_quantity', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('source_grocery_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('is_archived', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('is_wasted', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('wasted_at', sa.DateTime(), nullable=True),
        sa.Column('waste_reason', sa.String(length=50), nullable=True),
        sa.Column('waste_notes', sa.String(length=500), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index(op.f('ix_pantry_items_user_id'), 'pantry_items', ['user_id'], unique=False)
    op.create_index(op.f('ix_pantry_items_storage_location'), 'pantry_items', ['storage_location'], unique=False)
    op.create_index(op.f('ix_pantry_items_category'), 'pantry_items', ['category'], unique=False)
    op.create_index(op.f('ix_pantry_items_is_archived'), 'pantry_items', ['is_archived'], unique=False)

    # Drop old pantry_inventory table if it exists
    op.execute("DROP TABLE IF EXISTS pantry_inventory CASCADE")


def downgrade() -> None:
    op.drop_index(op.f('ix_pantry_items_is_archived'), table_name='pantry_items')
    op.drop_index(op.f('ix_pantry_items_category'), table_name='pantry_items')
    op.drop_index(op.f('ix_pantry_items_storage_location'), table_name='pantry_items')
    op.drop_index(op.f('ix_pantry_items_user_id'), table_name='pantry_items')
    op.drop_table('pantry_items')
