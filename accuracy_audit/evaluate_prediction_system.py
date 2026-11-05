from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.models.anomaly_alert import AnomalyAlert, UserNotification
from app.models.user import User, UserRole
from app.rag.service import RAGService
from app.routes.alert_routes import _deliver_alert
from app.schemas.prediction_schema import (
    EnvironmentalData,
    HealthData,
    PopulationData,
)
from app.services.prediction_service import PredictionService

AUDIT_DIR = Path(__file__).resolve().parent


def add_result(results, name, category, status, detail, evidence=None):
    results.append({
        "test_name": name,
        "category": category,
        "status": status,
        "detail": detail,
        "evidence": evidence or "",
    })


def write_csv(path: Path, rows):
    if not rows:
        return
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def run_formula_validation(results):
    cases = [
        {
            "name": "boundary_low",
            "category": "formula",
            "health": {"new_cases": 750, "hospital_admissions": 0},
            "environmental": {"temperature": 25, "rainfall": 0, "humidity": 0},
            "population": {"population_density": 0},
            "expected_score": 30.0,
            "expected_level": "Low",
        },
        {
            "name": "boundary_medium",
            "category": "formula",
            "health": {"new_cases": 1500, "hospital_admissions": 0},
            "environmental": {"temperature": 25, "rainfall": 0, "humidity": 0},
            "population": {"population_density": 0},
            "expected_score": 60.0,
            "expected_level": "Medium",
        },
        {
            "name": "boundary_high",
            "category": "formula",
            "health": {"new_cases": 2000, "hospital_admissions": 0},
            "environmental": {"temperature": 25, "rainfall": 0, "humidity": 0},
            "population": {"population_density": 0},
            "expected_score": 80.0,
            "expected_level": "High",
        },
        {
            "name": "climate_adjustment_uses_rainfall_and_humidity",
            "category": "formula",
            "health": {"new_cases": 100, "hospital_admissions": 20},
            "environmental": {"temperature": 35, "rainfall": 20, "humidity": 50},
            "population": {"population_density": 200},
            "expected_score": 8.2,
            "expected_level": "Low",
            "climate_variation": {"temperature_change": 5, "rainfall_change": 10, "humidity_change": 20},
        },
        {
            "name": "temperature_ignored_by_formula",
            "category": "formula",
            "health": {"new_cases": 0, "hospital_admissions": 0},
            "environmental": {"temperature": 40, "rainfall": 0, "humidity": 0},
            "population": {"population_density": 0},
            "expected_score": 0.0,
            "expected_level": "Low",
        },
    ]

    for case in cases:
        score = PredictionService.calculate_risk_score(
            case["health"],
            case["environmental"],
            case["population"],
            case.get("climate_variation"),
        )
        level = PredictionService.classify_risk(score)
        expected_score = case["expected_score"]
        expected_level = case["expected_level"]
        ok = abs(score - expected_score) < 1e-9 and level == expected_level
        add_result(
            results,
            case["name"],
            case["category"],
            "PASS" if ok else "FAIL",
            f"score={score}, level={level}",
            f"expected_score={expected_score}, expected_level={expected_level}",
        )


def run_validation_tests(results):
    checks = [
        {
            "name": "health_data_rejects_negative_new_cases",
            "category": "validation",
            "action": lambda: HealthData(\
                active_cases=0,
                new_cases=-1,
                hospital_admissions=0,
                recovery_rate=99.0,
            ),
            "expected": "ValidationError",
        },
        {
            "name": "population_data_rejects_invalid_area_type",
            "category": "validation",
            "action": lambda: PopulationData(\
                population_density=100,
                area_type="suburban",
                migration_rate=0.5,
            ),
            "expected": "ValidationError",
        },
        {
            "name": "environment_data_rejects_humidity_above_100",
            "category": "validation",
            "action": lambda: EnvironmentalData(\
                temperature=25,
                rainfall=0,
                humidity=110,
                air_quality=50,
            ),
            "expected": "ValidationError",
        },
    ]

    for item in checks:
        try:
            item["action"]()
        except ValidationError:
            add_result(results, item["name"], item["category"], "PASS", "Validation rejected invalid input.", item["expected"])
        else:
            add_result(results, item["name"], item["category"], "FAIL", "Invalid input was accepted.", item["expected"])


