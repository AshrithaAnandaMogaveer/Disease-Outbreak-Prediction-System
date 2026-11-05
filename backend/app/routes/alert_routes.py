"""
Alert and notification routes.

User endpoints (require_user):
  GET  /notifications                  — paginated list with embedded alert details
  GET  /notifications/unread-count     — fast unread badge count
  POST /notifications/{id}/read        — mark one notification as read
  POST /notifications/read-all         — mark all as read
  POST /notifications/{id}/acknowledge — acknowledge an alert

Admin endpoints (require_admin):
  GET  /admin/alerts                   — list all alerts
  GET  /admin/alerts/anomaly-candidates — trend-based anomaly suggestions
  POST /admin/alerts                   — create & optionally send a new alert
  POST /admin/alerts/{id}/send         — send a saved draft alert
  GET  /admin/alerts/{id}              — alert detail + delivery stats
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.anomaly_alert import AnomalyAlert, AlertStatus, UserNotification
from app.models.user import User, UserRole
from app.schemas.alert_schema import (
    ActivityStatsResponse,
    AnomalyAlertCreate,
    AnomalyAlertResponse,
    NotificationResponse,
    ProfileResponse,
    ProfileUpdateRequest,
    UnreadCountResponse,
)
from app.services.trend_analyzer import get_ai_insights
from app.utils.role_checker import require_admin, require_user

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _notification_to_response(n: UserNotification) -> NotificationResponse:
    """Flatten notification + embedded alert fields into the response schema."""
    a = n.alert
    return NotificationResponse(
        id=n.id,
        alert_id=n.alert_id,
        user_id=n.user_id,
        is_read=n.is_read,
        read_at=n.read_at,
        is_acknowledged=n.is_acknowledged,
        acknowledged_at=n.acknowledged_at,
        delivered_at=n.delivered_at,
        alert_title=a.title if a else None,
        alert_disease=a.disease if a else None,
        alert_affected_state=a.affected_state if a else None,
        alert_affected_district=a.affected_district if a else None,
        alert_severity=a.severity if a else None,
        alert_message=a.message if a else None,
        alert_observation_window=a.observation_window if a else None,
        alert_baseline_comparison=a.baseline_comparison if a else None,
        alert_observed_values=a.observed_values if a else None,
        alert_detection_method=a.detection_method if a else None,
        alert_related_outbreak_id=a.related_outbreak_id if a else None,
        alert_sent_at=a.sent_at if a else None,
    )


def _deliver_alert(alert: AnomalyAlert, db: Session) -> int:
    """
    Create UserNotification rows for all eligible recipients.
    Idempotent — skips users who already have a notification for this alert.
    Returns the number of new notifications created.
    """
    target = alert.target_audience or "all"

    q = db.query(User)
    if target.startswith("state:"):
        state_name = target[6:].strip()
        # For state-targeted alerts, deliver to all users (location matching
        # is advisory — we have no enforced location on the user model yet).
        # In production you would filter by user.location.
        # For now: deliver to all users as a conservative fallback.
        pass  # deliver to all

    users = q.filter(User.role == UserRole.USER).all()

    # Find users who already have a notification for this alert (idempotency)
    existing_user_ids = {
        n.user_id
        for n in db.query(UserNotification).filter(UserNotification.alert_id == alert.id).all()
    }

    created = 0
    for user in users:
        if user.id in existing_user_ids:
            continue
        db.add(UserNotification(
            alert_id=alert.id,
            user_id=user.id,
            delivered_at=datetime.utcnow(),
        ))
        created += 1

    return created


# ─────────────────────────────────────────────────────────────────────────────
# USER — PROFILE UPDATE
# ─────────────────────────────────────────────────────────────────────────────

@router.patch("/profile", response_model=ProfileResponse)
def update_profile(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Update the current user's permitted profile fields (name, location, bio)."""
    if payload.name is not None:
        current_user.name = payload.name.strip()
    if payload.location is not None:
        current_user.location = payload.location.strip() or None
    if payload.bio is not None:
        current_user.bio = payload.bio.strip() or None

    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/profile", response_model=ProfileResponse)
