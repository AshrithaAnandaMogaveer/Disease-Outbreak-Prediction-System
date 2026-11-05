from fastapi.testclient import TestClient

from app.database import SessionLocal, engine, Base
from app.main import app
from app.models.outbreak_report import OutbreakReport, OutbreakReportStatus
from app.models.published_outbreak import PublishedOutbreakRecord
from app.models.user import User, UserRole
from app.utils.security import get_password_hash


def _reset_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    db.query(PublishedOutbreakRecord).delete()
    db.query(OutbreakReport).delete()
    db.query(User).delete()
    db.commit()
    db.close()


def test_outbreak_report_statuses_are_defined():
    assert OutbreakReportStatus.PENDING.value == "pending"
    assert OutbreakReportStatus.APPROVED.value == "approved"
    assert OutbreakReportStatus.REJECTED.value == "rejected"


def test_report_model_has_required_columns():
    report = OutbreakReport()
    assert hasattr(report, "disease_name")
    assert hasattr(report, "submitter_id")
    assert hasattr(report, "status")


def test_duplicate_approval_is_blocked_for_same_report():
    _reset_db()
    db = SessionLocal()
    user = User(email="submitter@example.com", password_hash=get_password_hash("pw123"), name="Submitter", role=UserRole.USER)
    admin = User(email="admin@example.com", password_hash=get_password_hash("pw123"), name="Admin", role=UserRole.ADMIN)
    db.add_all([user, admin])
    db.commit()
    db.refresh(user)
    db.refresh(admin)
    report = OutbreakReport(
        submitter_id=user.id,
        disease_name="Dengue",
        state="Karnataka",
        district="Bengaluru",
        locality="Koramangala",
        description="Cluster of fever reports near the area.",
        reported_cases=12,
        source_reference="Local clinic",
        status=OutbreakReportStatus.PENDING.value,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    db.close()

    client = TestClient(app)
    user_token = client.post("/api/auth/login", json={"email": "submitter@example.com", "password": "pw123"}).json()["access_token"]
    admin_token = client.post("/api/auth/login", json={"email": "admin@example.com", "password": "pw123"}).json()["access_token"]

    first = client.post(
        f"/api/admin/outbreak-reports/{report.id}/review",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "approved", "decision_reason": "Confirmed by review", "review_notes": "Approved"},
    )
    second = client.post(
        f"/api/admin/outbreak-reports/{report.id}/review",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "approved", "decision_reason": "Already processed", "review_notes": "Duplicate action"},
    )

    assert first.status_code == 200
    assert second.status_code == 409
    assert second.json()["detail"] == "This report has already been finalized and cannot be changed again."

    public = client.get("/api/outbreaks")
    assert public.status_code == 200
    assert public.json()["total"] == 1


def test_published_records_reject_invalid_india_coordinates():
    _reset_db()
    db = SessionLocal()
    admin = User(email="geoadmin@example.com", password_hash=get_password_hash("pw123"), name="Geo Admin", role=UserRole.ADMIN)
    db.add(admin)
    db.commit()
    db.refresh(admin)
    db.close()

    client = TestClient(app)
    admin_token = client.post("/api/auth/login", json={"email": "geoadmin@example.com", "password": "pw123"}).json()["access_token"]

    response = client.post(
        "/api/admin/case-data",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "disease": "Chikungunya",
            "state": "Delhi",
            "district": "Central Delhi",
            "reported_cases": 9,
            "risk_level": "Medium",
            "source_name": "Admin review",
            "description": "Test record with coordinates outside India.",
            "latitude": 12.0,
            "longitude": 40.0,
        },
    )

    assert response.status_code == 422
    payload = response.json()
    assert payload["success"] is False
    assert any("India bounds" in item["msg"] for item in payload["errors"])


def test_blank_optional_fields_are_normalized_for_report_submission():
    _reset_db()
    db = SessionLocal()
    user = User(email="reporter@example.com", password_hash=get_password_hash("pw123"), name="Reporter", role=UserRole.USER)
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()

    client = TestClient(app)
    token = client.post("/api/auth/login", json={"email": "reporter@example.com", "password": "pw123"}).json()["access_token"]

    response = client.post(
        "/api/outbreaks/reports",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "disease_name": "Dengue",
            "state": "Karnataka",
            "district": "",
            "locality": "",
            "observation_date": "",
            "description": "Residents reported a cluster of fever cases and local clinic referrals during the last week.",
            "reported_cases": None,
            "source_reference": "",
        },
    )

    assert response.status_code == 201, response.text
    payload = response.json()
    assert payload["disease_name"] == "Dengue"
    assert payload["state"] == "Karnataka"
    assert payload["district"] is None
    assert payload["locality"] is None
    assert payload["observation_date"] is None
    assert payload["source_reference"] is None
