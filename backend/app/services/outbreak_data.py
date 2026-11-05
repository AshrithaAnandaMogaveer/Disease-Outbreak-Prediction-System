"""
Static Indian outbreak dataset — district/state level.
Scalable: replace with DB or live API in production.
"""

OUTBREAK_DATA = [
    # Dengue
    {"disease": "Dengue", "district": "Bengaluru Urban", "state": "Karnataka", "cases": 3420, "weekly_change": 18.5, "risk": "High", "lat": 12.9716, "lng": 77.5946, "last_updated": "2026-05-09"},
    {"disease": "Dengue", "district": "Chennai", "state": "Tamil Nadu", "cases": 2870, "weekly_change": 12.3, "risk": "High", "lat": 13.0827, "lng": 80.2707, "last_updated": "2026-05-09"},
    {"disease": "Dengue", "district": "Mumbai", "state": "Maharashtra", "cases": 4100, "weekly_change": 22.1, "risk": "High", "lat": 19.0760, "lng": 72.8777, "last_updated": "2026-05-09"},
    {"disease": "Dengue", "district": "Hyderabad", "state": "Telangana", "cases": 1950, "weekly_change": 9.4, "risk": "Medium", "lat": 17.3850, "lng": 78.4867, "last_updated": "2026-05-09"},
    {"disease": "Dengue", "district": "Kolkata", "state": "West Bengal", "cases": 2200, "weekly_change": 14.7, "risk": "High", "lat": 22.5726, "lng": 88.3639, "last_updated": "2026-05-09"},
    {"disease": "Dengue", "district": "Pune", "state": "Maharashtra", "cases": 1340, "weekly_change": 7.2, "risk": "Medium", "lat": 18.5204, "lng": 73.8567, "last_updated": "2026-05-09"},
    {"disease": "Dengue", "district": "Ahmedabad", "state": "Gujarat", "cases": 980, "weekly_change": 5.1, "risk": "Medium", "lat": 23.0225, "lng": 72.5714, "last_updated": "2026-05-09"},
    {"disease": "Dengue", "district": "Jaipur", "state": "Rajasthan", "cases": 620, "weekly_change": 3.8, "risk": "Low", "lat": 26.9124, "lng": 75.7873, "last_updated": "2026-05-09"},
    {"disease": "Dengue", "district": "Lucknow", "state": "Uttar Pradesh", "cases": 1100, "weekly_change": 8.9, "risk": "Medium", "lat": 26.8467, "lng": 80.9462, "last_updated": "2026-05-09"},
    {"disease": "Dengue", "district": "Patna", "state": "Bihar", "cases": 760, "weekly_change": 6.3, "risk": "Medium", "lat": 25.5941, "lng": 85.1376, "last_updated": "2026-05-09"},

    # Malaria
    {"disease": "Malaria", "district": "Koraput", "state": "Odisha", "cases": 2100, "weekly_change": 15.2, "risk": "High", "lat": 18.8135, "lng": 82.7110, "last_updated": "2026-05-09"},
    {"disease": "Malaria", "district": "Gadchiroli", "state": "Maharashtra", "cases": 1800, "weekly_change": 11.4, "risk": "High", "lat": 20.1809, "lng": 80.0000, "last_updated": "2026-05-09"},
    {"disease": "Malaria", "district": "Bastar", "state": "Chhattisgarh", "cases": 2450, "weekly_change": 19.8, "risk": "High", "lat": 19.1288, "lng": 81.9661, "last_updated": "2026-05-09"},
    {"disease": "Malaria", "district": "Dibrugarh", "state": "Assam", "cases": 1320, "weekly_change": 8.7, "risk": "Medium", "lat": 27.4728, "lng": 94.9120, "last_updated": "2026-05-09"},
    {"disease": "Malaria", "district": "Ranchi", "state": "Jharkhand", "cases": 890, "weekly_change": 4.5, "risk": "Medium", "lat": 23.3441, "lng": 85.3096, "last_updated": "2026-05-09"},
    {"disease": "Malaria", "district": "Vizianagaram", "state": "Andhra Pradesh", "cases": 670, "weekly_change": 3.2, "risk": "Low", "lat": 18.1066, "lng": 83.3956, "last_updated": "2026-05-09"},

    # Flu / Influenza
    {"disease": "Influenza", "district": "Delhi", "state": "Delhi", "cases": 5600, "weekly_change": 28.3, "risk": "High", "lat": 28.6139, "lng": 77.2090, "last_updated": "2026-05-09"},
    {"disease": "Influenza", "district": "Bengaluru Urban", "state": "Karnataka", "cases": 3100, "weekly_change": 16.9, "risk": "High", "lat": 12.9716, "lng": 77.5946, "last_updated": "2026-05-09"},
    {"disease": "Influenza", "district": "Pune", "state": "Maharashtra", "cases": 2400, "weekly_change": 13.5, "risk": "Medium", "lat": 18.5204, "lng": 73.8567, "last_updated": "2026-05-09"},
    {"disease": "Influenza", "district": "Chandigarh", "state": "Punjab", "cases": 1200, "weekly_change": 7.8, "risk": "Medium", "lat": 30.7333, "lng": 76.7794, "last_updated": "2026-05-09"},
    {"disease": "Influenza", "district": "Bhopal", "state": "Madhya Pradesh", "cases": 980, "weekly_change": 5.6, "risk": "Medium", "lat": 23.2599, "lng": 77.4126, "last_updated": "2026-05-09"},
    {"disease": "Influenza", "district": "Guwahati", "state": "Assam", "cases": 740, "weekly_change": 4.1, "risk": "Low", "lat": 26.1445, "lng": 91.7362, "last_updated": "2026-05-09"},

    # COVID-19
    {"disease": "COVID-19", "district": "Mumbai", "state": "Maharashtra", "cases": 890, "weekly_change": 32.4, "risk": "High", "lat": 19.0760, "lng": 72.8777, "last_updated": "2026-05-09"},
    {"disease": "COVID-19", "district": "Delhi", "state": "Delhi", "cases": 1240, "weekly_change": 41.2, "risk": "High", "lat": 28.6139, "lng": 77.2090, "last_updated": "2026-05-09"},
    {"disease": "COVID-19", "district": "Chennai", "state": "Tamil Nadu", "cases": 560, "weekly_change": 18.7, "risk": "Medium", "lat": 13.0827, "lng": 80.2707, "last_updated": "2026-05-09"},
    {"disease": "COVID-19", "district": "Bengaluru Urban", "state": "Karnataka", "cases": 720, "weekly_change": 24.5, "risk": "High", "lat": 12.9716, "lng": 77.5946, "last_updated": "2026-05-09"},
    {"disease": "COVID-19", "district": "Hyderabad", "state": "Telangana", "cases": 430, "weekly_change": 12.1, "risk": "Medium", "lat": 17.3850, "lng": 78.4867, "last_updated": "2026-05-09"},
    {"disease": "COVID-19", "district": "Kolkata", "state": "West Bengal", "cases": 380, "weekly_change": 9.8, "risk": "Low", "lat": 22.5726, "lng": 88.3639, "last_updated": "2026-05-09"},

    # Cholera
    {"disease": "Cholera", "district": "Puri", "state": "Odisha", "cases": 340, "weekly_change": 21.3, "risk": "High", "lat": 19.8135, "lng": 85.8312, "last_updated": "2026-05-09"},
    {"disease": "Cholera", "district": "Varanasi", "state": "Uttar Pradesh", "cases": 210, "weekly_change": 14.6, "risk": "Medium", "lat": 25.3176, "lng": 82.9739, "last_updated": "2026-05-09"},
    {"disease": "Cholera", "district": "Gaya", "state": "Bihar", "cases": 180, "weekly_change": 8.9, "risk": "Medium", "lat": 24.7955, "lng": 85.0002, "last_updated": "2026-05-09"},

    # Typhoid
    {"disease": "Typhoid", "district": "Agra", "state": "Uttar Pradesh", "cases": 520, "weekly_change": 6.7, "risk": "Medium", "lat": 27.1767, "lng": 78.0081, "last_updated": "2026-05-09"},
    {"disease": "Typhoid", "district": "Indore", "state": "Madhya Pradesh", "cases": 390, "weekly_change": 4.3, "risk": "Low", "lat": 22.7196, "lng": 75.8577, "last_updated": "2026-05-09"},
    {"disease": "Typhoid", "district": "Surat", "state": "Gujarat", "cases": 460, "weekly_change": 5.8, "risk": "Medium", "lat": 21.1702, "lng": 72.8311, "last_updated": "2026-05-09"},
]

