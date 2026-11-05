import math
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.outbreak_report import OutbreakReport, OutbreakReportStatus
from app.models.published_outbreak import OutbreakAuditEvent, PublishedOutbreakRecord
from app.models.user import User
from app.schemas.outbreak_schema import OutbreakReportResponse, OutbreakReportSubmission, PublishedOutbreakResponse
from app.services.geocode_service import get_coords_for_location, INDIA_GEO
from app.utils.role_checker import require_admin, require_user

router = APIRouter()


# ─── helpers ─────────────────────────────────────────────────────────────────

def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in kilometres."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _resolve_coords(record: PublishedOutbreakRecord) -> tuple[float | None, float | None]:
    """
    Return (lat, lng) for a record.
    Uses stored values if present; falls back to the curated geocode table.
    Never fabricates coordinates — returns (None, None) if unknown.
    """
    if record.latitude is not None and record.longitude is not None:
        return record.latitude, record.longitude
    result = get_coords_for_location(record.state, record.district)
    if result:
        return result
    return None, None


def _serialize_public_record(record: PublishedOutbreakRecord, distance_km: float | None = None) -> dict:
    lat, lng = _resolve_coords(record)
    d = {
        "id": record.id,
        "disease": record.disease,
        "state": record.state,
        "district": record.district,
        "locality": record.locality,
        "reported_cases": record.reported_cases,
        "deaths": record.deaths,
        "risk_level": record.risk_level,
        "reporting_start": record.reporting_start.isoformat() if record.reporting_start else None,
        "reporting_end": record.reporting_end.isoformat() if record.reporting_end else None,
        "source_name": record.source_name,
        "source_reference": record.source_reference,
        "description": record.description,
        "latitude": lat,
        "longitude": lng,
        "has_exact_coords": record.latitude is not None and record.longitude is not None,
        "publication_status": record.publication_status,
        "reviewer_id": record.reviewer_id,
        "created_by_admin_id": record.created_by_admin_id,
        "published_at": record.published_at.isoformat() if record.published_at else None,
        "created_at": record.created_at.isoformat() if record.created_at else None,
        "updated_at": record.updated_at.isoformat() if record.updated_at else None,
    }
    if distance_km is not None:
        d["distance_km"] = round(distance_km, 1)
    return d


# ─── user-submitted reports ───────────────────────────────────────────────────

