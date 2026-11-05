from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.contact_request import ContactRequest, ContactRequestStatus
from app.models.information_request import InformationRequest, InformationRequestStatus
from app.models.outbreak_report import OutbreakReport, OutbreakReportStatus
from app.models.prediction import Prediction
from app.models.published_outbreak import OutbreakAuditEvent, PublishedOutbreakRecord
from app.models.user import User
from app.rag.service import RAGService
from app.schemas.communication_schema import (
    AdminContactReviewRequest,
    AdminInformationReplyRequest,
    ContactRequestResponse,
    InformationRequestResponse,
)
from app.schemas.outbreak_schema import (
    OutbreakReportResponse,
    OutbreakReportReviewRequest,
    PublishedOutbreakCreate,
    PublishedOutbreakResponse,
)
from app.schemas.prediction_schema import PredictionHistoryResponse
from app.schemas.user_schema import UserResponse
from app.utils.role_checker import require_admin

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _add_audit_event(
    db: Session,
    report_id: Optional[str],
    published_record_id: Optional[str],
    actor_id: str,
    action: str,
    details: str,
):
    db.add(
        OutbreakAuditEvent(
            report_id=report_id,
            published_record_id=published_record_id,
            actor_user_id=actor_id,
            action=action,
            details=details,
        )
    )


def _create_threshold_notification(db: Session, record: PublishedOutbreakRecord, actor_id: str):
    """
    Create alert notifications when reported_cases > 100.
    Implements duplicate prevention: checks if a threshold alert already exists
    for this outbreak record to avoid repeated notifications on subsequent updates.
    """
    from app.models.anomaly_alert import AnomalyAlert, UserNotification, AlertSeverity, AlertStatus
    from app.models.user import User
    
    # Check if threshold alert already exists for this record
    existing_alert = (
        db.query(AnomalyAlert)
        .filter(AnomalyAlert.related_outbreak_id == record.id)
        .filter(AnomalyAlert.title.like("%exceeded 100 cases%"))
        .first()
    )
    
    if existing_alert:
        # Already notified about this threshold crossing - don't duplicate
        return
    
    # Create the alert
    location = record.district if record.district else record.state
    alert = AnomalyAlert(
        created_by_id=actor_id,
        title=f"{record.disease} outbreak exceeded 100 cases",
        disease=record.disease,
        affected_state=record.state,
        affected_district=record.district,
        severity=AlertSeverity.HIGH.value,
        message=(
            f"{record.disease} outbreak in {location}, {record.state} has exceeded 100 reported cases. "
            f"Current count: {record.reported_cases or 0} cases. "
            f"Risk level: {record.risk_level or 'Unknown'}. "
            f"Stay informed and follow health guidelines."
        ),
        observation_window=f"Threshold crossed",
        detection_method="Automatic threshold: reported_cases > 100",
        related_outbreak_id=record.id,
        target_audience="all",
        status=AlertStatus.SENT.value,
        sent_at=datetime.utcnow(),
    )
    db.add(alert)
    db.flush()  # Get alert ID
    
    # Create user notifications for all users
    users = db.query(User).all()
    for user in users:
        notification = UserNotification(
            alert_id=alert.id,
            user_id=user.id,
            is_read=False,
            delivered_at=datetime.utcnow(),
        )
        db.add(notification)


