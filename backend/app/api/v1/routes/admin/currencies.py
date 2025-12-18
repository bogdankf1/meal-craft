"""
Admin currency management endpoints.
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_admin_user
from app.models.user import User
from app.api.v1.routes.admin.service import AdminService
from app.api.v1.routes.admin.schemas import (
    CurrencyBase,
    CurrencyCreate,
    CurrencyUpdate,
)

router = APIRouter(prefix="/currencies", tags=["Admin - Currencies"])


@router.get("", response_model=List[CurrencyBase])
async def get_currencies(
    active_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Get all currencies."""
    service = AdminService(db)
    return await service.get_currencies(active_only=active_only)


@router.get("/{currency_id}", response_model=CurrencyBase)
async def get_currency(
    currency_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Get a specific currency by ID."""
    service = AdminService(db)
    currency = await service.get_currency_by_id(currency_id)
    if not currency:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Currency not found",
        )
    return currency


@router.post("", response_model=CurrencyBase, status_code=status.HTTP_201_CREATED)
async def create_currency(
    currency_data: CurrencyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Create a new currency."""
    service = AdminService(db)

    # Check if currency code already exists
    existing = await service.get_currency_by_code(currency_data.code)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Currency with code {currency_data.code.upper()} already exists",
        )

    return await service.create_currency(
        code=currency_data.code,
        name=currency_data.name,
        symbol=currency_data.symbol,
        decimal_places=currency_data.decimal_places,
        symbol_position=currency_data.symbol_position,
        exchange_rate=currency_data.exchange_rate,
        is_active=currency_data.is_active,
    )


@router.patch("/{currency_id}", response_model=CurrencyBase)
async def update_currency(
    currency_id: UUID,
    currency_data: CurrencyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Update a currency."""
    service = AdminService(db)

    currency = await service.update_currency(
        currency_id=currency_id,
        name=currency_data.name,
        symbol=currency_data.symbol,
        decimal_places=currency_data.decimal_places,
        symbol_position=currency_data.symbol_position,
        exchange_rate=currency_data.exchange_rate,
        is_active=currency_data.is_active,
    )

    if not currency:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Currency not found",
        )

    return currency


@router.delete("/{currency_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_currency(
    currency_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Delete (deactivate) a currency."""
    service = AdminService(db)

    success = await service.delete_currency(currency_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Currency not found",
        )

    return None
