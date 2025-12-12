"""update restaurant tables - rename restaurant_orders to restaurant_meals

Revision ID: f6g7h8i9j0k1
Revises: e5f6g7h8i9j0
Create Date: 2024-12-12 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'f6g7h8i9j0k1'
down_revision = 'e5f6g7h8i9j0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the old restaurant_orders table if it exists
    op.execute("DROP TABLE IF EXISTS restaurant_orders CASCADE")

    # Update restaurants table - remove price_level and rating, add is_favorite
    # First check if columns exist before dropping/adding
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('restaurants')]

    if 'price_level' in columns:
        op.drop_column('restaurants', 'price_level')
    if 'rating' in columns:
        op.drop_column('restaurants', 'rating')
    if 'is_favorite' not in columns:
        op.add_column('restaurants', sa.Column('is_favorite', sa.Boolean(), nullable=True, server_default='false'))

    # Create restaurant_meals table
    op.create_table(
        'restaurant_meals',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('restaurant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('restaurants.id', ondelete='SET NULL'), nullable=True),
        sa.Column('restaurant_name', sa.String(255), nullable=False),
        sa.Column('meal_date', sa.Date(), nullable=False),
        sa.Column('meal_time', sa.Time(), nullable=True),
        sa.Column('meal_type', sa.String(20), nullable=False),
        sa.Column('order_type', sa.String(20), nullable=False, server_default='dine_in'),
        sa.Column('items_ordered', postgresql.ARRAY(sa.String), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('estimated_calories', sa.Integer(), nullable=True),
        sa.Column('rating', sa.Integer(), nullable=True),
        sa.Column('feeling_after', sa.Integer(), nullable=True),
        sa.Column('tags', postgresql.ARRAY(sa.String), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('image_url', sa.String(), nullable=True),
        sa.Column('import_source', sa.String(50), nullable=True),
        sa.Column('is_archived', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
    )

    # Create indexes
    op.create_index('ix_restaurant_meals_user_id', 'restaurant_meals', ['user_id'])
    op.create_index('ix_restaurant_meals_meal_date', 'restaurant_meals', ['meal_date'])
    op.create_index('ix_restaurant_meals_restaurant_id', 'restaurant_meals', ['restaurant_id'])


def downgrade() -> None:
    # Drop restaurant_meals table
    op.drop_index('ix_restaurant_meals_restaurant_id', table_name='restaurant_meals')
    op.drop_index('ix_restaurant_meals_meal_date', table_name='restaurant_meals')
    op.drop_index('ix_restaurant_meals_user_id', table_name='restaurant_meals')
    op.drop_table('restaurant_meals')

    # Restore restaurants columns
    op.add_column('restaurants', sa.Column('price_level', sa.Integer(), nullable=True))
    op.add_column('restaurants', sa.Column('rating', sa.Integer(), nullable=True))
    op.drop_column('restaurants', 'is_favorite')

    # Recreate restaurant_orders table
    op.create_table(
        'restaurant_orders',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('restaurant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('restaurants.id', ondelete='SET NULL'), nullable=True),
        sa.Column('restaurant_name', sa.String(255), nullable=False),
        sa.Column('order_date', sa.Date(), nullable=False),
        sa.Column('items_ordered', postgresql.ARRAY(sa.String), nullable=True),
        sa.Column('cost', sa.Numeric(10, 2), nullable=True),
        sa.Column('order_type', sa.String(20), nullable=True),
        sa.Column('rating', sa.Integer(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('image_url', sa.String(), nullable=True),
        sa.Column('is_archived', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
    )
