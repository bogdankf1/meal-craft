"""
Database models for support/help center functionality.
"""
import uuid
import enum
from datetime import datetime

from sqlalchemy import Column, String, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class SupportTopicStatus(str, enum.Enum):
    """Support topic status enumeration."""
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"


class SupportTopic(Base):
    """Support topic (ticket) model."""
    __tablename__ = "support_topics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    status = Column(
        String(20),
        nullable=False,
        default=SupportTopicStatus.OPEN.value,
        server_default="open"
    )
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="support_topics")
    messages = relationship(
        "SupportMessage",
        back_populates="topic",
        cascade="all, delete-orphan",
        order_by="SupportMessage.created_at"
    )

    def __repr__(self) -> str:
        return f"<SupportTopic(id={self.id}, title={self.title}, status={self.status})>"


class SupportMessage(Base):
    """Support message model."""
    __tablename__ = "support_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    topic_id = Column(UUID(as_uuid=True), ForeignKey("support_topics.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    message = Column(Text, nullable=False)
    is_admin_reply = Column(Boolean, nullable=False, default=False, server_default="false")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    topic = relationship("SupportTopic", back_populates="messages")
    user = relationship("User", back_populates="support_messages")

    def __repr__(self) -> str:
        return f"<SupportMessage(id={self.id}, topic_id={self.topic_id}, is_admin_reply={self.is_admin_reply})>"
