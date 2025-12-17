"""add backups table

Revision ID: h8i9j0k1l2m3
Revises: 01c3dc94f8f4
Create Date: 2024-12-17 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'h8i9j0k1l2m3'
down_revision = '01c3dc94f8f4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create backups table
    op.create_table(
        'backups',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('module_type', sa.String(50), nullable=False),
        sa.Column('backup_data', postgresql.JSONB, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
    )

    # Create indexes for better query performance
    op.create_index('ix_backups_user_id', 'backups', ['user_id'])
    op.create_index('ix_backups_module_type', 'backups', ['module_type'])


def downgrade() -> None:
    op.drop_index('ix_backups_module_type', table_name='backups')
    op.drop_index('ix_backups_user_id', table_name='backups')
    op.drop_table('backups')
