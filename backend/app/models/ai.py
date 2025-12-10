"""
AI Module Models
Models for AI text parsing history and corrections
"""
from sqlalchemy import Column, String, DateTime, Boolean, Text, Integer, ForeignKey, Float
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class TextParsingHistory(Base):
    """Model for tracking AI text parsing sessions"""
    __tablename__ = "text_parsing_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    input_text = Column(Text, nullable=False)
    parsed_items = Column(JSONB, nullable=False, default=list)  # List of parsed grocery items
    items_count = Column(Integer, nullable=False, default=0)
    parsing_type = Column(String(50), nullable=False, default="grocery")  # grocery, recipe, shopping_list
    status = Column(String(50), nullable=False, default="completed")  # completed, partial, failed
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class CategoryCorrection(Base):
    """Model for tracking user corrections to AI categorization (learning)"""
    __tablename__ = "category_corrections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    item_name = Column(String(255), nullable=False, index=True)
    correct_category = Column(String(100), nullable=False)
    original_category = Column(String(100), nullable=True)
    corrected_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AIInsight(Base):
    """Model for caching generated AI insights (food waste, spending, etc.)"""
    __tablename__ = "ai_insights"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    insight_type = Column(String(50), nullable=False)  # expiry_alert, spending_pattern, waste_reduction, meal_suggestion
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    priority = Column(Integer, nullable=False, default=1)  # 1-5, higher is more important
    is_actionable = Column(Boolean, nullable=False, default=False)
    action_url = Column(String(255), nullable=True)
    is_dismissed = Column(Boolean, nullable=False, default=False)
    generated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
