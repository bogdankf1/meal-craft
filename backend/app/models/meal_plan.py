import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Column, String, DateTime, Integer, Boolean, ForeignKey, Text, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class MealType(str, PyEnum):
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    SNACK = "snack"


class MealPlan(Base):
    __tablename__ = "meal_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    date_start = Column(Date, nullable=False)
    date_end = Column(Date, nullable=False)
    servings = Column(Integer, default=2)
    is_template = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="meal_plans")
    meals = relationship("Meal", back_populates="meal_plan", cascade="all, delete-orphan")
    shopping_lists = relationship("ShoppingList", back_populates="meal_plan")


class Meal(Base):
    __tablename__ = "meals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meal_plan_id = Column(UUID(as_uuid=True), ForeignKey("meal_plans.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    meal_type = Column(String(20), nullable=False)
    recipe_id = Column(UUID(as_uuid=True), ForeignKey("recipes.id", ondelete="SET NULL"), nullable=True)
    custom_name = Column(String(255), nullable=True)  # For non-recipe meals (leftovers, eating out, etc.)
    servings = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    is_leftover = Column(Boolean, default=False)
    leftover_from_meal_id = Column(UUID(as_uuid=True), ForeignKey("meals.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    meal_plan = relationship("MealPlan", back_populates="meals")
    recipe = relationship("Recipe", back_populates="meals")
    leftover_from = relationship("Meal", remote_side=[id], foreign_keys=[leftover_from_meal_id])
    nutrition_logs = relationship("NutritionLog", back_populates="meal")
