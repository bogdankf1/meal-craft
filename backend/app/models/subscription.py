import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import Column, String, DateTime, Enum, Boolean, ForeignKey, Integer, Numeric, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class SubscriptionStatus(str, PyEnum):
    ACTIVE = "active"
    CANCELED = "canceled"
    PAST_DUE = "past_due"
    TRIALING = "trialing"


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    tier = Column(String(20), nullable=False)
    status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.ACTIVE)
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    cancel_at_period_end = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="subscription")


class Tier(Base):
    __tablename__ = "tiers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), unique=True, nullable=False)
    display_name = Column(String(100), nullable=False)
    price_monthly = Column(Numeric(10, 2), nullable=True)
    features = Column(JSON, nullable=True)  # {"meal_plans_per_month": 5, "max_saved_recipes": 20}
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    tier_features = relationship("TierFeature", back_populates="tier")


class Feature(Base):
    __tablename__ = "features"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    key = Column(String(100), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    tier_features = relationship("TierFeature", back_populates="feature")


class TierFeature(Base):
    __tablename__ = "tier_features"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tier_id = Column(UUID(as_uuid=True), ForeignKey("tiers.id", ondelete="CASCADE"), nullable=False)
    feature_id = Column(UUID(as_uuid=True), ForeignKey("features.id", ondelete="CASCADE"), nullable=False)
    enabled = Column(Boolean, default=True)
    limit_value = Column(Integer, nullable=True)  # NULL = unlimited
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    tier = relationship("Tier", back_populates="tier_features")
    feature = relationship("Feature", back_populates="tier_features")


class UsageTracking(Base):
    __tablename__ = "usage_tracking"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    meal_plans_generated = Column(Integer, default=0)
    recipes_saved = Column(Integer, default=0)
    ai_generations_used = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="usage_tracking")
