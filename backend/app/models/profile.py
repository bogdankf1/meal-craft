"""Profile Model - Household members for meal planning and nutrition tracking."""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Profile(Base):
    """Model for household member profiles."""

    __tablename__ = "profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Profile info
    name = Column(String(100), nullable=False)
    color = Column(String(7), nullable=True, default="#3B82F6")  # Hex color for UI
    avatar_url = Column(String(500), nullable=True)

    # Flags
    is_default = Column(Boolean, default=False)  # Primary profile for the account
    is_archived = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="profiles")
    meal_plans = relationship("MealPlan", back_populates="profile", cascade="all, delete-orphan")
    nutrition_goals = relationship("NutritionGoal", back_populates="profile", cascade="all, delete-orphan")
    nutrition_logs = relationship("NutritionLog", back_populates="profile", cascade="all, delete-orphan")
    health_metrics = relationship("HealthMetric", back_populates="profile", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Profile {self.name} (user_id={self.user_id})>"