def get_profile(
    current_user: User = Depends(require_user),
):
    """Return the current user's full profile (including location/bio)."""
    return current_user


# ─────────────────────────────────────────────────────────────────────────────
# USER — ACTIVITY STATISTICS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/profile/stats", response_model=ActivityStatsResponse)
def get_activity_stats(
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Return real database-derived activity statistics for the current user."""
    from app.models.prediction import Prediction
    from app.models.outbreak_report import OutbreakReport
    from app.models.information_request import InformationRequest
    from app.models.contact_request import ContactRequest

    predictions_made = (
        db.query(Prediction).filter(Prediction.user_id == current_user.id).count()
    )
    reports_submitted = (
        db.query(OutbreakReport)
        .filter(OutbreakReport.submitter_id == current_user.id)
        .count()
    )
    alerts_received = (
        db.query(UserNotification)
        .filter(UserNotification.user_id == current_user.id)
        .count()
    )
    unread_alerts = (
        db.query(UserNotification)
        .filter(UserNotification.user_id == current_user.id)
        .filter(UserNotification.is_read == False)  # noqa: E712
        .count()
    )
    information_requests = (
        db.query(InformationRequest)
        .filter(InformationRequest.user_id == current_user.id)
        .count()
    )
    feedback_sent = (
        db.query(ContactRequest)
        .filter(ContactRequest.user_id == current_user.id)
        .count()
    )

    return ActivityStatsResponse(
        predictions_made=predictions_made,
        reports_submitted=reports_submitted,
        alerts_received=alerts_received,
        unread_alerts=unread_alerts,
        information_requests=information_requests,
        feedback_sent=feedback_sent,
    )


# ─────────────────────────────────────────────────────────────────────────────
# USER — NOTIFICATIONS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/notifications", response_model=List[NotificationResponse])
def list_notifications(
    skip: int = 0,
    limit: int = Query(default=20, le=50),
    unread_only: bool = False,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Return the current user's notifications, newest first."""
    q = (
        db.query(UserNotification)
        .filter(UserNotification.user_id == current_user.id)
    )
    if unread_only:
        q = q.filter(UserNotification.is_read == False)  # noqa: E712
    notifications = (
        q.order_by(UserNotification.delivered_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_notification_to_response(n) for n in notifications]


@router.get("/notifications/unread-count", response_model=UnreadCountResponse)
def unread_count(
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    count = (
        db.query(UserNotification)
        .filter(UserNotification.user_id == current_user.id)
        .filter(UserNotification.is_read == False)  # noqa: E712
        .count()
    )
    return UnreadCountResponse(unread_count=count)


@router.post("/notifications/{notification_id}/read", response_model=NotificationResponse)
def mark_as_read(
    notification_id: str,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    n = db.query(UserNotification).filter(
        UserNotification.id == notification_id,
        UserNotification.user_id == current_user.id,
    ).first()
    if not n:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
    if not n.is_read:
        n.is_read = True
        n.read_at = datetime.utcnow()
        db.commit()
        db.refresh(n)
    return _notification_to_response(n)


@router.post("/notifications/read-all")
def mark_all_read(
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    updated = (
        db.query(UserNotification)
        .filter(UserNotification.user_id == current_user.id)
        .filter(UserNotification.is_read == False)  # noqa: E712
        .all()
    )
    now = datetime.utcnow()
    for n in updated:
        n.is_read = True
        n.read_at = now
    db.commit()
    return {"marked_read": len(updated)}


@router.post("/notifications/{notification_id}/acknowledge", response_model=NotificationResponse)
def acknowledge_notification(
    notification_id: str,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    n = db.query(UserNotification).filter(
        UserNotification.id == notification_id,
        UserNotification.user_id == current_user.id,
    ).first()
    if not n:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
    if not n.is_acknowledged:
        n.is_acknowledged = True
        n.acknowledged_at = datetime.utcnow()
        if not n.is_read:
            n.is_read = True
            n.read_at = n.acknowledged_at
        db.commit()
        db.refresh(n)
    return _notification_to_response(n)


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN — ANOMALY CANDIDATES
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/admin/alerts/anomaly-candidates")
def anomaly_candidates(
    current_user: User = Depends(require_admin),
):
    """
    Return threshold-based anomaly signals from the static outbreak dataset.
    These are advisory suggestions — an admin must review before sending an alert.
    """
    insights = get_ai_insights()
    # Enrich each item with an alert draft scaffold so the admin can pre-fill the form
    candidates = []
    for item in insights:
        if item["type"] in ("critical", "warning"):
            candidates.append({
                "type": item["type"],
                "message": item["message"],
                "suggested_severity": "critical" if item["type"] == "critical" else "high",
            })
    return {"candidates": candidates, "total": len(candidates)}


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN — ALERT CRUD
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/admin/alerts", response_model=List[AnomalyAlertResponse])
def list_alerts(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(AnomalyAlert)
    if status_filter:
        q = q.filter(AnomalyAlert.status == status_filter)
    alerts = q.order_by(AnomalyAlert.created_at.desc()).offset(skip).limit(limit).all()
    results = []
    for a in alerts:
        resp = AnomalyAlertResponse.model_validate(a)
        resp.recipient_count = len(a.notifications)
        results.append(resp)
    return results


@router.get("/admin/alerts/{alert_id}", response_model=AnomalyAlertResponse)
def get_alert(
    alert_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    a = db.query(AnomalyAlert).filter(AnomalyAlert.id == alert_id).first()
    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found.")
    resp = AnomalyAlertResponse.model_validate(a)
    resp.recipient_count = len(a.notifications)
    return resp


@router.post("/admin/alerts", response_model=AnomalyAlertResponse, status_code=status.HTTP_201_CREATED)
def create_alert(
    payload: AnomalyAlertCreate,
    send_now: bool = Query(default=False),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Create a new anomaly alert.
    Pass ?send_now=true to deliver to recipients immediately.
    Without that flag the alert is saved as a draft.
    """
    valid_severities = {"low", "medium", "high", "critical"}
    severity = payload.severity.lower() if payload.severity.lower() in valid_severities else "medium"

    alert = AnomalyAlert(
        created_by_id=current_user.id,
        title=payload.title,
        disease=payload.disease,
        affected_state=payload.affected_state,
        affected_district=payload.affected_district,
        severity=severity,
        message=payload.message,
        observation_window=payload.observation_window,
        baseline_comparison=payload.baseline_comparison,
        observed_values=payload.observed_values,
        detection_method=payload.detection_method,
        related_outbreak_id=payload.related_outbreak_id,
        related_prediction_id=payload.related_prediction_id,
        target_audience=payload.target_audience or "all",
        status=AlertStatus.DRAFT.value,
    )
    db.add(alert)
    db.flush()  # get alert.id before delivering

    if send_now:
        count = _deliver_alert(alert, db)
        alert.status = AlertStatus.SENT.value
        alert.sent_at = datetime.utcnow()

    db.commit()
    db.refresh(alert)

    resp = AnomalyAlertResponse.model_validate(alert)
    resp.recipient_count = len(alert.notifications)
    return resp


@router.post("/admin/alerts/{alert_id}/send", response_model=AnomalyAlertResponse)
def send_alert(
    alert_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Deliver a saved draft alert to all eligible recipients."""
    alert = db.query(AnomalyAlert).filter(AnomalyAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found.")
    if alert.status == AlertStatus.SENT.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Alert has already been sent. Duplicate delivery prevented.",
        )

    _deliver_alert(alert, db)
    alert.status = AlertStatus.SENT.value
    alert.sent_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)

    resp = AnomalyAlertResponse.model_validate(alert)
    resp.recipient_count = len(alert.notifications)
    return resp
