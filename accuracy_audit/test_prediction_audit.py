import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.anomaly_alert import AnomalyAlert, UserNotification
from app.models.user import User, UserRole
from app.rag.service import RAGService
from app.routes.alert_routes import _deliver_alert
from app.schemas.prediction_schema import EnvironmentalData, HealthData, PopulationData
from app.services.prediction_service import PredictionService


class PredictionAuditTests(unittest.TestCase):
    def test_formula_boundaries(self):
        score = PredictionService.calculate_risk_score(
            {"new_cases": 750, "hospital_admissions": 0},
            {"temperature": 25, "rainfall": 0, "humidity": 0},
            {"population_density": 0},
            None,
        )
        self.assertAlmostEqual(score, 30.0, places=9)
        self.assertEqual(PredictionService.classify_risk(score), "Low")

        score = PredictionService.calculate_risk_score(
            {"new_cases": 1500, "hospital_admissions": 0},
            {"temperature": 25, "rainfall": 0, "humidity": 0},
            {"population_density": 0},
            None,
        )
        self.assertAlmostEqual(score, 60.0, places=9)
        self.assertEqual(PredictionService.classify_risk(score), "Medium")

    def test_invalid_inputs_are_rejected(self):
        with self.assertRaises(ValidationError):
            HealthData(active_cases=-1, new_cases=1, hospital_admissions=0, recovery_rate=50)

        with self.assertRaises(ValidationError):
            PopulationData(population_density=10, area_type="suburban", migration_rate=1)

    def test_rag_guardrail_rejects_unsupported_diagnosis(self):
        db_engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=db_engine)
        SessionLocal = sessionmaker(bind=db_engine)
        db = SessionLocal()
        try:
            rag = RAGService(db=db)
            guard = rag._grounding_guard("I need a diagnosis and a random exact risk score.")
            self.assertIn("insufficient reliable information", guard.lower())
        finally:
            db.close()

    def test_alert_delivery_generates_one_notification(self):
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=engine)
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        try:
            admin = User(email="admin.test@example.com", password_hash="hash", name="Admin", role=UserRole.ADMIN)
            user = User(email="user.test@example.com", password_hash="hash", name="User", role=UserRole.USER)
            db.add_all([admin, user])
            db.commit()

            alert = AnomalyAlert(
                created_by_id=admin.id,
                title="Test alert",
                disease="Dengue",
                severity="high",
                message="Rising dengue activity detected.",
                target_audience="all",
            )
            db.add(alert)
            db.flush()
            created = _deliver_alert(alert, db)
            db.commit()

            count = db.query(UserNotification).filter(UserNotification.alert_id == alert.id).count()
            self.assertEqual(created, 1)
            self.assertEqual(count, 1)
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
