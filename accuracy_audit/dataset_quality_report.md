# Dataset Quality Report

## Source review
- `sample_outbreak_data.csv` contains 3 rows of outbreak observations from March 2024.
- `sample_outbreak_data.json` contains a single JSON example with disease name, state, district, locality, observation date, reported cases, description, and source reference.
- `backend/app/services/outbreak_data.py` contains a curated static India dataset with district-level `cases`, `weekly_change`, and `risk` fields.

## Missing labels
No dataset in the project appears to have a confirmed outbreak outcome column such as `actual_outbreak`, `confirmed_case`, `outbreak_label`, or future-case outcome. The static `risk` field is a heuristic category, not a true historical outcome label.

## Data quality findings
- missing duplicate/chronological labels: no date-specific historical outcome field is present
- missing test period split: no separate training and holdout window is defined
- missing leakage controls: no feature timestamps relative to prediction date are stored
- no explicit outbreak definition or prediction horizon is documented in the code

## Conclusion
There is not enough quality-controlled historical labeled data in this repository to compute a valid model accuracy metric.