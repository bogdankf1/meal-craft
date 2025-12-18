"""
Currency model for storing supported currencies.
"""
import uuid
from datetime import datetime

from sqlalchemy import Column, String, Integer, Boolean, DateTime, Numeric
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Currency(Base):
    """Currency model for storing supported currencies."""

    __tablename__ = "currencies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Currency details (ISO 4217 standard)
    code = Column(String(3), nullable=False, unique=True, index=True)  # e.g., "USD", "EUR", "UAH"
    name = Column(String(100), nullable=False)  # e.g., "US Dollar", "Euro", "Ukrainian Hryvnia"
    symbol = Column(String(10), nullable=False)  # e.g., "$", "€", "₴"
    decimal_places = Column(Integer, nullable=False, default=2)  # Most currencies use 2 decimal places

    # Symbol position: "before" for $100, "after" for 100 ₴
    symbol_position = Column(String(10), nullable=False, default="before")

    # Exchange rate to USD (base currency)
    exchange_rate = Column(Numeric(20, 10), nullable=False, default=1.0)

    # Status
    is_active = Column(Boolean, nullable=False, default=True, index=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<Currency(code={self.code}, name={self.name}, symbol={self.symbol})>"
