"""Seasonality Models - Local & Seasonal Produce Guide"""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Integer, Text, ARRAY
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


class SeasonalProduce(Base):
    """Model for seasonal produce information by country/region."""

    __tablename__ = "seasonal_produce"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Basic Information
    name = Column(String(255), nullable=False)
    name_local = Column(String(255), nullable=True)  # Name in local language
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False)  # vegetables, fruits, herbs, seafood, mushrooms

    # Location
    country_code = Column(String(3), nullable=False)  # ISO 3166-1 alpha-2 (UA, BR, US, PL)
    region = Column(String(100), nullable=True)  # Optional: specific region within country

    # Seasonality (months 1-12)
    available_months = Column(ARRAY(Integer), nullable=False)  # e.g., [5, 6, 7, 8, 9]
    peak_months = Column(ARRAY(Integer), nullable=True)  # Best months, subset of available

    # Additional Info
    storage_tips = Column(Text, nullable=True)
    nutrition_highlights = Column(Text, nullable=True)
    culinary_uses = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)

    # Status
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<SeasonalProduce {self.name} ({self.country_code})>"


class LocalSpecialty(Base):
    """Model for country-specific local specialties and traditional dishes."""

    __tablename__ = "local_specialties"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Basic Information
    name = Column(String(255), nullable=False)
    name_local = Column(String(255), nullable=True)  # Name in local language
    description = Column(Text, nullable=True)
    specialty_type = Column(String(50), nullable=False)  # ingredient, dish, technique, product

    # Location
    country_code = Column(String(3), nullable=False)
    region = Column(String(100), nullable=True)

    # Content
    cultural_info = Column(Text, nullable=True)  # Historical/cultural significance
    how_to_use = Column(Text, nullable=True)  # How to use in cooking
    where_to_find = Column(Text, nullable=True)  # Where to buy/find
    related_dishes = Column(ARRAY(String), nullable=True)  # Traditional dishes using this
    seasonal_availability = Column(ARRAY(Integer), nullable=True)  # If seasonal

    # Media
    image_url = Column(String(500), nullable=True)

    # Status
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<LocalSpecialty {self.name} ({self.country_code})>"


class UserSeasonalPreference(Base):
    """Model for user's seasonality preferences (location, favorites)."""

    __tablename__ = "user_seasonal_preferences"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)

    # Location Settings
    country_code = Column(String(3), nullable=True)  # User's selected country
    region = Column(String(100), nullable=True)  # Optional: specific region

    # Preferences
    favorite_produce_ids = Column(ARRAY(UUID(as_uuid=True)), nullable=True)  # Favorite seasonal items
    notification_enabled = Column(Boolean, default=False)  # Notify when favorites are in season

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="seasonal_preferences")

    def __repr__(self):
        return f"<UserSeasonalPreference user={self.user_id}>"