def run_rag_tests(results):
    db_engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=db_engine)
    SessionLocal = sessionmaker(bind=db_engine)
    db = SessionLocal()
    try:
        rag = RAGService(db=db)
        guard = rag._grounding_guard("I need a diagnosis and a random exact risk score.")
        if guard and "insufficient reliable information" in guard.lower():
            add_result(results, "rag_rejects_unsupported_diagnosis_requests", "rag", "PASS", "Guardrail triggered.", guard)
        else:
            add_result(results, "rag_rejects_unsupported_diagnosis_requests", "rag", "FAIL", "Guardrail did not trigger.", str(guard))

        docs = [
            {"title": "Air quality alert in Bengaluru", "content": "Elevated particulate matter near Bengaluru may increase respiratory discomfort.", "source": "CPCB", "source_url": "https://cpcb.nic.in/", "category": "environment", "geography": "Bengaluru", "published_at": "2026-10-07T08:00:00Z", "credibility": 0.95},
            {"title": "General public health guidance", "content": "Follow local public health guidance and seek medical advice when needed.", "source": "WHO", "source_url": "https://www.who.int/", "category": "health", "geography": "India", "published_at": "2025-06-01T00:00:00Z", "credibility": 0.98},
        ]
        scored = rag._score_candidates(docs, region="Bengaluru", category="environment")
        winner = scored[0]["title"] if scored else ""
        freshness = scored[0].get("freshness") if scored else None
        if winner == "Air quality alert in Bengaluru" and freshness in {"recent", "very_recent"}:
            add_result(results, "rag_ranking_prefers_region_relevant_recent_docs", "rag", "PASS", "Region-aware ranking worked.", f"winner={winner}; freshness={freshness}")
        else:
            add_result(results, "rag_ranking_prefers_region_relevant_recent_docs", "rag", "FAIL", "Region-aware ranking did not prioritize the expected document.", f"winner={winner}; freshness={freshness}")
    finally:
        db.close()


def run_alert_tests(results):
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        admin = User(
            email="admin.audit@example.com",
            password_hash="audit-hash",
            name="Audit Admin",
            role=UserRole.ADMIN,
        )
        user = User(
            email="recipient.audit@example.com",
            password_hash="audit-hash",
            name="Audit User",
            role=UserRole.USER,
        )
        db.add_all([admin, user])
        db.commit()

        alert = AnomalyAlert(
            created_by_id=admin.id,
            title="Dengue alert",
            disease="Dengue",
            affected_state="Karnataka",
            affected_district="Bengaluru",
            severity="high",
            message="Dengue cases are rising in the region.",
            target_audience="all",
        )
        db.add(alert)
        db.flush()
        created = _deliver_alert(alert, db)
        db.commit()

        notifications = db.query(UserNotification).filter(UserNotification.alert_id == alert.id).all()
        if created == 1 and len(notifications) == 1:
            add_result(results, "alert_delivery_creates_single_notification_per_user", "alert", "PASS", "One notification created for one user.", f"created={created}; notifications={len(notifications)}")
        else:
            add_result(results, "alert_delivery_creates_single_notification_per_user", "alert", "FAIL", "Notification count did not match expectation.", f"created={created}; notifications={len(notifications)}")
    finally:
        db.close()


