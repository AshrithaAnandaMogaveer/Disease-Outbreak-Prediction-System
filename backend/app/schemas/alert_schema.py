from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# ─── Alert creation (admin) ───────────────────────────────────────────────────

class AnomalyAlertCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    disease: Optional[str] = Field(default=None, max_length=120)
    affected_state: Optional[str] = Field(default=None, max_length=120)
    affected_district: Optional[str] = Field(default=None, max_length=120)
    severity: str = Field(default="medium")   # low | medium | high | critical
    message: str = Field(..., min_length=10, max_length=5000)

    observation_window: Optional[str] = Field(default=None, max_length=200)
    baseline_comparison: Optional[str] = Field(default=None, max_length=1000)
    observed_values: Optional[str] = Field(default=None, max_length=1000)
    detection_method: Optional[str] = Field(default=None, max_length=300)

    related_outbreak_id: Optional[str] = None
    related_prediction_id: Optional[str] = None

    target_audience: str = Field(default="all")  # "all" | "state:<name>"

    class Config:
        str_strip_whitespace = True


class AnomalyAlertResponse(BaseModel):
    id: str
    created_by_id: str
    title: str
    disease: Optional[str]
    affected_state: Optional[str]
    affected_district: Optional[str]
    severity: str
    message: str
    observation_window: Optional[str]
    baseline_comparison: Optional[str]
    observed_values: Optional[str]
    detection_method: Optional[str]
    related_outbreak_id: Optional[str]
    related_prediction_id: Optional[str]
    target_audience: str
    status: str
    sent_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]
    recipient_count: Optional[int] = None

    model_config = {"from_attributes": True}


# ─── User notification (recipient view) ──────────────────────────────────────

class NotificationResponse(BaseModel):
    id: str
    alert_id: str
    user_id: str
    is_read: bool
    read_at: Optional[datetime]
    is_acknowledged: bool
    acknowledged_at: Optional[datetime]
    delivered_at: datetime

    # Embedded alert fields for display
    alert_title: Optional[str] = None
    alert_disease: Optional[str] = None
    alert_affected_state: Optional[str] = None
    alert_affected_district: Optional[str] = None
    alert_severity: Optional[str] = None
    alert_message: Optional[str] = None
    alert_observation_window: Optional[str] = None
    alert_baseline_comparison: Optional[str] = None
    alert_observed_values: Optional[str] = None
    alert_detection_method: Optional[str] = None
    alert_related_outbreak_id: Optional[str] = None
    alert_sent_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UnreadCountResponse(BaseModel):
    unread_count: int


# ─── Profile update ───────────────────────────────────────────────────────────

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    location: Optional[str] = Field(default=None, max_length=200)
    bio: Optional[str] = Field(default=None, max_length=500)

    class Config:
        str_strip_whitespace = True


class ProfileResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    location: Optional[str]
    bio: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}


# ─── Activity statistics ──────────────────────────────────────────────────────

class ActivityStatsResponse(BaseModel):
    predictions_made: int
    reports_submitted: int
    alerts_received: int
    unread_alerts: int
    information_requests: int
    feedback_sent: int
