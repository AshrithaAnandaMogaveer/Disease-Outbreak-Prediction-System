"""
Feedback / contact request routes — general feedback, data corrections,
technical issues and admin assistance that are persisted to the database.
"""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.contact_request import ContactRequest, ContactRequestStatus
from app.models.user import User
from app.schemas.communication_schema import ContactRequestResponse, ContactRequestSubmit
from app.utils.role_checker import require_user

router = APIRouter()


@router.post("/feedback-requests", response_model=ContactRequestResponse, status_code=status.HTTP_201_CREATED)
def submit_feedback_request(
    payload: ContactRequestSubmit,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """
    Persist a feedback or contact request from an authenticated user.
    The submitter identity is drawn from the auth context, not the request body.
    """
    contact = ContactRequest(
        user_id=current_user.id,
        category=payload.category,
        subject=payload.subject,
        message=payload.message,
        related_report_ref=payload.related_report_ref,
        submitter_name=payload.submitter_name or current_user.name,
        submitter_email=payload.submitter_email or current_user.email,
        status=ContactRequestStatus.NEW.value,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.get("/feedback-requests/my", response_model=List[ContactRequestResponse])
def get_my_feedback_requests(
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Return the current user's submitted feedback requests."""
    return (
        db.query(ContactRequest)
        .filter(ContactRequest.user_id == current_user.id)
        .order_by(ContactRequest.created_at.desc())
        .all()
    )