@router.post("/outbreaks/reports", response_model=OutbreakReportResponse, status_code=status.HTTP_201_CREATED)
def submit_outbreak_report(
    payload: OutbreakReportSubmission,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Persist a user-submitted outbreak report (Pending — never public until approved)."""
    report = OutbreakReport(
        submitter_id=current_user.id,
        disease_name=payload.disease_name.strip(),
        state=payload.state.strip(),
        district=payload.district.strip() if payload.district else None,
        locality=payload.locality.strip() if payload.locality else None,
        observation_date=payload.observation_date,
        description=payload.description.strip(),
        reported_cases=payload.reported_cases,
        source_reference=payload.source_reference.strip() if payload.source_reference else None,
        status=OutbreakReportStatus.PENDING.value,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    db.add(OutbreakAuditEvent(
        report_id=report.id,
        actor_user_id=current_user.id,
        action="submitted",
        details="User submitted a possible outbreak report for admin review.",
    ))
    db.commit()
    return report


@router.get("/outbreaks/my-reports", response_model=list[OutbreakReportResponse])
def get_my_reports(
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(OutbreakReport)
        .filter(OutbreakReport.submitter_id == current_user.id)
        .order_by(OutbreakReport.created_at.desc())
        .all()
    )


# ─── public feed ─────────────────────────────────────────────────────────────

@router.get("/outbreaks")
def list_outbreaks(
    disease: str = Query(default=None),
    state: str = Query(default=None),
    district: str = Query(default=None),
    risk: str = Query(default=None),
    limit: int = Query(default=25, ge=1, le=100),
    skip: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    """Return only published outbreak records."""
    query = db.query(PublishedOutbreakRecord).filter(
        PublishedOutbreakRecord.publication_status == "published"
    )
    if disease:
        query = query.filter(PublishedOutbreakRecord.disease.ilike(f"%{disease}%"))
    if state:
        query = query.filter(PublishedOutbreakRecord.state.ilike(f"%{state}%"))
    if district:
        query = query.filter(PublishedOutbreakRecord.district.ilike(f"%{district}%"))
    if risk:
        query = query.filter(PublishedOutbreakRecord.risk_level.ilike(f"%{risk}%"))

    total = query.count()
    items = query.order_by(PublishedOutbreakRecord.published_at.desc().nullslast()).offset(skip).limit(limit).all()
    return {"items": [_serialize_public_record(item) for item in items], "total": total}


# ─── heatmap (coordinate-enriched) ───────────────────────────────────────────

@router.get("/outbreaks/heatmap")
def heatmap_points(
    disease: str = Query(default=None),
    state: str = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    Return geo-located points for the India heatmap.
    Records with stored lat/lng use those values.
    Records without stored coords use the curated India geocode table as fallback.
    The `has_exact_coords` flag distinguishes the two.
    """
    query = db.query(PublishedOutbreakRecord).filter(
        PublishedOutbreakRecord.publication_status == "published"
    )
    if disease:
        query = query.filter(PublishedOutbreakRecord.disease.ilike(f"%{disease}%"))
    if state:
        query = query.filter(PublishedOutbreakRecord.state.ilike(f"%{state}%"))

    points = []
    for record in query.order_by(PublishedOutbreakRecord.published_at.desc().nullslast()).all():
        lat, lng = _resolve_coords(record)
        if lat is None or lng is None:
            continue
        points.append({
            "lat": lat,
            "lng": lng,
            "intensity": record.reported_cases or 1,
            "district": record.district,
            "state": record.state,
            "disease": record.disease,
            "risk": record.risk_level,
            "reported_cases": record.reported_cases,
            "published_at": record.published_at.isoformat() if record.published_at else None,
            "has_exact_coords": record.latitude is not None,
            "record_id": record.id,
        })

    return {"points": points, "total": len(points)}


# ─── reverse-geocode endpoint (for frontend location detection) ───────────────

@router.get("/outbreaks/reverse-geocode")
def reverse_geocode_coords(
    lat: float = Query(..., ge=6.0, le=38.0),
    lng: float = Query(..., ge=68.0, le=98.0),
):
    """
    Resolve a lat/lng within India to state/district using Nominatim.
    Coordinates must be within India bounds (6–38°N, 68–98°E).
    Rate-limited server-side to 1 req/sec. Result is cached in-process.
    """
    from app.services.geocode_service import reverse_geocode
    result = reverse_geocode(lat, lng)
    return {
        "lat": lat,
        "lng": lng,
        "state": result.get("state", ""),
        "district": result.get("district", ""),
        "display": result.get("display", ""),
    }


# ─── nearby outbreaks (Haversine + administrative fallback) ───────────────────

@router.get("/outbreaks/nearby")
def nearby_outbreaks(
    lat: float = Query(...),
    lng: float = Query(...),
    radius_km: float = Query(default=100.0, ge=5.0, le=500.0),
    state: str = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    Return published outbreak records within `radius_km` of (lat, lng).
    Uses Haversine distance when coordinates are available.
    Falls back to state-level matching for records without coordinates.
    Distance is only reported when calculated from real coordinates.
    """
    # Validate lat/lng are plausibly in India
    if not (6.0 <= lat <= 38.0 and 68.0 <= lng <= 98.0):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Coordinates must be within India bounds (lat 6–38°N, lng 68–98°E).",
        )

    query = db.query(PublishedOutbreakRecord).filter(
        PublishedOutbreakRecord.publication_status == "published"
    )
    if state:
        query = query.filter(PublishedOutbreakRecord.state.ilike(f"%{state}%"))

    results = []
    for record in query.all():
        rec_lat, rec_lng = _resolve_coords(record)
        if rec_lat is not None and rec_lng is not None:
            dist = _haversine_km(lat, lng, rec_lat, rec_lng)
            if dist <= radius_km:
                serialized = _serialize_public_record(record, distance_km=dist)
                results.append(serialized)
        else:
            # No coordinates at all — skip (do not fabricate proximity)
            pass

    results.sort(key=lambda x: x.get("distance_km", 9999))
    return {"data": results, "total": len(results), "radius_km": radius_km}


# ─── administrative-proximity search (state/district name matching) ───────────

@router.get("/outbreaks/in-area")
def outbreaks_in_area(
    state: str = Query(...),
    district: str = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    Return published outbreaks in the same state/district.
    Used when the user has chosen a location manually or when no exact coords exist.
    Labels: same_district or same_state.
    """
    query = db.query(PublishedOutbreakRecord).filter(
        PublishedOutbreakRecord.publication_status == "published",
        PublishedOutbreakRecord.state.ilike(f"%{state}%"),
    )
    results = []
    for record in query.order_by(PublishedOutbreakRecord.published_at.desc().nullslast()).all():
        serialized = _serialize_public_record(record)
        if district and record.district and district.lower() in record.district.lower():
            serialized["proximity_label"] = "same_district"
        else:
            serialized["proximity_label"] = "same_state"
        results.append(serialized)

    return {"data": results, "total": len(results), "state": state, "district": district}


# ─── India state/district list for manual selector ───────────────────────────

@router.get("/outbreaks/india-locations")
def india_locations():
    """
    Return the curated India state and district list for the manual location selector.
    Grouped by state; districts within each state included.
    """
    grouped: dict[str, list[str]] = {}
    for row in INDIA_GEO:
        s = row["state"]
        d = row["district"]
        if s not in grouped:
            grouped[s] = []
        if d and d not in grouped[s]:
            grouped[s].append(d)

    states = sorted(grouped.keys())
    result = []
    for s in states:
        result.append({
            "state": s,
            "districts": sorted(grouped[s]),
        })
    return {"locations": result, "state_count": len(result)}


# ─── summary endpoints (unchanged) ───────────────────────────────────────────

@router.get("/outbreaks/states")
def state_summary(db: Session = Depends(get_db)):
    rows = (
        db.query(
            PublishedOutbreakRecord.state,
            func.sum(PublishedOutbreakRecord.reported_cases).label("total_cases"),
            func.count(PublishedOutbreakRecord.id).label("record_count"),
            func.max(PublishedOutbreakRecord.published_at).label("last_updated"),
        )
        .filter(PublishedOutbreakRecord.publication_status == "published")
        .group_by(PublishedOutbreakRecord.state)
        .all()
    )
    summary = {}
    for state, total_cases, record_count, last_updated in rows:
        summary[state] = {
            "total_cases": int(total_cases or 0),
            "record_count": int(record_count or 0),
            "last_updated": last_updated.isoformat() if last_updated else None,
        }
    return {"data": summary}


@router.get("/outbreaks/diseases")
def disease_list(db: Session = Depends(get_db)):
    diseases = [
        d[0]
        for d in db.query(PublishedOutbreakRecord.disease)
        .filter(PublishedOutbreakRecord.publication_status == "published")
        .distinct()
        .order_by(PublishedOutbreakRecord.disease.asc())
        .all()
    ]
    return {"diseases": diseases}


@router.get("/outbreaks/stats")
def summary_stats(db: Session = Depends(get_db)):
    published = db.query(PublishedOutbreakRecord).filter(
        PublishedOutbreakRecord.publication_status == "published"
    )
    total_records = published.count()
    total_cases = sum(item.reported_cases or 0 for item in published.all())
    high_risk = published.filter(PublishedOutbreakRecord.risk_level.ilike("%high%")).count()
    states = (
        db.query(PublishedOutbreakRecord.state)
        .filter(PublishedOutbreakRecord.publication_status == "published")
        .distinct()
        .count()
    )
    return {
        "total_records": total_records,
        "total_cases": total_cases,
        "high_risk_records": high_risk,
        "states_represented": states,
        "updated_recently": published.filter(
            PublishedOutbreakRecord.published_at
            >= datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        ).count(),
    }
