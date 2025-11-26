import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Column, String, DateTime, Integer, Boolean, ForeignKey, Text, Numeric, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class RecipeDifficulty(str, PyEnum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    cuisine_type = Column(String(100), nullable=True)
    dietary_restrictions = Column(ARRAY(String), nullable=True)
    prep_time = Column(Integer, nullable=True)  # minutes
    cook_time = Column(Integer, nullable=True)  # minutes
    servings = Column(Integer, default=2)
    difficulty = Column(String(20), nullable=True)
    instructions = Column(Text, nullable=False)
    image_url = Column(String, nullable=True)
    is_public = Column(Boolean, default=False)
    is_ai_generated = Column(Boolean, default=False)
    rating = Column(Integer, nullable=True)  # 1-5
    times_cooked = Column(Integer, default=0)
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="recipes")
    ingredients = relationship("RecipeIngredient", back_populates="recipe", cascade="all, delete-orphan")
    nutrition = relationship("RecipeNutrition", back_populates="recipe", uselist=False, cascade="all, delete-orphan")
    saved_by = relationship("SavedRecipe", back_populates="recipe")
    meals = relationship("Meal", back_populates="recipe")


class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recipe_id = Column(UUID(as_uuid=True), ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False)
    ingredient_name = Column(String(255), nullable=False)
    quantity = Column(Numeric(10, 2), nullable=True)
    unit = Column(String(50), nullable=True)
    category = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    recipe = relationship("Recipe", back_populates="ingredients")


class RecipeNutrition(Base):
    __tablename__ = "recipe_nutrition"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recipe_id = Column(UUID(as_uuid=True), ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False)
    calories = Column(Integer, nullable=True)
    protein_g = Column(Numeric(10, 1), nullable=True)
    carbs_g = Column(Numeric(10, 1), nullable=True)
    fat_g = Column(Numeric(10, 1), nullable=True)
    fiber_g = Column(Numeric(10, 1), nullable=True)
    sugar_g = Column(Numeric(10, 1), nullable=True)
    sodium_mg = Column(Numeric(10, 1), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    recipe = relationship("Recipe", back_populates="nutrition")


class SavedRecipe(Base):
    __tablename__ = "saved_recipes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    recipe_id = Column(UUID(as_uuid=True), ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="saved_recipes")
    recipe = relationship("Recipe", back_populates="saved_by")
