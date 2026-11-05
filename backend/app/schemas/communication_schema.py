from __future__ import annotations

import json
from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


# ─────────────────────────────────────────────────────────────────────────────
# Information Requests
# ─────────────────────────────────────────────────────────────────────────────

class InformationRequestSubmit(BaseModel):
    """User-submitted knowledge/clarification request."""
    topic: Optional[str] = Field(default=None, max_length=200)
    question: str = Field(..., min_length=10, max_length=2000)
    related_outbreak_id: Optional[str] = Field(default=None)

    @field_validator("topic", "question", mode="before")
    @classmethod
    def strip_text(cls, value):
        if value is None:
            return value
        if isinstance(value, str):
            stripped = value.strip()
            return stripped if stripped else None
        return value


class InformationRequestResponse(BaseModel):
    id: str
    user_id: str
    topic: Optional[str]
    question: str
    related_outbreak_id: Optional[str]
    rag_answer: Optional[str]
    rag_sources: Optional[Any]  # parsed JSON list
    rag_grounded: Optional[str]
    admin_reply: Optional[str]
    admin_id: Optional[str]
    admin_replied_at: Optional[datetime]
    status: str
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}

    @field_validator("rag_sources", mode="before")
    @classmethod
    def parse_rag_sources(cls, value):
        if value is None:
            return None
        if isinstance(value, str):
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return None
        return value


class AdminInformationReplyRequest(BaseModel):
    admin_reply: str = Field(..., min_length=1, max_length=5000)
    status: str = Field(default="admin_replied")  # "admin_replied" | "closed"


# ─────────────────────────────────────────────────────────────────────────────
# Contact / Feedback Requests
# ─────────────────────────────────────────────────────────────────────────────

VALID_CATEGORIES = {
    "general_feedback",
    "incorrect_information",
    "data_correction",
    "technical_issue",
    "administrative",
    "other",
}


class ContactRequestSubmit(BaseModel):
    """User-submitted feedback or contact request."""
    category: str = Field(default="general_feedback")
    subject: str = Field(..., min_length=3, max_length=200)
    message: str = Field(..., min_length=10, max_length=3000)
    related_report_ref: Optional[str] = Field(default=None, max_length=200)
    submitter_name: Optional[str] = Field(default=None, max_length=150)
    submitter_email: Optional[str] = Field(default=None, max_length=250)

    @field_validator("category", mode="before")
    @classmethod
    def validate_category(cls, value):
        if value not in VALID_CATEGORIES:
            return "other"
        return value

    @field_validator("subject", "message", "related_report_ref", "submitter_name", "submitter_email", mode="before")
    @classmethod
    def strip_text(cls, value):
        if value is None:
            return value
        if isinstance(value, str):
            stripped = value.strip()
            return stripped if stripped else None
        return value


class ContactRequestResponse(BaseModel):
    id: str
    user_id: Optional[str]
    category: str
    subject: str
    message: str
    related_report_ref: Optional[str]
    submitter_name: Optional[str]
    submitter_email: Optional[str]
    admin_notes: Optional[str]
    admin_id: Optional[str]
    admin_reviewed_at: Optional[datetime]
    status: str
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}


class AdminContactReviewRequest(BaseModel):
    status: str = Field(...)  # "reviewed" | "resolved"
    admin_notes: Optional[str] = Field(default=None, max_length=3000)
