"""
Anomaly alert system — two tables:

1. AnomalyAlert       — one record per admin-issued alert.
2. UserNotification   — one record per (alert × recipient) pair.
                        Stores independent read/acknowledged state per user.
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class AlertSeverity(str, enum.Enum):
    LOW      = "low"
    MEDIUM   = "medium"
    HIGH     = "high"
    CRITICAL = "critical"


class AlertStatus(str, enum.Enum):
    DRAFT    = "draft"
    SENT     = "sent"
    RECALLED = "recalled"   # future: allow admin to retract


class AnomalyAlert(Base):
    """Admin-created alert record.  One row = one alert broadcast."""
    __tablename__ = "anomaly_alerts"

    id            = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    created_by_id = Column(String, ForeignKey("users.id"), nullable=False)

    # Content
    title         = Column(String, nullable=False)
    disease       = Column(String, nullable=True)
    affected_state= Column(String, nullable=True)
    affected_district = Column(String, nullable=True)
    severity      = Column(String, default=AlertSeverity.MEDIUM.value, nullable=False)
    message       = Column(Text, nullable=False)

    # Evidence / context
    observation_window  = Column(String, nullable=True)   # e.g. "2026-05-01 – 2026-05-09"
    baseline_comparison = Column(Text,   nullable=True)
    observed_values     = Column(Text,   nullable=True)
    detection_method    = Column(String, nullable=True)   # e.g. "threshold: weekly_change>30%"

    # Links
    related_outbreak_id  = Column(String, ForeignKey("published_outbreak_records.id"), nullable=True)
    related_prediction_id = Column(String, nullable=True)

    # Targeting
    target_audience = Column(String, default="all", nullable=False)  # "all" | "state:<name>"

    # Lifecycle
    status      = Column(String, default=AlertStatus.DRAFT.value, nullable=False)
    sent_at     = Column(DateTime, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    created_by       = relationship("User", foreign_keys=[created_by_id],
                                    back_populates="created_alerts")
    notifications    = relationship("UserNotification", back_populates="alert",
                                    cascade="all, delete-orphan")
    related_outbreak = relationship("PublishedOutbreakRecord",
                                    foreign_keys=[related_outbreak_id])


class UserNotification(Base):
    """Per-user delivery record for an AnomalyAlert."""
    __tablename__ = "user_notifications"

    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    alert_id   = Column(String, ForeignKey("anomaly_alerts.id"), nullable=False)
    user_id    = Column(String, ForeignKey("users.id"), nullable=False)

    # State
    is_read        = Column(Boolean, default=False, nullable=False)
    read_at        = Column(DateTime, nullable=True)
    is_acknowledged= Column(Boolean, default=False, nullable=False)
    acknowledged_at= Column(DateTime, nullable=True)

    delivered_at   = Column(DateTime, default=datetime.utcnow)
    created_at     = Column(DateTime, default=datetime.utcnow)

    # Relationships
    alert = relationship("AnomalyAlert", back_populates="notifications")
    user  = relationship("User", foreign_keys=[user_id],
                         back_populates="notifications")
