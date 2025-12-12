import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Date, Numeric, Integer, Text, ARRAY, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Restaurant(Base):
    """Restaurant/place entity - stores frequently visited restaurants."""
    __tablename__ = "restaurants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    cuisine_type = Column(String(100), nullable=True)
    location = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    favorite_dishes = Column(ARRAY(String), nullable=True)
    image_url = Column(String, nullable=True)
    is_favorite = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="restaurants")
    meals = relationship("RestaurantMeal", back_populates="restaurant")


class RestaurantMeal(Base):
    """Individual meal eaten at a restaurant or ordered from delivery/takeout."""
    __tablename__ = "restaurant_meals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    restaurant_id = Column(UUID(as_uuid=True), ForeignKey("restaurants.id", ondelete="SET NULL"), nullable=True)

    # Restaurant info (denormalized for when restaurant_id is null)
    restaurant_name = Column(String(255), nullable=False)

    # Meal details
    meal_date = Column(Date, nullable=False)
    meal_time = Column(Time, nullable=True)
    meal_type = Column(String(20), nullable=False)  # breakfast, lunch, dinner, snack
    order_type = Column(String(20), nullable=False, default="dine_in")  # dine_in, delivery, takeout

    # What was eaten
    items_ordered = Column(ARRAY(String), nullable=True)
    description = Column(Text, nullable=True)  # Free text description of the meal

    # Nutrition tracking (optional estimates)
    estimated_calories = Column(Integer, nullable=True)

    # Health/feeling tracking
    rating = Column(Integer, nullable=True)  # 1-5 how good was it
    feeling_after = Column(Integer, nullable=True)  # 1-5 how you felt after eating

    # Metadata
    tags = Column(ARRAY(String), nullable=True)  # healthy, cheat_meal, business, date_night, etc.
    notes = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)

    # Import source tracking
    import_source = Column(String(50), nullable=True)  # manual, text, voice, photo, receipt, screenshot

    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="restaurant_meals")
    restaurant = relationship("Restaurant", back_populates="meals")
