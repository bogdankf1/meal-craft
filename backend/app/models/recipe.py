import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Column, String, DateTime, Integer, Boolean, ForeignKey, Text, Numeric, ARRAY, Table
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


class RecipeDifficulty(str, PyEnum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class RecipeCategory(str, PyEnum):
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    DESSERT = "dessert"
    SNACK = "snack"
    APPETIZER = "appetizer"
    SIDE = "side"
    BEVERAGE = "beverage"
    OTHER = "other"


# Many-to-many association table for recipes and collections
recipe_collection_association = Table(
    "recipe_collection_items",
    Base.metadata,
    Column("recipe_id", UUID(as_uuid=True), ForeignKey("recipes.id", ondelete="CASCADE"), primary_key=True),
    Column("collection_id", UUID(as_uuid=True), ForeignKey("recipe_collections.id", ondelete="CASCADE"), primary_key=True),
    Column("added_at", DateTime, default=datetime.utcnow),
)


class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Category (fixed enum) and Cuisine (flexible string)
    category = Column(String(50), nullable=True)  # breakfast, lunch, dinner, etc.
    cuisine_type = Column(String(100), nullable=True)  # Italian, Mexican, Asian, etc.

    dietary_restrictions = Column(ARRAY(String), nullable=True)
    tags = Column(ARRAY(String), nullable=True)  # quick, healthy, kid-friendly, meal-prep

    prep_time = Column(Integer, nullable=True)  # minutes
    cook_time = Column(Integer, nullable=True)  # minutes
    servings = Column(Integer, default=2)
    difficulty = Column(String(20), nullable=True)

    # Instructions stored as JSONB array of steps
    instructions = Column(Text, nullable=False)  # Can be plain text or JSON array
    instructions_json = Column(JSONB, nullable=True)  # Structured steps: [{step: 1, text: "..."}]

    # Source information
    source = Column(String(500), nullable=True)  # URL or text like "Grandma's cookbook"
    source_url = Column(String(1000), nullable=True)  # Original URL if imported from web

    image_url = Column(String, nullable=True)
    is_public = Column(Boolean, default=False)
    is_ai_generated = Column(Boolean, default=False)
    is_favorite = Column(Boolean, default=False)
    rating = Column(Integer, nullable=True)  # 1-5
    times_cooked = Column(Integer, default=0)
    is_archived = Column(Boolean, default=False)

    # Notes for tips, variations, etc.
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="recipes")
    ingredients = relationship("RecipeIngredient", back_populates="recipe", cascade="all, delete-orphan")
    nutrition = relationship("RecipeNutrition", back_populates="recipe", uselist=False, cascade="all, delete-orphan")
    saved_by = relationship("SavedRecipe", back_populates="recipe")
    meals = relationship("Meal", back_populates="recipe")
    cooking_history = relationship("CookingHistory", back_populates="recipe", cascade="all, delete-orphan")
    collections = relationship("RecipeCollection", secondary=recipe_collection_association, back_populates="recipes")

    @property
    def total_time(self) -> int | None:
        """Calculate total time (prep + cook)."""
        if self.prep_time is None and self.cook_time is None:
            return None
        return (self.prep_time or 0) + (self.cook_time or 0)

    @property
    def last_cooked(self) -> datetime | None:
        """Get the most recent cooking date."""
        if not self.cooking_history:
            return None
        return max(h.cooked_at for h in self.cooking_history)

    @property
    def collection_ids(self) -> list:
        """Get list of collection IDs this recipe belongs to."""
        if not self.collections:
            return []
        return [c.id for c in self.collections]


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


class CookingHistory(Base):
    """Track when a recipe was cooked."""
    __tablename__ = "cooking_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    recipe_id = Column(UUID(as_uuid=True), ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False)

    cooked_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    servings_made = Column(Integer, nullable=True)  # How many servings were actually made
    notes = Column(Text, nullable=True)  # Notes about this cooking session
    rating = Column(Integer, nullable=True)  # Rating for this specific cooking (1-5)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    recipe = relationship("Recipe", back_populates="cooking_history")


class RecipeCollection(Base):
    """User-created recipe collections/folders."""
    __tablename__ = "recipe_collections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(20), nullable=True)  # For UI display (hex color or preset name)
    icon = Column(String(50), nullable=True)  # Icon identifier for UI

    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    recipes = relationship("Recipe", secondary=recipe_collection_association, back_populates="collections")

    @property
    def recipe_count(self) -> int:
        """Count of recipes in this collection."""
        return len(self.recipes) if self.recipes else 0
