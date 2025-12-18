"""add_support_tables

Revision ID: e4ea5f483e9d
Revises: efc54b542652
Create Date: 2025-12-18 17:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'e4ea5f483e9d'
down_revision: Union[str, None] = 'efc54b542652'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create support_topics table
    op.create_table('support_topics',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='open', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_support_topics_user_id'), 'support_topics', ['user_id'], unique=False)

    # Create support_messages table
    op.create_table('support_messages',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('topic_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('is_admin_reply', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['topic_id'], ['support_topics.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_support_messages_topic_id'), 'support_messages', ['topic_id'], unique=False)
    op.create_index(op.f('ix_support_messages_user_id'), 'support_messages', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_support_messages_user_id'), table_name='support_messages')
    op.drop_index(op.f('ix_support_messages_topic_id'), table_name='support_messages')
    op.drop_table('support_messages')
    op.drop_index(op.f('ix_support_topics_user_id'), table_name='support_topics')
    op.drop_table('support_topics')
