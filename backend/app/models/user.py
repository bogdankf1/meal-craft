import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Column, String, DateTime, Enum, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class UserRole(str, PyEnum):
    USER = "USER"
    ADMIN = "ADMIN"


class SubscriptionTier(str, PyEnum):
    FREE = "FREE"
    PLUS = "PLUS"
    PRO = "PRO"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255))
    google_id = Column(String(255), unique=True, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    subscription_tier = Column(
        Enum(SubscriptionTier),
        default=SubscriptionTier.FREE,
        nullable=False
    )
    avatar_url = Column(String, nullable=True)
    locale = Column(String(5), default="en")
    is_active = Column(Boolean, default=True)

    # Stripe fields
    stripe_customer_id = Column(String(255), unique=True, nullable=True, index=True)
    stripe_subscription_id = Column(String(255), unique=True, nullable=True, index=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    subscription = relationship("Subscription", back_populates="user", uselist=False)
    recipes = relationship("Recipe", back_populates="user")
    meal_plans = relationship("MealPlan", back_populates="user")
    shopping_lists = relationship("ShoppingList", back_populates="user")
    groceries = relationship("Grocery", back_populates="user")
    pantry_items = relationship("PantryItem", back_populates="user")
    restaurants = relationship("Restaurant", back_populates="user")
    restaurant_meals = relationship("RestaurantMeal", back_populates="user")
    nutrition_goals = relationship("NutritionGoal", back_populates="user")
    nutrition_logs = relationship("NutritionLog", back_populates="user")
    health_metrics = relationship("HealthMetric", back_populates="user")
    user_skills = relationship("UserSkill", back_populates="user")
    learning_paths = relationship("UserLearningPath", back_populates="user")
    skill_practice_logs = relationship("SkillPracticeLog", back_populates="user")
    notes = relationship("UserNote", back_populates="user")
    usage_tracking = relationship("UsageTracking", back_populates="user")
    saved_recipes = relationship("SavedRecipe", back_populates="user")
    kitchen_equipment = relationship("KitchenEquipment", back_populates="user")
    cooking_history = relationship("CookingHistory", backref="user")
    recipe_collections = relationship("RecipeCollection", backref="user")
    seasonal_preferences = relationship("UserSeasonalPreference", back_populates="user", uselist=False)
    backups = relationship("Backup", back_populates="user")
    support_topics = relationship("SupportTopic", back_populates="user")
    support_messages = relationship("SupportMessage", back_populates="user")
