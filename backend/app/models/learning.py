"""Learning & Skills Models"""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Integer, Text, ARRAY, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


# Association table for learning path skills (ordered)
learning_path_skills = Table(
    "learning_path_skills",
    Base.metadata,
    Column("learning_path_id", UUID(as_uuid=True), ForeignKey("learning_paths.id", ondelete="CASCADE"), primary_key=True),
    Column("skill_id", UUID(as_uuid=True), ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True),
    Column("order", Integer, nullable=False, default=0),
)


class Skill(Base):
    """Model for cooking skills/techniques library."""

    __tablename__ = "skills"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Basic Information
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)  # knife_skills, cooking_methods, baking, sauces, preservation, plating, temperature_control
    difficulty = Column(String(20), nullable=True)  # beginner, intermediate, advanced

    # Learning Resources
    video_url = Column(String(500), nullable=True)
    instructions = Column(Text, nullable=True)
    tips = Column(Text, nullable=True)

    # Metadata
    estimated_learning_hours = Column(Integer, nullable=True)  # Estimated time to learn
    prerequisites = Column(ARRAY(UUID(as_uuid=True)), nullable=True)  # IDs of prerequisite skills
    related_cuisines = Column(ARRAY(String), nullable=True)  # e.g., ["french", "japanese"]

    # Status
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user_skills = relationship("UserSkill", back_populates="skill", cascade="all, delete-orphan")
    practice_logs = relationship("SkillPracticeLog", back_populates="skill", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Skill {self.name}>"


class UserSkill(Base):
    """Model for tracking user's skills/techniques."""

    __tablename__ = "user_skills"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    skill_id = Column(UUID(as_uuid=True), ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)

    # Progress Tracking
    proficiency_level = Column(String(20), nullable=True, default="beginner")  # beginner, intermediate, advanced, mastered
    status = Column(String(20), nullable=True, default="learning")  # want_to_learn, learning, practicing, mastered
    progress_percent = Column(Integer, default=0)  # 0-100

    # Practice Stats
    times_practiced = Column(Integer, default=0)
    total_practice_minutes = Column(Integer, default=0)

    # User Preferences
    is_favorite = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)

    # Timestamps
    started_at = Column(DateTime, default=datetime.utcnow)
    last_practiced_at = Column(DateTime, nullable=True)
    mastered_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="user_skills")
    skill = relationship("Skill", back_populates="user_skills")

    def __repr__(self):
        return f"<UserSkill {self.user_id} - {self.skill_id}>"


class LearningPath(Base):
    """Model for structured learning paths."""

    __tablename__ = "learning_paths"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Basic Information
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)  # fundamentals, cuisine_specific, advanced_techniques
    difficulty = Column(String(20), nullable=True)  # beginner, intermediate, advanced

    # Metadata
    estimated_hours = Column(Integer, nullable=True)
    skill_count = Column(Integer, default=0)
    image_url = Column(String(500), nullable=True)

    # Status
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user_paths = relationship("UserLearningPath", back_populates="learning_path", cascade="all, delete-orphan")
    skills = relationship("Skill", secondary=learning_path_skills, backref="learning_paths")

    def __repr__(self):
        return f"<LearningPath {self.name}>"


class UserLearningPath(Base):
    """Model for tracking user's progress on learning paths."""

    __tablename__ = "user_learning_paths"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    learning_path_id = Column(UUID(as_uuid=True), ForeignKey("learning_paths.id", ondelete="CASCADE"), nullable=False)

    # Progress Tracking
    status = Column(String(20), nullable=True, default="not_started")  # not_started, in_progress, completed
    progress_percent = Column(Integer, default=0)  # 0-100
    skills_completed = Column(Integer, default=0)
    current_skill_index = Column(Integer, default=0)

    # Timestamps
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    last_activity_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="learning_paths")
    learning_path = relationship("LearningPath", back_populates="user_paths")

    def __repr__(self):
        return f"<UserLearningPath {self.user_id} - {self.learning_path_id}>"


class SkillPracticeLog(Base):
    """Model for tracking skill practice sessions."""

    __tablename__ = "skill_practice_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    skill_id = Column(UUID(as_uuid=True), ForeignKey("skills.id", ondelete="CASCADE"), nullable=False)

    # Practice Details
    duration_minutes = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    rating = Column(Integer, nullable=True)  # 1-5 self-assessment

    # Context
    recipe_id = Column(UUID(as_uuid=True), ForeignKey("recipes.id", ondelete="SET NULL"), nullable=True)

    # Timestamps
    practiced_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="skill_practice_logs")
    skill = relationship("Skill", back_populates="practice_logs")

    def __repr__(self):
        return f"<SkillPracticeLog {self.user_id} - {self.skill_id}>"


# Keep UserNote for backward compatibility (can be used for general notes)
class UserNote(Base):
    """Model for user's personal notes."""

    __tablename__ = "user_notes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Content
    title = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)

    # Organization
    tags = Column(ARRAY(String), nullable=True)
    category = Column(String(100), nullable=True)  # technique, recipe_modification, tip, discovery

    # References
    skill_id = Column(UUID(as_uuid=True), ForeignKey("skills.id", ondelete="SET NULL"), nullable=True)
    recipe_id = Column(UUID(as_uuid=True), ForeignKey("recipes.id", ondelete="SET NULL"), nullable=True)

    # Status
    is_archived = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notes")

    def __repr__(self):
        return f"<UserNote {self.title}>"
