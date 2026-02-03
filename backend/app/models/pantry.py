import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Date, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class StorageLocation(str, PyEnum):
    PANTRY = "pantry"
    FRIDGE = "fridge"
    FREEZER = "freezer"
    CABINET = "cabinet"
    SPICE_RACK = "spice_rack"
    OTHER = "other"


class PantryCategory(str, PyEnum):
    PRODUCE = "produce"
    MEAT = "meat"
    SEAFOOD = "seafood"
    DAIRY = "dairy"
    BAKERY = "bakery"
    FROZEN = "frozen"
    PANTRY = "pantry"
    BEVERAGES = "beverages"
    SNACKS = "snacks"
    CONDIMENTS = "condiments"
    SPICES = "spices"
    OTHER = "other"


class PantryWasteReason(str, PyEnum):
    EXPIRED = "expired"
    SPOILED = "spoiled"
    FORGOT = "forgot"
    OVERCOOKED = "overcooked"
    DIDNT_LIKE = "didnt_like"
    TOO_MUCH = "too_much"
    OTHER = "other"


class PantryTransactionType(str, PyEnum):
    """Type of pantry inventory transaction."""
    ADD = "add"  # Adding items to pantry (from groceries, manual add)
    DEDUCT = "deduct"  # Using items for cooking
    WASTE = "waste"  # Marking items as wasted
    ADJUST = "adjust"  # Manual inventory adjustment
    EXPIRE = "expire"  # Items removed due to expiration


class PantryItem(Base):
    __tablename__ = "pantry_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    item_name = Column(String(255), nullable=False)
    quantity = Column(Numeric(10, 2), nullable=True)
    unit = Column(String(50), nullable=True)
    category = Column(String(100), nullable=True)
    storage_location = Column(String(50), nullable=False, default="pantry")
    expiry_date = Column(Date, nullable=True)
    opened_date = Column(Date, nullable=True)
    minimum_quantity = Column(Numeric(10, 2), nullable=True)
    notes = Column(Text, nullable=True)

    # Source tracking - link to original grocery item if moved from groceries
    source_grocery_id = Column(UUID(as_uuid=True), ForeignKey("groceries.id", ondelete="SET NULL"), nullable=True)

    # Status fields
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Waste tracking fields
    is_wasted = Column(Boolean, default=False)
    wasted_at = Column(DateTime, nullable=True)
    waste_reason = Column(String(50), nullable=True)
    waste_notes = Column(String(500), nullable=True)

    # Relationships
    user = relationship("User", back_populates="pantry_items")
    transactions = relationship("PantryTransaction", back_populates="pantry_item", cascade="all, delete-orphan")
    source_grocery = relationship("Grocery", back_populates="pantry_items", foreign_keys=[source_grocery_id])


class PantryTransaction(Base):
    """Tracks all changes to pantry inventory (like AccountTransaction in wealth-vault).

    This model records every addition, deduction, waste event, or adjustment
    to pantry items, enabling full inventory audit trail and analytics.
    """
    __tablename__ = "pantry_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    pantry_item_id = Column(UUID(as_uuid=True), ForeignKey("pantry_items.id", ondelete="CASCADE"), nullable=False)

    # Transaction details
    transaction_type = Column(String(20), nullable=False)  # add, deduct, waste, adjust, expire
    quantity_change = Column(Numeric(10, 2), nullable=False)  # Positive for add, negative for deduct
    quantity_before = Column(Numeric(10, 2), nullable=False)
    quantity_after = Column(Numeric(10, 2), nullable=False)
    unit = Column(String(50), nullable=True)

    # Source tracking (like wealth-vault's source_type/source_id)
    source_type = Column(String(50), nullable=True)  # 'grocery', 'meal', 'manual', 'waste', 'expiry'
    source_id = Column(UUID(as_uuid=True), nullable=True)  # ID of grocery/meal/etc.

    # Metadata
    notes = Column(String(500), nullable=True)
    transaction_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="pantry_transactions")
    pantry_item = relationship("PantryItem", back_populates="transactions")
