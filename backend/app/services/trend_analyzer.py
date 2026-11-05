"""
Trend analyzer — detects anomalies and generates AI-style insights
from the outbreak dataset.
"""
from app.services.outbreak_data import OUTBREAK_DATA, STATE_SUMMARY


def get_ai_insights() -> list[dict]:
    """Generate AI-style outbreak insights based on trend data."""
    insights = []

    # High weekly change alerts
    for record in OUTBREAK_DATA:
        if record["weekly_change"] >= 30:
            insights.append({
                "type": "critical",
                "icon": "🚨",
                "message": f"{record['disease']} cases surged {record['weekly_change']}% this week in {record['district']}, {record['state']}.",
            })
        elif record["weekly_change"] >= 15:
            insights.append({
                "type": "warning",
                "icon": "⚠️",
                "message": f"{record['disease']} rising {record['weekly_change']}% in {record['district']} — monitor closely.",
            })

    # State-level insights
    for state, data in STATE_SUMMARY.items():
        if data["risk"] == "High" and data["weekly_change"] >= 15:
            insights.append({
                "type": "warning",
                "icon": "📊",
                "message": f"{state} reports {data['total_cases']:,} total cases with {data['dominant_disease']} as dominant disease (+{data['weekly_change']}% weekly).",
            })

    # Seasonal / contextual insights (static but realistic)
    insights += [
        {"type": "info", "icon": "🌧️", "message": "Heavy rainfall in coastal Karnataka correlates with rising mosquito-borne disease activity."},
        {"type": "info", "icon": "🦟", "message": "Dengue risk elevated across 6 states — stagnant water post-monsoon is primary vector."},
        {"type": "info", "icon": "🏥", "message": "3 districts in Maharashtra moved to High-risk category this week."},
        {"type": "info", "icon": "📍", "message": "COVID-19 showing renewed uptick in metro cities — Delhi and Mumbai leading."},
        {"type": "info", "icon": "🌡️", "message": "Influenza season peak expected — northern states advised to increase surveillance."},
    ]

    return insights[:10]  # Return top 10


def get_summary_stats() -> dict:
    """Return platform-wide summary statistics."""
    total_cases = sum(r["cases"] for r in OUTBREAK_DATA)
    high_risk = sum(1 for r in OUTBREAK_DATA if r["risk"] == "High")
    avg_weekly = round(sum(r["weekly_change"] for r in OUTBREAK_DATA) / len(OUTBREAK_DATA), 1)
    active_states = len(set(r["state"] for r in OUTBREAK_DATA))

    return {
        "total_cases": total_cases,
        "high_risk_zones": high_risk,
        "avg_weekly_change": avg_weekly,
        "active_states": active_states,
        "total_districts": len(OUTBREAK_DATA),
    }


def get_nearby_outbreaks(lat: float, lng: float, radius_deg: float = 5.0) -> list[dict]:
    """Return outbreaks within approximate radius of given coordinates."""
    nearby = []
    for record in OUTBREAK_DATA:
        dlat = abs(record["lat"] - lat)
        dlng = abs(record["lng"] - lng)
        if dlat <= radius_deg and dlng <= radius_deg:
            nearby.append(record)
    # Sort by cases descending
    return sorted(nearby, key=lambda x: x["cases"], reverse=True)
