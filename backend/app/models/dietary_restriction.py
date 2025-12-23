"""Dietary Restriction Model - Allergies and dislikes per profile."""

import uuid
from datetime import datetime
import enum

from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class RestrictionType(str, enum.Enum):
    """Type of dietary restriction."""
    ALLERGY = "allergy"  # Serious - must never include
    DISLIKE = "dislike"  # Preference - avoid if possible


class DietaryRestriction(Base):
    """Model for dietary restrictions (allergies and dislikes) per profile."""

    __tablename__ = "dietary_restrictions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id = Column(UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)

    # Restriction details
    ingredient_name = Column(String(100), nullable=False)  # e.g., "peanuts", "shellfish", "mushrooms"
    restriction_type = Column(String(20), nullable=False)  # 'allergy' or 'dislike'
    notes = Column(String(500), nullable=True)  # Optional notes like "mild allergy" or "texture issue"

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    profile = relationship("Profile", back_populates="dietary_restrictions")

    def __repr__(self):
        return f"<DietaryRestriction {self.ingredient_name} ({self.restriction_type}) for profile {self.profile_id}>"
