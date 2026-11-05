"""
Geocode service — two responsibilities:

1. FORWARD GEOCODING (state/district → lat/lng):
   Uses the curated India state/district coordinate table below.
   This avoids any external API dependency for known Indian districts.

2. REVERSE GEOCODING (lat/lng → state/district):
   Uses the Nominatim OpenStreetMap API (free, no key required).
   Rate-limited to 1 request per second per OSM usage policy.
   Results are cached in-process for the lifetime of the server.

Usage policy: Nominatim requires a descriptive User-Agent and max 1 req/s.
We never send the user's coordinates to any third party beyond Nominatim,
and we never store precise user coordinates in the database.
"""
from __future__ import annotations

import json
import math
import time
from typing import Optional
from urllib.request import Request, urlopen
from urllib.error import URLError

# ─── In-process reverse-geocode cache ───────────────────────────────────────
# Key: (rounded_lat_3dp, rounded_lng_3dp)  → {"state": str, "district": str}
_REVERSE_CACHE: dict = {}
_LAST_NOMINATIM_CALL: float = 0.0


# ─── India state/district centroid lookup table ──────────────────────────────
# Coordinates are well-known administrative centroids, NOT user coordinates.
# District entries take precedence; state entries serve as fallback.
INDIA_GEO: list[dict] = [
    # ── Karnataka ──────────────────────────────────────────────────────────
    {"state": "Karnataka", "district": "Bengaluru Urban",    "lat": 12.9716, "lng": 77.5946},
    {"state": "Karnataka", "district": "Mysuru",             "lat": 12.2958, "lng": 76.6394},
    {"state": "Karnataka", "district": "Mangaluru",          "lat": 12.9141, "lng": 74.8560},
    {"state": "Karnataka", "district": "Hubballi",           "lat": 15.3647, "lng": 75.1240},
    {"state": "Karnataka", "district": None,                  "lat": 15.3173, "lng": 75.7139},  # state centroid
    # ── Tamil Nadu ─────────────────────────────────────────────────────────
    {"state": "Tamil Nadu", "district": "Chennai",           "lat": 13.0827, "lng": 80.2707},
    {"state": "Tamil Nadu", "district": "Coimbatore",        "lat": 11.0168, "lng": 76.9558},
    {"state": "Tamil Nadu", "district": "Madurai",           "lat":  9.9252, "lng": 78.1198},
    {"state": "Tamil Nadu", "district": None,                 "lat": 11.1271, "lng": 78.6569},
    # ── Maharashtra ────────────────────────────────────────────────────────
    {"state": "Maharashtra", "district": "Mumbai",           "lat": 19.0760, "lng": 72.8777},
    {"state": "Maharashtra", "district": "Pune",             "lat": 18.5204, "lng": 73.8567},
    {"state": "Maharashtra", "district": "Nagpur",           "lat": 21.1458, "lng": 79.0882},
    {"state": "Maharashtra", "district": "Nashik",           "lat": 20.0112, "lng": 73.7908},
    {"state": "Maharashtra", "district": "Gadchiroli",       "lat": 20.1809, "lng": 80.0000},
    {"state": "Maharashtra", "district": None,                "lat": 19.7515, "lng": 75.7139},
    # ── Telangana ──────────────────────────────────────────────────────────
    {"state": "Telangana", "district": "Hyderabad",          "lat": 17.3850, "lng": 78.4867},
    {"state": "Telangana", "district": "Warangal",           "lat": 17.9784, "lng": 79.5941},
    {"state": "Telangana", "district": None,                  "lat": 18.1124, "lng": 79.0193},
    # ── West Bengal ────────────────────────────────────────────────────────
    {"state": "West Bengal", "district": "Kolkata",          "lat": 22.5726, "lng": 88.3639},
    {"state": "West Bengal", "district": "Howrah",           "lat": 22.5958, "lng": 88.2636},
    {"state": "West Bengal", "district": None,                "lat": 22.9868, "lng": 87.8550},
    # ── Gujarat ────────────────────────────────────────────────────────────
    {"state": "Gujarat", "district": "Ahmedabad",            "lat": 23.0225, "lng": 72.5714},
    {"state": "Gujarat", "district": "Surat",                "lat": 21.1702, "lng": 72.8311},
    {"state": "Gujarat", "district": None,                    "lat": 22.2587, "lng": 71.1924},
    # ── Rajasthan ──────────────────────────────────────────────────────────
    {"state": "Rajasthan", "district": "Jaipur",             "lat": 26.9124, "lng": 75.7873},
    {"state": "Rajasthan", "district": "Jodhpur",            "lat": 26.2389, "lng": 73.0243},
    {"state": "Rajasthan", "district": None,                  "lat": 27.0238, "lng": 74.2179},
    # ── Uttar Pradesh ──────────────────────────────────────────────────────
    {"state": "Uttar Pradesh", "district": "Lucknow",        "lat": 26.8467, "lng": 80.9462},
    {"state": "Uttar Pradesh", "district": "Agra",           "lat": 27.1767, "lng": 78.0081},
    {"state": "Uttar Pradesh", "district": "Varanasi",       "lat": 25.3176, "lng": 82.9739},
    {"state": "Uttar Pradesh", "district": None,              "lat": 26.8467, "lng": 80.9462},
    # ── Bihar ──────────────────────────────────────────────────────────────
    {"state": "Bihar", "district": "Patna",                  "lat": 25.5941, "lng": 85.1376},
    {"state": "Bihar", "district": "Gaya",                   "lat": 24.7955, "lng": 85.0002},
    {"state": "Bihar", "district": None,                      "lat": 25.0961, "lng": 85.3131},
    # ── Odisha ─────────────────────────────────────────────────────────────
    {"state": "Odisha", "district": "Koraput",               "lat": 18.8135, "lng": 82.7110},
    {"state": "Odisha", "district": "Puri",                  "lat": 19.8135, "lng": 85.8312},
    {"state": "Odisha", "district": "Bhubaneswar",           "lat": 20.2961, "lng": 85.8245},
    {"state": "Odisha", "district": None,                     "lat": 20.9517, "lng": 85.0985},
    # ── Chhattisgarh ───────────────────────────────────────────────────────
    {"state": "Chhattisgarh", "district": "Bastar",          "lat": 19.1288, "lng": 81.9661},
    {"state": "Chhattisgarh", "district": "Raipur",          "lat": 21.2514, "lng": 81.6296},
    {"state": "Chhattisgarh", "district": None,               "lat": 21.2787, "lng": 81.8661},
    # ── Assam ──────────────────────────────────────────────────────────────
    {"state": "Assam", "district": "Dibrugarh",              "lat": 27.4728, "lng": 94.9120},
    {"state": "Assam", "district": "Guwahati",               "lat": 26.1445, "lng": 91.7362},
    {"state": "Assam", "district": None,                      "lat": 26.2006, "lng": 92.9376},
    # ── Jharkhand ──────────────────────────────────────────────────────────
    {"state": "Jharkhand", "district": "Ranchi",             "lat": 23.3441, "lng": 85.3096},
    {"state": "Jharkhand", "district": None,                  "lat": 23.6102, "lng": 85.2799},
    # ── Andhra Pradesh ─────────────────────────────────────────────────────
    {"state": "Andhra Pradesh", "district": "Vizianagaram",  "lat": 18.1066, "lng": 83.3956},
    {"state": "Andhra Pradesh", "district": "Visakhapatnam", "lat": 17.6868, "lng": 83.2185},
    {"state": "Andhra Pradesh", "district": None,             "lat": 15.9129, "lng": 79.7400},
    # ── Delhi ──────────────────────────────────────────────────────────────
    {"state": "Delhi", "district": "Delhi",                  "lat": 28.6139, "lng": 77.2090},
    {"state": "Delhi", "district": None,                      "lat": 28.6139, "lng": 77.2090},
    # ── Punjab ─────────────────────────────────────────────────────────────
    {"state": "Punjab", "district": "Chandigarh",            "lat": 30.7333, "lng": 76.7794},
    {"state": "Punjab", "district": "Ludhiana",              "lat": 30.9010, "lng": 75.8573},
    {"state": "Punjab", "district": None,                     "lat": 31.1471, "lng": 75.3412},
    # ── Madhya Pradesh ─────────────────────────────────────────────────────
    {"state": "Madhya Pradesh", "district": "Bhopal",        "lat": 23.2599, "lng": 77.4126},
    {"state": "Madhya Pradesh", "district": "Indore",        "lat": 22.7196, "lng": 75.8577},
    {"state": "Madhya Pradesh", "district": None,             "lat": 22.9734, "lng": 78.6569},
    # ── Remaining states (centroid only) ───────────────────────────────────
    {"state": "Himachal Pradesh", "district": None,           "lat": 31.1048, "lng": 77.1734},
    {"state": "Uttarakhand",      "district": None,           "lat": 30.0668, "lng": 79.0193},
    {"state": "Haryana",          "district": None,           "lat": 29.0588, "lng": 76.0856},
    {"state": "Jammu and Kashmir","district": None,           "lat": 33.7782, "lng": 76.5762},
    {"state": "Ladakh",           "district": None,           "lat": 34.1526, "lng": 77.5771},
    {"state": "Manipur",          "district": None,           "lat": 24.6637, "lng": 93.9063},
    {"state": "Meghalaya",        "district": None,           "lat": 25.4670, "lng": 91.3662},
    {"state": "Mizoram",          "district": None,           "lat": 23.1645, "lng": 92.9376},
    {"state": "Nagaland",         "district": None,           "lat": 26.1584, "lng": 94.5624},
    {"state": "Sikkim",           "district": None,           "lat": 27.5330, "lng": 88.5122},
    {"state": "Tripura",          "district": None,           "lat": 23.9408, "lng": 91.9882},
    {"state": "Arunachal Pradesh","district": None,           "lat": 28.2180, "lng": 94.7278},
    {"state": "Goa",              "district": None,           "lat": 15.2993, "lng": 74.1240},
    {"state": "Kerala",           "district": None,           "lat":  8.5241, "lng": 76.9366},
    {"state": "Chandigarh",       "district": None,           "lat": 30.7333, "lng": 76.7794},
    {"state": "Puducherry",       "district": None,           "lat": 11.9416, "lng": 79.8083},
    {"state": "Andaman and Nicobar Islands", "district": None,"lat": 11.7401, "lng": 92.6586},
    {"state": "Lakshadweep",      "district": None,           "lat": 10.5667, "lng": 72.6417},
    {
        "state": "Dadra and Nagar Haveli and Daman and Diu",
        "district": None,
        "lat": 20.1809,
        "lng": 73.0169,
    },
]

