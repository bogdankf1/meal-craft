"""
Public currency endpoints for user settings.
"""
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.currency import Currency

router = APIRouter(prefix="/currencies", tags=["Currencies"])


class CurrencyResponse(BaseModel):
    """Currency response for public API."""
    id: str
    code: str
    name: str
    symbol: str
    decimal_places: int
    symbol_position: str
    exchange_rate: float

    class Config:
        from_attributes = True


@router.get("", response_model=List[CurrencyResponse])
async def get_active_currencies(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all active currencies for user settings."""
    result = await db.execute(
        select(Currency)
        .where(Currency.is_active == True)
        .order_by(Currency.code)
    )
    currencies = result.scalars().all()

    return [
        CurrencyResponse(
            id=str(c.id),
            code=c.code,
            name=c.name,
            symbol=c.symbol,
            decimal_places=c.decimal_places,
            symbol_position=c.symbol_position,
            exchange_rate=float(c.exchange_rate),
        )
        for c in currencies
    ]
