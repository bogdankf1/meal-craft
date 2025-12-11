"""Extend recipes table and add collections and cooking history

Revision ID: d4e5f6g7h8i9
Revises: c3d4e5f6g7h8
Create Date: 2025-01-11

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'd4e5f6g7h8i9'
down_revision = 'c3d4e5f6g7h8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns to recipes table
    op.add_column('recipes', sa.Column('category', sa.String(50), nullable=True))
    op.add_column('recipes', sa.Column('tags', postgresql.ARRAY(sa.String()), nullable=True))
    op.add_column('recipes', sa.Column('instructions_json', postgresql.JSONB(), nullable=True))
    op.add_column('recipes', sa.Column('source', sa.String(500), nullable=True))
    op.add_column('recipes', sa.Column('source_url', sa.String(1000), nullable=True))
    op.add_column('recipes', sa.Column('is_favorite', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('recipes', sa.Column('notes', sa.Text(), nullable=True))

    # Create indexes for recipes table
    op.create_index('ix_recipes_category', 'recipes', ['category'])
    op.create_index('ix_recipes_cuisine_type', 'recipes', ['cuisine_type'])
    op.create_index('ix_recipes_is_favorite', 'recipes', ['is_favorite'])
    op.create_index('ix_recipes_is_archived', 'recipes', ['is_archived'])

    # Create cooking_history table
    op.create_table(
        'cooking_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('recipe_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('recipes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('cooked_at', sa.DateTime(), nullable=False),
        sa.Column('servings_made', sa.Integer(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('rating', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_cooking_history_user_id', 'cooking_history', ['user_id'])
    op.create_index('ix_cooking_history_recipe_id', 'cooking_history', ['recipe_id'])
    op.create_index('ix_cooking_history_cooked_at', 'cooking_history', ['cooked_at'])

    # Create recipe_collections table
    op.create_table(
        'recipe_collections',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('color', sa.String(20), nullable=True),
        sa.Column('icon', sa.String(50), nullable=True),
        sa.Column('is_archived', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('ix_recipe_collections_user_id', 'recipe_collections', ['user_id'])
    op.create_index('ix_recipe_collections_name', 'recipe_collections', ['name'])

    # Create recipe_collection_items junction table (many-to-many)
    op.create_table(
        'recipe_collection_items',
        sa.Column('recipe_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('recipes.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('collection_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('recipe_collections.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('added_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_recipe_collection_items_recipe_id', 'recipe_collection_items', ['recipe_id'])
    op.create_index('ix_recipe_collection_items_collection_id', 'recipe_collection_items', ['collection_id'])


def downgrade() -> None:
    # Drop junction table
    op.drop_index('ix_recipe_collection_items_collection_id', table_name='recipe_collection_items')
    op.drop_index('ix_recipe_collection_items_recipe_id', table_name='recipe_collection_items')
    op.drop_table('recipe_collection_items')

    # Drop recipe_collections table
    op.drop_index('ix_recipe_collections_name', table_name='recipe_collections')
    op.drop_index('ix_recipe_collections_user_id', table_name='recipe_collections')
    op.drop_table('recipe_collections')

    # Drop cooking_history table
    op.drop_index('ix_cooking_history_cooked_at', table_name='cooking_history')
    op.drop_index('ix_cooking_history_recipe_id', table_name='cooking_history')
    op.drop_index('ix_cooking_history_user_id', table_name='cooking_history')
    op.drop_table('cooking_history')

    # Drop indexes from recipes table
    op.drop_index('ix_recipes_is_archived', table_name='recipes')
    op.drop_index('ix_recipes_is_favorite', table_name='recipes')
    op.drop_index('ix_recipes_cuisine_type', table_name='recipes')
    op.drop_index('ix_recipes_category', table_name='recipes')

    # Drop new columns from recipes table
    op.drop_column('recipes', 'notes')
    op.drop_column('recipes', 'is_favorite')
    op.drop_column('recipes', 'source_url')
    op.drop_column('recipes', 'source')
    op.drop_column('recipes', 'instructions_json')
    op.drop_column('recipes', 'tags')
    op.drop_column('recipes', 'category')
