# Accuracy Audit Report

## Scope
This audit inspects the current application without changing any existing functionality. It validates the implemented risk formula, the RAG guardrail behavior, and the alert delivery logic in an isolated in-memory database.

## Actual prediction method
The running application uses a deterministic weighted heuristic in `backend/app/services/prediction_service.py`, not a trained machine-learning model.

Formula:
- risk_score = (0.4 * new_cases + 0.2 * rainfall + 0.2 * humidity + 0.1 * population_density + 0.1 * hospital_admissions)
- normalized_score = min(max(risk_score / 10, 0), 100)
- Low <= 30, Medium <= 60, High > 60

## Evidence of no trained model
- No model files, pickles, sklearn/xgboost/tensorflow/pytorch artifacts were found under the project tree.
- `backend/requirements.txt` does not include ML runtime libraries such as scikit-learn or xgboost.
- The code path in `PredictionService.analyze_prediction()` directly calls the weighted formula and returns a risk score without loading any model object.

## Data provenance and quality
- `sample_outbreak_data.csv` and `sample_outbreak_data.json` contain examples of outbreak submissions, but no confirmed outcome labels or future case counts.
- `backend/app/services/outbreak_data.py` stores static district/state summaries with `risk`, `weekly_change`, and `cases`, but no actual outbreak label or verification of future cases.
- Official-source verification for the likely public data sources was attempted against `https://idsp.ncdc.gov.in/`, `https://ksdhs.karnataka.gov.in/`, `https://nhm.gov.in/`, `https://www.imd.gov.in/`, and `https://www.data.gov.in/`.
- From this environment, `idsp.ncdc.gov.in` and `ksdhs.karnataka.gov.in` failed DNS resolution (`getaddrinfo failed`), while `nhm.gov.in` and `data.gov.in` responded with HTTP 200 but did not expose a verified downloadable historical disease dataset with date-stamped confirmed outbreak outcomes for Karnataka or the required prediction features.
- Therefore, empirical prediction accuracy cannot be measured from the project data alone.

## Official-source conclusion
No suitable real historical disease dataset was verified from the official public sources that were directly checked. The public portals available from this environment either do not resolve, do not expose machine-readable health records, or do not provide a date-stamped, location-specific, confirmed-outbreak dataset with the feature values needed for a valid backtest.

## Test environment and commands
- `cd backend && .\venv\Scripts\python -c "..."` used for direct formula verification.
- `pytest` was not available in the active backend environment (`No module named pytest`).
- All validation files generated under `accuracy_audit/` used isolated in-memory SQLite and did not write to the application database.

## Results
- Formula validation: executed on representative boundary values and climate adjustments.
- Validation tests: negative/invalid inputs were rejected as expected.
- RAG guardrail: unsupported diagnosis requests were rejected.
- Alert delivery: in-memory alert creation produced one user notification row as expected.

## Limitations
- Temperature is accepted in the input schema but not used in the risk formula; the implementation compares only rainfall and humidity, not temperature.
- The system has no true historical labeled dataset, so accuracy, precision, recall, ROC-AUC, and confusion-matrix metrics remain unmeasurable in this project.
- The Mistral integration depends on a local LM Studio server and is not guaranteed to be running in all environments.

## Recommendation
The next step for real accuracy measurement would be to obtain a dataset with date, location, feature snapshot, and confirmed outbreak outcomes for a valid historical evaluation window. The application should then use that dataset to evaluate predictions chronologically without leakage.