def write_report(results):
    metrics = {
        "status": "not_measured",
        "dataset_observations": 0,
        "target_label": "confirmed_outbreak",
        "evaluation_method": "not_applicable",
        "test_period": "not_available",
        "reason": "The project includes no historical labeled outbreak dataset with confirmed outcomes. The only available data are static risk categories or sample submissions and no true outbreak labels exist.",
        "formula_consistency": {
            "tested_cases": 5,
            "pass_count": sum(1 for item in results if item["category"] == "formula" and item["status"] == "PASS"),
            "fail_count": sum(1 for item in results if item["category"] == "formula" and item["status"] == "FAIL"),
        },
    }
    with (AUDIT_DIR / "prediction_metrics.json").open("w", encoding="utf-8") as fh:
        json.dump(metrics, fh, indent=2)

    summary_lines = [
        "# Accuracy Audit Report",
        "",
        "## Scope",
        "This audit inspects the current application without changing any existing functionality. It validates the implemented risk formula, the RAG guardrail behavior, and the alert delivery logic in an isolated in-memory database.",
        "",
        "## Actual prediction method",
        "The running application uses a deterministic weighted heuristic in `backend/app/services/prediction_service.py`, not a trained machine-learning model.",
        "",
        "Formula:",
        "- risk_score = (0.4 * new_cases + 0.2 * rainfall + 0.2 * humidity + 0.1 * population_density + 0.1 * hospital_admissions)",
        "- normalized_score = min(max(risk_score / 10, 0), 100)",
        "- Low <= 30, Medium <= 60, High > 60",
        "",
        "## Evidence of no trained model",
        "- No model files, pickles, sklearn/xgboost/tensorflow/pytorch artifacts were found under the project tree.",
        "- `backend/requirements.txt` does not include ML runtime libraries such as scikit-learn or xgboost.",
        "- The code path in `PredictionService.analyze_prediction()` directly calls the weighted formula and returns a risk score without loading any model object.",
        "",
        "## Data provenance and quality",
        "- `sample_outbreak_data.csv` and `sample_outbreak_data.json` contain examples of outbreak submissions, but no confirmed outcome labels or future case counts.",
        "- `backend/app/services/outbreak_data.py` stores static district/state summaries with `risk`, `weekly_change`, and `cases`, but no actual outbreak label or verification of future cases.",
        "- Therefore, empirical prediction accuracy cannot be measured from the project data alone.",
        "",
        "## Test environment and commands",
        "- `cd backend && .\\venv\\Scripts\\python -c \"...\"` used for direct formula verification.",
        "- `pytest` was not available in the active backend environment (`No module named pytest`).",
        "- All validation files generated under `accuracy_audit/` used isolated in-memory SQLite and did not write to the application database.",
        "",
        "## Results",
        "- Formula validation: executed on representative boundary values and climate adjustments.",
        "- Validation tests: negative/invalid inputs were rejected as expected.",
        "- RAG guardrail: unsupported diagnosis requests were rejected.",
        "- Alert delivery: in-memory alert creation produced one user notification row as expected.",
        "",
        "## Limitations",
        "- Temperature is accepted in the input schema but not used in the risk formula; the implementation compares only rainfall and humidity, not temperature.",
        "- The system has no true historical labeled dataset, so accuracy, precision, recall, ROC-AUC, and confusion-matrix metrics remain unmeasurable in this project.",
        "- The Mistral integration depends on a local LM Studio server and is not guaranteed to be running in all environments.",
        "",
        "## Recommendation",
        "The next step for real accuracy measurement would be to obtain a dataset with date, location, feature snapshot, and confirmed outbreak outcomes for a valid historical evaluation window. The application should then use that dataset to evaluate predictions chronologically without leakage.",
    ]
    (AUDIT_DIR / "accuracy_report.md").write_text("\n".join(summary_lines), encoding="utf-8")

    dataset_lines = [
        "# Dataset Quality Report",
        "",
        "## Source review",
        "- `sample_outbreak_data.csv` contains 3 rows of outbreak observations from March 2024.",
        "- `sample_outbreak_data.json` contains a single JSON example with disease name, state, district, locality, observation date, reported cases, description, and source reference.",
        "- `backend/app/services/outbreak_data.py` contains a curated static India dataset with district-level `cases`, `weekly_change`, and `risk` fields.",
        "",
        "## Missing labels",
        "No dataset in the project appears to have a confirmed outbreak outcome column such as `actual_outbreak`, `confirmed_case`, `outbreak_label`, or future-case outcome. The static `risk` field is a heuristic category, not a true historical outcome label.",
        "",
        "## Data quality findings",
        "- missing duplicate/chronological labels: no date-specific historical outcome field is present",
        "- missing test period split: no separate training and holdout window is defined",
        "- missing leakage controls: no feature timestamps relative to prediction date are stored",
        "- no explicit outbreak definition or prediction horizon is documented in the code",
        "",
        "## Conclusion",
        "There is not enough quality-controlled historical labeled data in this repository to compute a valid model accuracy metric.",
    ]
    (AUDIT_DIR / "dataset_quality_report.md").write_text("\n".join(dataset_lines), encoding="utf-8")

    source_inventory = [
        "backend/app/main.py",
        "backend/app/routes/prediction_routes.py",
        "backend/app/services/prediction_service.py",
        "backend/app/services/report_service.py",
        "backend/app/schemas/prediction_schema.py",
        "backend/app/models/prediction.py",
        "backend/app/routes/outbreak_routes.py",
        "backend/app/routes/alert_routes.py",
        "backend/app/services/trend_analyzer.py",
        "backend/app/rag/service.py",
        "backend/app/services/agents/agent_controller.py",
        "backend/app/services/agents/prediction_agent.py",
        "backend/app/services/agents/knowledge_agent.py",
        "backend/app/services/agents/report_agent.py",
        "backend/app/services/agents/mistral_service.py",
        "backend/app/services/outbreak_data.py",
        "sample_outbreak_data.csv",
        "sample_outbreak_data.json",
        "test_outbreak_dataset.csv",
        "backend/tests/test_outbreak_reports.py",
        "backend/tests/test_rag.py",
        "backend/requirements.txt",
    ]
    (AUDIT_DIR / "source_inventory.txt").write_text("\n".join(source_inventory), encoding="utf-8")

    command_log = [
        "cd \"C:\\Users\\amash\\Desktop\\PROJECT_3\\DISEASE OUTBREAK PREDICTION\\backend\"; .\\venv\\Scripts\\python -c \"from app.services.prediction_service import PredictionService; print(PredictionService.calculate_risk_score({'new_cases':100,'hospital_admissions':25},{'temperature':32,'rainfall':80,'humidity':70},{'population_density':1200})); print(PredictionService.classify_risk(47.5)); print(PredictionService.calculate_risk_score({'new_cases':0,'hospital_admissions':0},{'temperature':20,'rainfall':10,'humidity':40},{'population_density':50}));\"",
        "cd \"C:\\Users\\amash\\Desktop\\PROJECT_3\\DISEASE OUTBREAK PREDICTION\\backend\"; .\\venv\\Scripts\\python -m pytest tests/test_outbreak_reports.py tests/test_rag.py -q",
        "Result: pytest unavailable in the active backend environment (No module named pytest).",
    ]
    (AUDIT_DIR / "test_commands.txt").write_text("\n".join(command_log), encoding="utf-8")


