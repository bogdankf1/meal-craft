import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Date, Numeric, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class NutritionGoal(Base):
    __tablename__ = "nutrition_goals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    daily_calories = Column(Integer, nullable=True)
    daily_protein_g = Column(Integer, nullable=True)
    daily_carbs_g = Column(Integer, nullable=True)
    daily_fat_g = Column(Integer, nullable=True)
    daily_fiber_g = Column(Integer, nullable=True)
    daily_sugar_g = Column(Integer, nullable=True)
    daily_sodium_mg = Column(Integer, nullable=True)
    goal_type = Column(String(50), nullable=True)  # weight_loss, muscle_gain, maintenance, custom
    start_date = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="nutrition_goals")


class NutritionLog(Base):
    """Custom nutrition log entry for items not in Meal Planner or Restaurants."""
    __tablename__ = "nutrition_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    meal_type = Column(String(20), nullable=True)  # breakfast, lunch, dinner, snack
    # Link to meal plan meal (optional)
    meal_id = Column(UUID(as_uuid=True), ForeignKey("meals.id", ondelete="SET NULL"), nullable=True)
    # Link to restaurant meal (optional)
    restaurant_meal_id = Column(UUID(as_uuid=True), ForeignKey("restaurant_meals.id", ondelete="SET NULL"), nullable=True)
    # For standalone custom entries
    name = Column(String(255), nullable=True)  # e.g., "Apple", "Protein shake"
    manual_entry = Column(Boolean, default=False)
    # Nutrition values
    calories = Column(Integer, nullable=True)
    protein_g = Column(Numeric(10, 1), nullable=True)
    carbs_g = Column(Numeric(10, 1), nullable=True)
    fat_g = Column(Numeric(10, 1), nullable=True)
    fiber_g = Column(Numeric(10, 1), nullable=True)
    sugar_g = Column(Numeric(10, 1), nullable=True)
    sodium_mg = Column(Numeric(10, 1), nullable=True)
    notes = Column(Text, nullable=True)
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="nutrition_logs")
    meal = relationship("Meal", back_populates="nutrition_logs")
    restaurant_meal = relationship("RestaurantMeal", back_populates="nutrition_logs")


class HealthMetric(Base):
    __tablename__ = "health_metrics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    weight_kg = Column(Numeric(5, 2), nullable=True)
    body_fat_percent = Column(Numeric(4, 1), nullable=True)
    steps = Column(Integer, nullable=True)
    active_calories = Column(Integer, nullable=True)
    sleep_hours = Column(Numeric(3, 1), nullable=True)
    heart_rate_avg = Column(Integer, nullable=True)
    source = Column(String(50), nullable=True)  # manual, apple_health, google_fit
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="health_metrics")
