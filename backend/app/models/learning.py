import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Integer, Text, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Technique(Base):
    __tablename__ = "techniques"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)  # knife_skills, cooking_methods, sauces, baking, advanced
    description = Column(Text, nullable=True)
    difficulty = Column(String(20), nullable=True)  # beginner, intermediate, advanced
    video_url = Column(String, nullable=True)
    instructions = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user_progress = relationship("UserTechniqueProgress", back_populates="technique")


class UserTechniqueProgress(Base):
    __tablename__ = "user_technique_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    technique_id = Column(UUID(as_uuid=True), ForeignKey("techniques.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), nullable=True)  # learning, practicing, mastered
    progress_percent = Column(Integer, default=0)
    times_practiced = Column(Integer, default=0)
    mastered_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="technique_progress")
    technique = relationship("Technique", back_populates="user_progress")


class UserNote(Base):
    __tablename__ = "user_notes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    tags = Column(ARRAY(String), nullable=True)
    category = Column(String(100), nullable=True)  # technique, recipe_modification, tip, discovery
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notes")
