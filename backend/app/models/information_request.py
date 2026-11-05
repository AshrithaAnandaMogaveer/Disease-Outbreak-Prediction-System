from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class InformationRequestStatus(str, enum.Enum):
    PENDING = "pending"
    RAG_ANSWERED = "rag_answered"
    AWAITING_ADMIN = "awaiting_admin"
    ADMIN_REPLIED = "admin_replied"
    CLOSED = "closed"


class InformationRequest(Base):
    __tablename__ = "information_requests"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    topic = Column(String, nullable=True)
    question = Column(Text, nullable=False)
    related_outbreak_id = Column(String, ForeignKey("published_outbreak_records.id"), nullable=True)

    # RAG response (auto-populated)
    rag_answer = Column(Text, nullable=True)
    rag_sources = Column(Text, nullable=True)  # JSON string
    rag_grounded = Column(String, nullable=True)  # "true" | "false"

    # Admin response
    admin_reply = Column(Text, nullable=True)
    admin_id = Column(String, ForeignKey("users.id"), nullable=True)
    admin_replied_at = Column(DateTime, nullable=True)

    status = Column(String, default=InformationRequestStatus.PENDING.value, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="information_requests")
    admin = relationship("User", foreign_keys=[admin_id], back_populates="answered_information_requests")
    related_outbreak = relationship("PublishedOutbreakRecord", foreign_keys=[related_outbreak_id])
