"""Add kitchen_equipment table

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6g7
Create Date: 2025-12-11 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6g7h8'
down_revision: Union[str, None] = 'b2c3d4e5f6g7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create kitchen_equipment table
    op.create_table('kitchen_equipment',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        # Basic Information
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('brand', sa.String(length=100), nullable=True),
        sa.Column('model', sa.String(length=100), nullable=True),
        # Condition & Status
        sa.Column('condition', sa.String(length=50), nullable=True, server_default='good'),
        sa.Column('location', sa.String(length=100), nullable=True, server_default='cabinet'),
        # Purchase Information
        sa.Column('purchase_date', sa.Date(), nullable=True),
        sa.Column('purchase_price', sa.Numeric(precision=10, scale=2), nullable=True),
        # Maintenance Tracking
        sa.Column('last_maintenance_date', sa.Date(), nullable=True),
        sa.Column('maintenance_interval_days', sa.Integer(), nullable=True),
        sa.Column('maintenance_notes', sa.Text(), nullable=True),
        # Additional Fields
        sa.Column('notes', sa.Text(), nullable=True),
        # Status Flags
        sa.Column('is_archived', sa.Boolean(), nullable=True, server_default='false'),
        # Timestamps
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index(op.f('ix_kitchen_equipment_user_id'), 'kitchen_equipment', ['user_id'], unique=False)
    op.create_index(op.f('ix_kitchen_equipment_category'), 'kitchen_equipment', ['category'], unique=False)
    op.create_index(op.f('ix_kitchen_equipment_condition'), 'kitchen_equipment', ['condition'], unique=False)
    op.create_index(op.f('ix_kitchen_equipment_location'), 'kitchen_equipment', ['location'], unique=False)
    op.create_index(op.f('ix_kitchen_equipment_is_archived'), 'kitchen_equipment', ['is_archived'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_kitchen_equipment_is_archived'), table_name='kitchen_equipment')
    op.drop_index(op.f('ix_kitchen_equipment_location'), table_name='kitchen_equipment')
    op.drop_index(op.f('ix_kitchen_equipment_condition'), table_name='kitchen_equipment')
    op.drop_index(op.f('ix_kitchen_equipment_category'), table_name='kitchen_equipment')
    op.drop_index(op.f('ix_kitchen_equipment_user_id'), table_name='kitchen_equipment')
    op.drop_table('kitchen_equipment')