# ─────────────────────────────────────────────────────────────────────────────
# Users & Predictions
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/users", response_model=List[UserResponse])
def get_all_users(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return (
        db.query(User)
        .order_by(User.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/predictions", response_model=List[PredictionHistoryResponse])
def get_all_predictions(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return (
        db.query(Prediction)
        .order_by(Prediction.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/statistics")
def get_statistics(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get system statistics (admin only)."""
    total_users = db.query(func.count(User.id)).scalar()
    total_predictions = db.query(func.count(Prediction.id)).scalar()
    total_reports = db.query(func.count(OutbreakReport.id)).scalar()
    pending_reports = (
        db.query(func.count(OutbreakReport.id))
        .filter(OutbreakReport.status == OutbreakReportStatus.PENDING.value)
        .scalar()
    )
    published_records = (
        db.query(func.count(PublishedOutbreakRecord.id))
        .filter(PublishedOutbreakRecord.publication_status == "published")
        .scalar()
    )
    pending_info = (
        db.query(func.count(InformationRequest.id))
        .filter(InformationRequest.status.in_(["pending", "awaiting_admin"]))
        .scalar()
    )
    new_feedback = (
        db.query(func.count(ContactRequest.id))
        .filter(ContactRequest.status == ContactRequestStatus.NEW.value)
        .scalar()
    )

    low_risk = db.query(func.count(Prediction.id)).filter(Prediction.risk_level == "Low").scalar()
    medium_risk = db.query(func.count(Prediction.id)).filter(Prediction.risk_level == "Medium").scalar()
    high_risk = db.query(func.count(Prediction.id)).filter(Prediction.risk_level == "High").scalar()

    return {
        "total_users": total_users,
        "total_predictions": total_predictions,
        "risk_distribution": {"low": low_risk, "medium": medium_risk, "high": high_risk},
        "outbreak_reports": total_reports,
        "pending_reports": pending_reports,
        "published_outbreaks": published_records,
        "pending_information_requests": pending_info,
        "new_feedback_requests": new_feedback,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Outbreak Reports — Admin Review
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/outbreak-reports", response_model=List[OutbreakReportResponse])
def list_outbreak_reports(
    status: Optional[str] = Query(default=None),
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(OutbreakReport)
    if status:
        query = query.filter(OutbreakReport.status == status)
    return query.order_by(OutbreakReport.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/outbreak-reports/{report_id}", response_model=OutbreakReportResponse)
def get_outbreak_report(
    report_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    report = db.query(OutbreakReport).filter(OutbreakReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return report


@router.get("/outbreak-reports/{report_id}/evidence")
def get_report_rag_evidence(
    report_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Retrieve RAG-backed evidence for a specific outbreak report.
    Returns retrieved source documents and a cautious AI summary.
    This is advisory only — it does not auto-approve or reject the report.
    """
    report = db.query(OutbreakReport).filter(OutbreakReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    query = f"{report.disease_name} outbreak {report.state or ''} {report.district or ''} prevention symptoms"

    try:
        rag_service = RAGService(db=db)
        result = rag_service.answer_question(
            question=query,
            region=report.state or "India",
            category=None,
        )
        return {
            "report_id": report_id,
            "disease": report.disease_name,
            "location": f"{report.district or ''} {report.state}".strip(),
            "rag_answer": result.get("answer"),
            "rag_sources": result.get("sources", []),
            "grounded": result.get("grounded", False),
            "advisory_note": (
                "This evidence is retrieved from trusted public-health documents for administrative reference only. "
                "A matching document does not confirm the report is accurate. "
                "A missing match does not mean the report is false. "
                "The final decision rests with the reviewing administrator."
            ),
        }
    except Exception as exc:
        return {
            "report_id": report_id,
            "disease": report.disease_name,
            "rag_answer": None,
            "rag_sources": [],
            "grounded": False,
            "advisory_note": f"Evidence service temporarily unavailable: {str(exc)}",
        }


@router.get("/outbreak-reports/{report_id}/hallucination-check")
def check_report_hallucination(
    report_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Analyze an outbreak report for potential hallucination/fabrication.
    Returns confidence score, risk level, and detailed signal analysis.
    This is advisory only — the final decision rests with the reviewing administrator.
    """
    from app.services.hallucination_detector import analyze_report_for_hallucination
    
    report = db.query(OutbreakReport).filter(OutbreakReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    
    try:
        analysis = analyze_report_for_hallucination(db, report)
        return {
            "report_id": report_id,
            "disease": report.disease_name,
            "location": f"{report.district or ''} {report.state}".strip(),
            **analysis,
            "disclaimer": (
                "This analysis is for advisory purposes only. "
                "A low confidence score does not prove fabrication — it may indicate incomplete information. "
                "A high confidence score does not guarantee accuracy — independent verification is always recommended. "
                "The final approval decision rests with the reviewing administrator."
            ),
        }
    except Exception as exc:
        return {
            "report_id": report_id,
            "confidence_score": 50.0,
            "risk_level": "medium",
            "recommendation": f"Hallucination check unavailable: {str(exc)}. Review manually.",
            "disclaimer": "Analysis service temporarily unavailable.",
        }


@router.post("/outbreak-reports/{report_id}/review", response_model=OutbreakReportResponse)
def review_outbreak_report(
    report_id: str,
    payload: OutbreakReportReviewRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Approve, reject or update the status of a user-submitted outbreak report."""
    report = db.query(OutbreakReport).filter(OutbreakReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    finalized_statuses = {OutbreakReportStatus.APPROVED.value, OutbreakReportStatus.REJECTED.value}
    if report.status in finalized_statuses:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This report has already been finalized and cannot be changed again.",
        )

    report.status = payload.status
    report.reviewer_id = current_user.id
    report.review_notes = payload.review_notes or report.review_notes
    report.decision_reason = payload.decision_reason or report.decision_reason

    if payload.status == OutbreakReportStatus.APPROVED.value:
        record = (
            db.query(PublishedOutbreakRecord)
            .filter(PublishedOutbreakRecord.disease == report.disease_name)
            .filter(PublishedOutbreakRecord.state == report.state)
            .filter(PublishedOutbreakRecord.district == (report.district or ""))
            .filter(PublishedOutbreakRecord.locality == (report.locality or ""))
            .first()
        )

        if not record:
            record = PublishedOutbreakRecord(
                disease=report.disease_name,
                state=report.state,
                district=report.district,
                locality=report.locality,
                reported_cases=report.reported_cases,
                source_name="User-submitted report (admin verified)",
                source_reference=report.source_reference,
                description=report.description,
                risk_level="Medium",
                reporting_start=report.observation_date or datetime.utcnow(),
                reporting_end=report.observation_date or datetime.utcnow(),
                publication_status="published",
                reviewer_id=current_user.id,
                created_by_admin_id=current_user.id,
                published_at=datetime.utcnow(),
            )
            db.add(record)
            db.flush()
        else:
            record.reported_cases = report.reported_cases or record.reported_cases
            record.source_reference = report.source_reference or record.source_reference
            record.description = report.description or record.description
            record.publication_status = "published"
            record.reviewer_id = current_user.id
            record.published_at = datetime.utcnow()

        report.published_record_id = record.id
        _add_audit_event(
            db, report.id, record.id, current_user.id,
            "approved", "Admin approved and published the report."
        )

    elif payload.status == OutbreakReportStatus.REJECTED.value:
        _add_audit_event(
            db, report.id, None, current_user.id,
            "rejected", payload.decision_reason or "Report rejected by administrator."
        )
    else:
        _add_audit_event(
            db, report.id, None, current_user.id,
            payload.status, payload.review_notes or "Status updated."
        )

    db.commit()
    db.refresh(report)
    return report


# ─────────────────────────────────────────────────────────────────────────────
# Admin-created Case Records
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/case-data", response_model=PublishedOutbreakResponse)
def create_or_update_case_data(
    payload: PublishedOutbreakCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin API for creating or updating a published outbreak record directly."""
    existing = (
        db.query(PublishedOutbreakRecord)
        .filter(PublishedOutbreakRecord.disease == payload.disease)
        .filter(PublishedOutbreakRecord.state == payload.state)
        .filter(PublishedOutbreakRecord.district == (payload.district or ""))
        .filter(PublishedOutbreakRecord.locality == (payload.locality or ""))
        .first()
    )

    if existing:
        # Track old value for threshold comparison
        old_reported_cases = existing.reported_cases or 0
        
        existing.district = payload.district
        existing.locality = payload.locality
        existing.reported_cases = payload.reported_cases or existing.reported_cases
        existing.active_cases = payload.active_cases if payload.active_cases is not None else existing.active_cases
        existing.recoveries = payload.recoveries if payload.recoveries is not None else existing.recoveries
        existing.deaths = payload.deaths or existing.deaths
        existing.risk_level = payload.risk_level or existing.risk_level
        existing.reporting_start = payload.reporting_start or existing.reporting_start
        existing.reporting_end = payload.reporting_end or existing.reporting_end
        existing.source_name = payload.source_name or existing.source_name
        existing.source_reference = payload.source_reference or existing.source_reference
        existing.description = payload.description or existing.description
        existing.latitude = payload.latitude if payload.latitude is not None else existing.latitude
        existing.longitude = payload.longitude if payload.longitude is not None else existing.longitude
        existing.publication_status = "published"
        existing.reviewer_id = current_user.id
        existing.updated_at = datetime.utcnow()
        record = existing
        
        # Check threshold for notification (update case)
        new_reported_cases = existing.reported_cases or 0
        if old_reported_cases <= 100 and new_reported_cases > 100:
            _create_threshold_notification(db, record, current_user.id)
    else:
        record = PublishedOutbreakRecord(
            disease=payload.disease,
            state=payload.state,
            district=payload.district,
            locality=payload.locality,
            reported_cases=payload.reported_cases,
            active_cases=payload.active_cases,
            recoveries=payload.recoveries,
            deaths=payload.deaths,
            risk_level=payload.risk_level,
            reporting_start=payload.reporting_start,
            reporting_end=payload.reporting_end,
            source_name=payload.source_name,
            source_reference=payload.source_reference,
            description=payload.description,
            latitude=payload.latitude,
            longitude=payload.longitude,
            publication_status="published",
            reviewer_id=current_user.id,
            created_by_admin_id=current_user.id,
        )
        db.add(record)
        
        # Check threshold for notification (new case)
        reported_cases = payload.reported_cases or 0
        if reported_cases > 100:
            db.flush()  # Ensure record has ID before creating notification
            _create_threshold_notification(db, record, current_user.id)

    _add_audit_event(
        db, None, record.id if hasattr(record, "id") else None,
        current_user.id, "admin_case_data_update",
        "Administrator created or updated a published outbreak record."
    )
    db.commit()
    db.refresh(record)
    return record


@router.get("/outbreak-records", response_model=List[PublishedOutbreakResponse])
def list_published_outbreaks(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return (
        db.query(PublishedOutbreakRecord)
        .order_by(PublishedOutbreakRecord.published_at.desc().nullslast())
        .all()
    )


@router.put("/outbreak-records/{record_id}", response_model=PublishedOutbreakResponse)
def update_outbreak_record(
    record_id: str,
    payload: PublishedOutbreakCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update an existing published outbreak record by ID."""
    record = db.query(PublishedOutbreakRecord).filter(PublishedOutbreakRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    
    # Track old value for threshold comparison
    old_reported_cases = record.reported_cases or 0
    
    # Update fields
    record.disease = payload.disease
    record.state = payload.state
    record.district = payload.district
    record.locality = payload.locality
    record.reported_cases = payload.reported_cases
    record.active_cases = payload.active_cases
    record.recoveries = payload.recoveries
    record.deaths = payload.deaths
    record.risk_level = payload.risk_level
    record.reporting_start = payload.reporting_start or record.reporting_start
    record.reporting_end = payload.reporting_end or record.reporting_end
    record.source_name = payload.source_name
    record.source_reference = payload.source_reference
    record.description = payload.description
    record.latitude = payload.latitude
    record.longitude = payload.longitude
    record.reviewer_id = current_user.id
    record.updated_at = datetime.utcnow()
    
    # Check threshold for notification
    new_reported_cases = record.reported_cases or 0
    if old_reported_cases <= 100 and new_reported_cases > 100:
        _create_threshold_notification(db, record, current_user.id)
    
    _add_audit_event(
        db, None, record.id, current_user.id, "updated",
        f"Administrator updated outbreak record: {record.disease} in {record.state}"
    )
    
    db.commit()
    db.refresh(record)
    return record


@router.delete("/outbreak-records/{record_id}")
def delete_outbreak_record(
    record_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete a published outbreak record by ID. This removes it from all user views."""
    record = db.query(PublishedOutbreakRecord).filter(PublishedOutbreakRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    
    disease = record.disease
    location = f"{record.district or ''} {record.state}".strip()
    
    _add_audit_event(
        db, None, record.id, current_user.id, "deleted",
        f"Administrator deleted outbreak record: {disease} in {location}"
    )
    
    db.delete(record)
    db.commit()
    
    return {
        "success": True,
        "message": f"Record deleted: {disease} in {location}",
        "deleted_id": record_id
    }


# ─────────────────────────────────────────────────────────────────────────────
# Information Requests — Admin Queue
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/information-requests", response_model=List[InformationRequestResponse])
def list_information_requests(
    status: Optional[str] = Query(default=None),
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all information requests (admin view)."""
    query = db.query(InformationRequest)
    if status:
        query = query.filter(InformationRequest.status == status)
    return query.order_by(InformationRequest.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/information-requests/{request_id}", response_model=InformationRequestResponse)
def get_information_request_admin(
    request_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    req = db.query(InformationRequest).filter(InformationRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")
    return req


@router.post("/information-requests/{request_id}/reply", response_model=InformationRequestResponse)
def reply_to_information_request(
    request_id: str,
    payload: AdminInformationReplyRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin replies to a user information request."""
    req = db.query(InformationRequest).filter(InformationRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")

    req.admin_reply = payload.admin_reply
    req.admin_id = current_user.id
    req.admin_replied_at = datetime.utcnow()
    req.status = payload.status if payload.status in {"admin_replied", "closed"} else "admin_replied"
    req.updated_at = datetime.utcnow()
    
    # Create a notification for the user
    from app.models.anomaly_alert import AnomalyAlert, UserNotification, AlertSeverity, AlertStatus
    
    # Create an alert for the information request response
    alert = AnomalyAlert(
        created_by_id=current_user.id,
        title=f"Administrator Response to Your Question",
        disease=req.topic if req.topic else "General",
        severity=AlertSeverity.LOW.value,  # Info notification, not urgent
        message=f"An administrator has responded to your question: \"{req.question[:100]}{'...' if len(req.question) > 100 else ''}\"",
        observation_window="Response received",
        detection_method="Admin reply notification",
        target_audience="specific",
        status=AlertStatus.SENT.value,
        sent_at=datetime.utcnow(),
    )
    db.add(alert)
    db.flush()  # Get alert ID
    
    # Create notification for the specific user
    notification = UserNotification(
        alert_id=alert.id,
        user_id=req.user_id,
        is_read=False,
        delivered_at=datetime.utcnow(),
    )
    db.add(notification)
    
    db.commit()
    db.refresh(req)
    return req


# ─────────────────────────────────────────────────────────────────────────────
# Contact / Feedback Requests — Admin Queue
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/feedback-requests", response_model=List[ContactRequestResponse])
def list_feedback_requests(
    status: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """List all feedback/contact requests (admin view)."""
    query = db.query(ContactRequest)
    if status:
        query = query.filter(ContactRequest.status == status)
    if category:
        query = query.filter(ContactRequest.category == category)
    return query.order_by(ContactRequest.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/feedback-requests/{request_id}", response_model=ContactRequestResponse)
def get_feedback_request_admin(
    request_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    req = db.query(ContactRequest).filter(ContactRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")
    return req


@router.post("/feedback-requests/{request_id}/review", response_model=ContactRequestResponse)
def review_feedback_request(
    request_id: str,
    payload: AdminContactReviewRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin reviews and optionally adds notes to a feedback request."""
    req = db.query(ContactRequest).filter(ContactRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")

    valid_statuses = {ContactRequestStatus.REVIEWED.value, ContactRequestStatus.RESOLVED.value}
    if payload.status not in valid_statuses:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Status must be 'reviewed' or 'resolved'.")

    req.status = payload.status
    req.admin_notes = payload.admin_notes or req.admin_notes
    req.admin_id = current_user.id
    req.admin_reviewed_at = datetime.utcnow()
    req.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(req)
    return req


# ─────────────────────────────────────────────────────────────────────────────
# Static data seed — populate published_outbreak_records from OUTBREAK_DATA
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/seed-static-outbreaks")
def seed_static_outbreaks(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Seed the published_outbreak_records table from the curated static dataset.
    Skips records that already exist (matched by disease + state + district).
    This endpoint is idempotent — safe to call multiple times.
    Call once after deploying to populate the heatmap with real outbreak data.
    """
    from app.services.outbreak_data import OUTBREAK_DATA
    from datetime import datetime as dt

    created = 0
    skipped = 0
    for item in OUTBREAK_DATA:
        existing = (
            db.query(PublishedOutbreakRecord)
            .filter(PublishedOutbreakRecord.disease == item["disease"])
            .filter(PublishedOutbreakRecord.state == item["state"])
            .filter(PublishedOutbreakRecord.district == item.get("district", ""))
            .first()
        )
        if existing:
            skipped += 1
            continue

        record = PublishedOutbreakRecord(
            disease=item["disease"],
            state=item["state"],
            district=item.get("district"),
            reported_cases=item.get("cases"),
            risk_level=item.get("risk"),
            latitude=item.get("lat"),
            longitude=item.get("lng"),
            source_name="Static outbreak dataset (seeded)",
            description=(
                f"{item['disease']} outbreak in {item.get('district', item['state'])}, {item['state']}. "
                f"Reported {item.get('cases', 0):,} cases with a weekly change of "
                f"{item.get('weekly_change', 0):.1f}%."
            ),
            publication_status="published",
            created_by_admin_id=current_user.id,
            reviewer_id=current_user.id,
            published_at=dt.utcnow(),
        )
        db.add(record)
        _add_audit_event(
            db, None, None, current_user.id,
            "seeded", f"Static data seed: {item['disease']} in {item['state']}.",
        )
        created += 1

    db.commit()
    return {
        "created": created,
        "skipped": skipped,
        "total_in_dataset": len(OUTBREAK_DATA),
        "message": f"Seeded {created} records, skipped {skipped} existing.",
    }
