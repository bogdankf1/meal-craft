"""Add pantry_transactions table and strengthen grocery-pantry FK

Revision ID: g4hcdef670de
Revises: f3gbcde569cd
Create Date: 2025-12-30 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'g4hcdef670de'
down_revision: Union[str, None] = 'f3gbcde569cd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create pantry_transactions table
    op.create_table(
        'pantry_transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('pantry_item_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('pantry_items.id', ondelete='CASCADE'), nullable=False),
        sa.Column('transaction_type', sa.String(20), nullable=False),
        sa.Column('quantity_change', sa.Numeric(10, 2), nullable=False),
        sa.Column('quantity_before', sa.Numeric(10, 2), nullable=False),
        sa.Column('quantity_after', sa.Numeric(10, 2), nullable=False),
        sa.Column('unit', sa.String(50), nullable=True),
        sa.Column('source_type', sa.String(50), nullable=True),
        sa.Column('source_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('notes', sa.String(500), nullable=True),
        sa.Column('transaction_date', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False),
    )

    # Create indexes for common query patterns
    op.create_index('idx_pantry_transactions_user', 'pantry_transactions', ['user_id'])
    op.create_index('idx_pantry_transactions_item', 'pantry_transactions', ['pantry_item_id'])
    op.create_index('idx_pantry_transactions_source', 'pantry_transactions', ['source_type', 'source_id'])
    op.create_index('idx_pantry_transactions_date', 'pantry_transactions', ['transaction_date'])

    # Add FK constraint to pantry_items.source_grocery_id if it doesn't exist
    # First check if any invalid references exist and clear them
    op.execute("""
        UPDATE pantry_items
        SET source_grocery_id = NULL
        WHERE source_grocery_id IS NOT NULL
        AND source_grocery_id NOT IN (SELECT id FROM groceries)
    """)

    # Now add the foreign key constraint
    op.create_foreign_key(
        'fk_pantry_items_source_grocery',
        'pantry_items',
        'groceries',
        ['source_grocery_id'],
        ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    # Drop the FK constraint
    op.drop_constraint('fk_pantry_items_source_grocery', 'pantry_items', type_='foreignkey')

    # Drop indexes
    op.drop_index('idx_pantry_transactions_date', 'pantry_transactions')
    op.drop_index('idx_pantry_transactions_source', 'pantry_transactions')
    op.drop_index('idx_pantry_transactions_item', 'pantry_transactions')
    op.drop_index('idx_pantry_transactions_user', 'pantry_transactions')

    # Drop pantry_transactions table
    op.drop_table('pantry_transactions')