STATE_SUMMARY = {
    "Maharashtra": {"total_cases": 11510, "risk": "High", "dominant_disease": "Dengue", "weekly_change": 14.2},
    "Karnataka": {"total_cases": 7240, "risk": "High", "dominant_disease": "Dengue", "weekly_change": 17.7},
    "Tamil Nadu": {"total_cases": 3430, "risk": "High", "dominant_disease": "Dengue", "weekly_change": 12.3},
    "Delhi": {"total_cases": 6840, "risk": "High", "dominant_disease": "COVID-19", "weekly_change": 36.8},
    "West Bengal": {"total_cases": 2580, "risk": "Medium", "dominant_disease": "Dengue", "weekly_change": 12.3},
    "Telangana": {"total_cases": 2380, "risk": "Medium", "dominant_disease": "Dengue", "weekly_change": 10.8},
    "Odisha": {"total_cases": 2440, "risk": "High", "dominant_disease": "Malaria", "weekly_change": 18.3},
    "Uttar Pradesh": {"total_cases": 1830, "risk": "Medium", "dominant_disease": "Influenza", "weekly_change": 7.6},
    "Bihar": {"total_cases": 940, "risk": "Medium", "dominant_disease": "Dengue", "weekly_change": 6.3},
    "Assam": {"total_cases": 2060, "risk": "Medium", "dominant_disease": "Malaria", "weekly_change": 6.4},
    "Chhattisgarh": {"total_cases": 2450, "risk": "High", "dominant_disease": "Malaria", "weekly_change": 19.8},
    "Jharkhand": {"total_cases": 890, "risk": "Medium", "dominant_disease": "Malaria", "weekly_change": 4.5},
    "Gujarat": {"total_cases": 1440, "risk": "Medium", "dominant_disease": "Dengue", "weekly_change": 5.5},
    "Rajasthan": {"total_cases": 620, "risk": "Low", "dominant_disease": "Dengue", "weekly_change": 3.8},
    "Madhya Pradesh": {"total_cases": 1370, "risk": "Medium", "dominant_disease": "Influenza", "weekly_change": 5.0},
    "Andhra Pradesh": {"total_cases": 670, "risk": "Low", "dominant_disease": "Malaria", "weekly_change": 3.2},
    "Punjab": {"total_cases": 1200, "risk": "Medium", "dominant_disease": "Influenza", "weekly_change": 7.8},
}