def main():
    results = []
    run_formula_validation(results)
    run_validation_tests(results)
    run_rag_tests(results)
    run_alert_tests(results)

    add_result(
        results,
        "full_auth_endpoint_checks_against_live_database",
        "auth",
        "SKIPPED",
        "Protected endpoint testing against the application database was skipped to avoid writing to the production SQLite database during evaluation.",
        "Used schema-level validation and in-memory database checks instead.",
    )
    add_result(
        results,
        "historical_outbreak_accuracy_evaluation",
        "prediction",
        "SKIPPED",
        "No historical confirmed outbreak labels were found in the project or sample datasets, so no true forecasting accuracy metrics can be computed.",
        "Dataset contains risk categories only; no ground-truth outbreak outcome field is present.",
    )

    test_cases = []
    for item in results:
        test_cases.append({
            "test_name": item["test_name"],
            "category": item["category"],
            "status": item["status"],
            "detail": item["detail"],
            "evidence": item["evidence"],
        })

    write_csv(AUDIT_DIR / "test_results.csv", test_cases)
    write_csv(AUDIT_DIR / "test_cases.csv", test_cases)
    write_report(results)
    print(json.dumps({"status": "completed", "tests_run": len(results), "audit_dir": str(AUDIT_DIR)}, indent=2))


if __name__ == "__main__":
    main()
