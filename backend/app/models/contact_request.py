from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class ContactRequestStatus(str, enum.Enum):
    NEW = "new"
    REVIEWED = "reviewed"
    RESOLVED = "resolved"


class ContactRequestCategory(str, enum.Enum):
    GENERAL_FEEDBACK = "general_feedback"
    INCORRECT_INFORMATION = "incorrect_information"
    DATA_CORRECTION = "data_correction"
    TECHNICAL_ISSUE = "technical_issue"
    ADMINISTRATIVE = "administrative"
    OTHER = "other"


class ContactRequest(Base):
    __tablename__ = "contact_requests"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=True)  # nullable for unauthenticated

    # Submission fields
    category = Column(String, nullable=False, default=ContactRequestCategory.GENERAL_FEEDBACK.value)
    subject = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    related_report_ref = Column(String, nullable=True)  # free-text reference

    # Submitter identity (stored separately to support unauthenticated use)
    submitter_name = Column(String, nullable=True)
    submitter_email = Column(String, nullable=True)

    # Admin response
    admin_notes = Column(Text, nullable=True)
    admin_id = Column(String, ForeignKey("users.id"), nullable=True)
    admin_reviewed_at = Column(DateTime, nullable=True)

    status = Column(String, default=ContactRequestStatus.NEW.value, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="contact_requests")
    admin = relationship("User", foreign_keys=[admin_id], back_populates="reviewed_contact_requests")
