from __future__ import annotations

from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class OutbreakReportSubmission(BaseModel):
    disease_name: str = Field(..., min_length=2, max_length=120)
    state: str = Field(..., min_length=2, max_length=120)
    district: Optional[str] = Field(default=None, max_length=120)
    locality: Optional[str] = Field(default=None, max_length=150)
    observation_date: Optional[datetime] = None
    description: str = Field(..., min_length=10, max_length=2000)
    reported_cases: Optional[int] = Field(default=None, ge=0)
    source_reference: Optional[str] = Field(default=None, max_length=500)

    @field_validator("disease_name", "state", "district", "locality", "description", "source_reference", mode="before")
    @classmethod
    def strip_optional_text_fields(cls, value):
        if value is None:
            return value
        if isinstance(value, str):
            value = value.strip()
            if value == "":
                return None
        return value

    @field_validator("observation_date", mode="before")
    @classmethod
    def normalize_observation_date(cls, value):
        if value in (None, ""):
            return None
        return value


class OutbreakReportReviewRequest(BaseModel):
    status: Literal["under_review", "needs_information", "approved", "rejected"]
    review_notes: Optional[str] = Field(default=None, max_length=2000)
    decision_reason: Optional[str] = Field(default=None, max_length=2000)


class PublishedOutbreakCreate(BaseModel):
    disease: str = Field(..., min_length=2, max_length=120)
    state: str = Field(..., min_length=2, max_length=120)
    district: Optional[str] = Field(default=None, max_length=120)
    locality: Optional[str] = Field(default=None, max_length=150)
    reported_cases: Optional[int] = Field(default=None, ge=0)
    active_cases: Optional[int] = Field(default=None, ge=0)
    recoveries: Optional[int] = Field(default=None, ge=0)
    deaths: Optional[int] = Field(default=None, ge=0)
    risk_level: Optional[str] = Field(default=None, max_length=40)
    reporting_start: Optional[datetime] = None
    reporting_end: Optional[datetime] = None
    source_name: str = Field(default="Admin review", max_length=200)
    source_reference: Optional[str] = Field(default=None, max_length=500)
    description: str = Field(..., min_length=10, max_length=2000)
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    @model_validator(mode="after")
    def validate_india_coordinates(self):
        latitude = self.latitude
        longitude = self.longitude
        if latitude is None and longitude is None:
            return self
        if latitude is None or longitude is None:
            raise ValueError("Latitude and longitude must be provided together for a geo-located outbreak record.")
        if not (6.0 <= float(latitude) <= 38.0):
            raise ValueError("Latitude must be within India bounds (6°N to 38°N).")
        if not (68.0 <= float(longitude) <= 98.0):
            raise ValueError("Longitude must be within India bounds (68°E to 98°E).")
        return self


class OutbreakReportResponse(BaseModel):
    id: str
    disease_name: str
    state: str
    district: Optional[str]
    locality: Optional[str]
    observation_date: Optional[datetime]
    description: str
    reported_cases: Optional[int]
    source_reference: Optional[str]
    status: str
    review_notes: Optional[str]
    decision_reason: Optional[str]
    submitter_id: str
    reviewer_id: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}


class PublishedOutbreakResponse(BaseModel):
    id: str
    disease: str
    state: str
    district: Optional[str]
    locality: Optional[str]
    reported_cases: Optional[int]
    active_cases: Optional[int]
    recoveries: Optional[int]
    deaths: Optional[int]
    risk_level: Optional[str]
    reporting_start: Optional[datetime]
    reporting_end: Optional[datetime]
    source_name: str
    source_reference: Optional[str]
    description: str
    latitude: Optional[float]
    longitude: Optional[float]
    publication_status: str
    reviewer_id: Optional[str]
    created_by_admin_id: Optional[str]
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}
