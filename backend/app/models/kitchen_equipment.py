"""Kitchen Equipment Model"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Date, Numeric, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class KitchenEquipment(Base):
    """Model for tracking kitchen equipment and appliances."""

    __tablename__ = "kitchen_equipment"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Basic Information
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)  # cookware, bakeware, appliances, etc.
    brand = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)

    # Condition & Status
    condition = Column(String(50), nullable=True, default="good")  # excellent, good, fair, needs_repair, replace_soon
    location = Column(String(100), nullable=True, default="kitchen")  # kitchen_drawer, cabinet, countertop, pantry, storage

    # Purchase Information
    purchase_date = Column(Date, nullable=True)
    purchase_price = Column(Numeric(10, 2), nullable=True)

    # Maintenance Tracking
    last_maintenance_date = Column(Date, nullable=True)
    maintenance_interval_days = Column(Integer, nullable=True)  # e.g., 90 for "sharpen knives every 3 months"
    maintenance_notes = Column(Text, nullable=True)

    # Additional Fields
    notes = Column(Text, nullable=True)

    # Status Flags
    is_archived = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="kitchen_equipment")

    def __repr__(self):
        return f"<KitchenEquipment {self.name}>"

    @property
    def needs_maintenance(self) -> bool:
        """Check if equipment needs maintenance based on interval."""
        if not self.maintenance_interval_days or not self.last_maintenance_date:
            return False

        days_since_maintenance = (datetime.utcnow().date() - self.last_maintenance_date).days
        return days_since_maintenance >= self.maintenance_interval_days

    @property
    def days_until_maintenance(self) -> int | None:
        """Calculate days until next maintenance is due."""
        if not self.maintenance_interval_days or not self.last_maintenance_date:
            return None

        days_since_maintenance = (datetime.utcnow().date() - self.last_maintenance_date).days
        return max(0, self.maintenance_interval_days - days_since_maintenance)
