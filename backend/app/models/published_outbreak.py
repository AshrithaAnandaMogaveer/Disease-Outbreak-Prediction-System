from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class PublishedOutbreakRecord(Base):
    __tablename__ = "published_outbreak_records"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    disease = Column(String, nullable=False)
    state = Column(String, nullable=False)
    district = Column(String, nullable=True)
    locality = Column(String, nullable=True)
    reported_cases = Column(Integer, nullable=True)
    active_cases = Column(Integer, nullable=True)
    recoveries = Column(Integer, nullable=True)
    deaths = Column(Integer, nullable=True)
    risk_level = Column(String, nullable=True)
    reporting_start = Column(DateTime, nullable=True)
    reporting_end = Column(DateTime, nullable=True)
    source_name = Column(String, nullable=False, default="Admin review")
    source_reference = Column(String, nullable=True)
    description = Column(Text, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    publication_status = Column(String, nullable=False, default="published")
    reviewer_id = Column(String, ForeignKey("users.id"), nullable=True)
    created_by_admin_id = Column(String, ForeignKey("users.id"), nullable=True)
    published_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    reviewer = relationship("User", foreign_keys=[reviewer_id], back_populates="reviewed_outbreaks")
    created_by_admin = relationship("User", foreign_keys=[created_by_admin_id], back_populates="created_outbreaks")
    source_report = relationship("OutbreakReport", back_populates="published_record", uselist=False)


class OutbreakAuditEvent(Base):
    __tablename__ = "outbreak_audit_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    report_id = Column(String, ForeignKey("outbreak_reports.id"), nullable=True)
    published_record_id = Column(String, ForeignKey("published_outbreak_records.id"), nullable=True)
    actor_user_id = Column(String, ForeignKey("users.id"), nullable=False)
    action = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    actor = relationship("User", foreign_keys=[actor_user_id], back_populates="audit_events")
