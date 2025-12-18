"""add_currencies_table

Revision ID: efc54b542652
Revises: h8i9j0k1l2m3
Create Date: 2025-12-18 16:07:54.108691

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'efc54b542652'
down_revision: Union[str, None] = 'h8i9j0k1l2m3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create currencies table
    op.create_table('currencies',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('code', sa.String(length=3), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('symbol', sa.String(length=10), nullable=False),
        sa.Column('decimal_places', sa.Integer(), nullable=False),
        sa.Column('symbol_position', sa.String(length=10), nullable=False),
        sa.Column('exchange_rate', sa.Numeric(precision=20, scale=10), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_currencies_code'), 'currencies', ['code'], unique=True)
    op.create_index(op.f('ix_currencies_is_active'), 'currencies', ['is_active'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_currencies_is_active'), table_name='currencies')
    op.drop_index(op.f('ix_currencies_code'), table_name='currencies')
    op.drop_table('currencies')
