from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class OutbreakReportStatus(str, enum.Enum):
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    NEEDS_INFORMATION = "needs_information"
    APPROVED = "approved"
    REJECTED = "rejected"


class OutbreakReport(Base):
    __tablename__ = "outbreak_reports"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    submitter_id = Column(String, ForeignKey("users.id"), nullable=False)
    disease_name = Column(String, nullable=False)
    state = Column(String, nullable=False)
    district = Column(String, nullable=True)
    locality = Column(String, nullable=True)
    observation_date = Column(DateTime, nullable=True)
    description = Column(Text, nullable=False)
    reported_cases = Column(Integer, nullable=True)
    source_reference = Column(String, nullable=True)
    status = Column(String, default=OutbreakReportStatus.PENDING.value, nullable=False)
    review_notes = Column(Text, nullable=True)
    decision_reason = Column(Text, nullable=True)
    reviewer_id = Column(String, ForeignKey("users.id"), nullable=True)
    published_record_id = Column(String, ForeignKey("published_outbreak_records.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    submitter = relationship("User", foreign_keys=[submitter_id], back_populates="submitted_reports")
    reviewer = relationship("User", foreign_keys=[reviewer_id], back_populates="reviewed_reports")
    published_record = relationship("PublishedOutbreakRecord", back_populates="source_report")
