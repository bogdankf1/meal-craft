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
    source_grocery_id = Column(UUID(as_uuid=True), nullable=True)

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
