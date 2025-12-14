"""add seasonality tables

Revision ID: g7h8i9j0k1l2
Revises: 2d2444c324dc
Create Date: 2024-12-14 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'g7h8i9j0k1l2'
down_revision = '2d2444c324dc'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create seasonal_produce table
    op.create_table(
        'seasonal_produce',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('name_local', sa.String(255), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(100), nullable=False),
        sa.Column('country_code', sa.String(3), nullable=False),
        sa.Column('region', sa.String(100), nullable=True),
        sa.Column('available_months', postgresql.ARRAY(sa.Integer), nullable=False),
        sa.Column('peak_months', postgresql.ARRAY(sa.Integer), nullable=True),
        sa.Column('storage_tips', sa.Text(), nullable=True),
        sa.Column('nutrition_highlights', sa.Text(), nullable=True),
        sa.Column('culinary_uses', sa.Text(), nullable=True),
        sa.Column('image_url', sa.String(500), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Create index on country_code for faster queries
    op.create_index('ix_seasonal_produce_country_code', 'seasonal_produce', ['country_code'])
    op.create_index('ix_seasonal_produce_category', 'seasonal_produce', ['category'])

    # Create local_specialties table
    op.create_table(
        'local_specialties',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('name_local', sa.String(255), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('specialty_type', sa.String(50), nullable=False),
        sa.Column('country_code', sa.String(3), nullable=False),
        sa.Column('region', sa.String(100), nullable=True),
        sa.Column('cultural_info', sa.Text(), nullable=True),
        sa.Column('how_to_use', sa.Text(), nullable=True),
        sa.Column('where_to_find', sa.Text(), nullable=True),
        sa.Column('related_dishes', postgresql.ARRAY(sa.String), nullable=True),
        sa.Column('seasonal_availability', postgresql.ARRAY(sa.Integer), nullable=True),
        sa.Column('image_url', sa.String(500), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_featured', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Create indexes
    op.create_index('ix_local_specialties_country_code', 'local_specialties', ['country_code'])
    op.create_index('ix_local_specialties_specialty_type', 'local_specialties', ['specialty_type'])

    # Create user_seasonal_preferences table
    op.create_table(
        'user_seasonal_preferences',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('country_code', sa.String(3), nullable=True),
        sa.Column('region', sa.String(100), nullable=True),
        sa.Column('favorite_produce_ids', postgresql.ARRAY(postgresql.UUID(as_uuid=True)), nullable=True),
        sa.Column('notification_enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # Create index
    op.create_index('ix_user_seasonal_preferences_user_id', 'user_seasonal_preferences', ['user_id'])


def downgrade() -> None:
    op.drop_table('user_seasonal_preferences')
    op.drop_table('local_specialties')
    op.drop_table('seasonal_produce')
