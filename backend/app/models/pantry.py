import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Date, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class StorageLocation(str, PyEnum):
    PANTRY = "pantry"
    FRIDGE = "fridge"
    FREEZER = "freezer"
    SPICE_RACK = "spice_rack"


class PantryInventory(Base):
    __tablename__ = "pantry_inventory"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    item_name = Column(String(255), nullable=False)
    quantity = Column(Numeric(10, 2), nullable=True)
    unit = Column(String(50), nullable=True)
    category = Column(String(100), nullable=True)
    storage_location = Column(String(50), nullable=True)
    purchase_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    freeze_date = Column(Date, nullable=True)
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="pantry_items")
