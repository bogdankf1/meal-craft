"""add_learning_skills_tables

Revision ID: 2d2444c324dc
Revises: 6506209a622a
Create Date: 2025-12-12 16:50:40.901937

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ARRAY


# revision identifiers, used by Alembic.
revision: str = '2d2444c324dc'
down_revision: Union[str, None] = '6506209a622a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop old tables if they exist (from previous learning module)
    op.execute("DROP TABLE IF EXISTS user_technique_progress CASCADE")
    op.execute("DROP TABLE IF EXISTS techniques CASCADE")

    # Create skills table (library of cooking skills/techniques)
    op.create_table(
        'skills',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('difficulty', sa.String(20), nullable=True),
        sa.Column('video_url', sa.String(500), nullable=True),
        sa.Column('instructions', sa.Text, nullable=True),
        sa.Column('tips', sa.Text, nullable=True),
        sa.Column('estimated_learning_hours', sa.Integer, nullable=True),
        sa.Column('prerequisites', ARRAY(UUID(as_uuid=True)), nullable=True),
        sa.Column('related_cuisines', ARRAY(sa.String), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('ix_skills_name', 'skills', ['name'])
    op.create_index('ix_skills_category', 'skills', ['category'])
    op.create_index('ix_skills_difficulty', 'skills', ['difficulty'])

    # Create user_skills table (user's skills with progress)
    op.create_table(
        'user_skills',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('skill_id', UUID(as_uuid=True), sa.ForeignKey('skills.id', ondelete='CASCADE'), nullable=False),
        sa.Column('proficiency_level', sa.String(20), nullable=True, default='beginner'),
        sa.Column('status', sa.String(20), nullable=True, default='learning'),
        sa.Column('progress_percent', sa.Integer, default=0),
        sa.Column('times_practiced', sa.Integer, default=0),
        sa.Column('total_practice_minutes', sa.Integer, default=0),
        sa.Column('is_favorite', sa.Boolean, default=False),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('started_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('last_practiced_at', sa.DateTime, nullable=True),
        sa.Column('mastered_at', sa.DateTime, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('ix_user_skills_user_id', 'user_skills', ['user_id'])
    op.create_index('ix_user_skills_skill_id', 'user_skills', ['skill_id'])
    op.create_index('ix_user_skills_status', 'user_skills', ['status'])
    op.create_unique_constraint('uq_user_skills_user_skill', 'user_skills', ['user_id', 'skill_id'])

    # Create learning_paths table
    op.create_table(
        'learning_paths',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('difficulty', sa.String(20), nullable=True),
        sa.Column('estimated_hours', sa.Integer, nullable=True),
        sa.Column('skill_count', sa.Integer, default=0),
        sa.Column('image_url', sa.String(500), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('is_featured', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('ix_learning_paths_name', 'learning_paths', ['name'])
    op.create_index('ix_learning_paths_category', 'learning_paths', ['category'])

    # Create learning_path_skills association table
    op.create_table(
        'learning_path_skills',
        sa.Column('learning_path_id', UUID(as_uuid=True), sa.ForeignKey('learning_paths.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('skill_id', UUID(as_uuid=True), sa.ForeignKey('skills.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('order', sa.Integer, nullable=False, default=0),
    )

    # Create user_learning_paths table
    op.create_table(
        'user_learning_paths',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('learning_path_id', UUID(as_uuid=True), sa.ForeignKey('learning_paths.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(20), nullable=True, default='not_started'),
        sa.Column('progress_percent', sa.Integer, default=0),
        sa.Column('skills_completed', sa.Integer, default=0),
        sa.Column('current_skill_index', sa.Integer, default=0),
        sa.Column('started_at', sa.DateTime, nullable=True),
        sa.Column('completed_at', sa.DateTime, nullable=True),
        sa.Column('last_activity_at', sa.DateTime, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('ix_user_learning_paths_user_id', 'user_learning_paths', ['user_id'])
    op.create_index('ix_user_learning_paths_status', 'user_learning_paths', ['status'])
    op.create_unique_constraint('uq_user_learning_paths_user_path', 'user_learning_paths', ['user_id', 'learning_path_id'])

    # Create skill_practice_logs table
    op.create_table(
        'skill_practice_logs',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('skill_id', UUID(as_uuid=True), sa.ForeignKey('skills.id', ondelete='CASCADE'), nullable=False),
        sa.Column('duration_minutes', sa.Integer, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('rating', sa.Integer, nullable=True),
        sa.Column('recipe_id', UUID(as_uuid=True), sa.ForeignKey('recipes.id', ondelete='SET NULL'), nullable=True),
        sa.Column('practiced_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index('ix_skill_practice_logs_user_id', 'skill_practice_logs', ['user_id'])
    op.create_index('ix_skill_practice_logs_skill_id', 'skill_practice_logs', ['skill_id'])
    op.create_index('ix_skill_practice_logs_practiced_at', 'skill_practice_logs', ['practiced_at'])

    # Update user_notes table to add skill_id reference
    op.add_column('user_notes', sa.Column('skill_id', UUID(as_uuid=True), sa.ForeignKey('skills.id', ondelete='SET NULL'), nullable=True))
    op.add_column('user_notes', sa.Column('recipe_id', UUID(as_uuid=True), sa.ForeignKey('recipes.id', ondelete='SET NULL'), nullable=True))


def downgrade() -> None:
    # Remove columns from user_notes
    op.drop_column('user_notes', 'recipe_id')
    op.drop_column('user_notes', 'skill_id')

    # Drop tables
    op.drop_table('skill_practice_logs')
    op.drop_table('user_learning_paths')
    op.drop_table('learning_path_skills')
    op.drop_table('learning_paths')
    op.drop_table('user_skills')
    op.drop_table('skills')
