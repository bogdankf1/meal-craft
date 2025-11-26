import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Date, Numeric, Integer, Text, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    cuisine_type = Column(String(100), nullable=True)
    price_level = Column(Integer, nullable=True)  # 1-4 ($, $$, $$$, $$$$)
    location = Column(Text, nullable=True)
    rating = Column(Integer, nullable=True)  # 1-5 stars
    notes = Column(Text, nullable=True)
    favorite_dishes = Column(ARRAY(String), nullable=True)
    image_url = Column(String, nullable=True)
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="restaurants")
    orders = relationship("RestaurantOrder", back_populates="restaurant")


class RestaurantOrder(Base):
    __tablename__ = "restaurant_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    restaurant_id = Column(UUID(as_uuid=True), ForeignKey("restaurants.id", ondelete="SET NULL"), nullable=True)
    restaurant_name = Column(String(255), nullable=False)  # denormalized
    order_date = Column(Date, nullable=False)
    items_ordered = Column(ARRAY(String), nullable=True)
    cost = Column(Numeric(10, 2), nullable=True)
    order_type = Column(String(20), nullable=True)  # dine_in, delivery, takeout
    rating = Column(Integer, nullable=True)  # 1-5 stars
    notes = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="restaurant_orders")
    restaurant = relationship("Restaurant", back_populates="orders")
