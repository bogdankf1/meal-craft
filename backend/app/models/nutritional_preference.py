"""Nutritional Preference Model - Diet types and preferences per profile."""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship

from app.core.database import Base


class NutritionalPreference(Base):
    """Model for nutritional preferences per profile."""

    __tablename__ = "nutritional_preferences"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, unique=True)

    # Diet type (single selection)
    # Options: omnivore, vegetarian, vegan, pescatarian, keto, paleo, mediterranean, flexitarian
    diet_type = Column(String(30), nullable=False, default="omnivore")

    # Nutritional goals (multi-select) - stored as array
    # Options: high_protein, low_carb, low_fat, low_sodium, high_fiber, low_sugar, calorie_conscious
    goals = Column(ARRAY(String), nullable=False, default=[])

    # Meal preferences (multi-select) - stored as array
    # Options: whole_foods, avoid_processed, budget_friendly, quick_meals, meal_prep, kid_friendly
    preferences = Column(ARRAY(String), nullable=False, default=[])

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    profile = relationship("Profile", back_populates="nutritional_preference")

    def __repr__(self):
        return f"<NutritionalPreference {self.diet_type} for profile {self.profile_id}>"