# ─── Build lookup indexes ────────────────────────────────────────────────────
def _normalize(s: Optional[str]) -> str:
    return (s or "").strip().lower()

_DISTRICT_INDEX: dict[tuple, dict] = {}  # (state_norm, district_norm) → row
_STATE_INDEX:    dict[str, dict]   = {}  # state_norm → centroid row

for _row in INDIA_GEO:
    _sn = _normalize(_row["state"])
    _dn = _normalize(_row["district"]) if _row["district"] else None
    if _dn:
        _DISTRICT_INDEX[(_sn, _dn)] = _row
    else:
        if _sn not in _STATE_INDEX:
            _STATE_INDEX[_sn] = _row


def get_coords_for_location(state: str, district: Optional[str] = None) -> Optional[tuple[float, float]]:
    """
    Return (lat, lng) for an Indian state/district using the curated table.
    Tries district match first, falls back to state centroid.
    Returns None if neither is found.
    """
    sn = _normalize(state)
    if district:
        dn = _normalize(district)
        row = _DISTRICT_INDEX.get((sn, dn))
        if row:
            return row["lat"], row["lng"]
    row = _STATE_INDEX.get(sn)
    if row:
        return row["lat"], row["lng"]
    return None


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate great-circle distance in kilometres between two points."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def reverse_geocode(lat: float, lng: float) -> dict:
    """
    Resolve (lat, lng) → {"state": str, "district": str | None, "display": str}.

    Uses Nominatim OpenStreetMap API.
    Rate-limited to 1 request/second per OSM usage policy.
    Results cached in-process. Precision rounded to 3 d.p. for cache key.

    Returns a dict with empty strings on failure — never raises.
    """
    global _LAST_NOMINATIM_CALL

    cache_key = (round(lat, 3), round(lng, 3))
    if cache_key in _REVERSE_CACHE:
        return _REVERSE_CACHE[cache_key]

    # Enforce 1 req/sec rate limit
    elapsed = time.time() - _LAST_NOMINATIM_CALL
    if elapsed < 1.1:
        time.sleep(1.1 - elapsed)

    result = {"state": "", "district": "", "display": ""}
    try:
        url = (
            f"https://nominatim.openstreetmap.org/reverse"
            f"?lat={lat}&lon={lng}&format=json&addressdetails=1"
        )
        req = Request(url, headers={"User-Agent": "SDG3-HealthPlatform/1.0 disease-outbreak-prediction"})
        _LAST_NOMINATIM_CALL = time.time()
        with urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode())

        address = data.get("address", {})
        state   = address.get("state", "")
        district = (
            address.get("district")
            or address.get("county")
            or address.get("city")
            or address.get("town")
            or address.get("village")
            or ""
        )
        display = data.get("display_name", "")
        result = {"state": state, "district": district, "display": display}
    except (URLError, Exception):
        # Network failure or timeout — return empty gracefully
        pass

    _REVERSE_CACHE[cache_key] = result
    return result


def find_nearby_by_admin(state: str, district: Optional[str] = None) -> list[dict]:
    """
    Return INDIA_GEO records for the same state (and optionally district).
    Used for administrative-proximity matching when coordinates are unavailable.
    """
    sn = _normalize(state)
    results = []
    for row in INDIA_GEO:
        if _normalize(row["state"]) == sn:
            if district is None or _normalize(row.get("district") or "") == _normalize(district):
                results.append(row)
    return results
