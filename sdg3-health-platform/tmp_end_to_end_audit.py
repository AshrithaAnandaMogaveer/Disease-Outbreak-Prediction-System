from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.models.outbreak_report import OutbreakReport, OutbreakReportStatus
from app.models.published_outbreak import PublishedOutbreakRecord
from app.utils.security import get_password_hash

Base.metadata.create_all(bind=engine)
db = SessionLocal()
for model in [User, OutbreakReport, PublishedOutbreakRecord]:
    db.query(model).delete()
    db.commit()
db.close()

client = TestClient(app)
# create users
client.post('/api/auth/signup', json={'email':'audit_user@example.com','password':'pw123','name':'Audit User'})
client.post('/api/auth/signup/admin', json={'email':'audit_admin@example.com','password':'pw123','name':'Audit Admin','admin_secret_key':'SDG3_ADMIN_2026'})
user_token = client.post('/api/auth/login', json={'email':'audit_user@example.com','password':'pw123'}).json()['access_token']
admin_token = client.post('/api/auth/login', json={'email':'audit_admin@example.com','password':'pw123'}).json()['access_token']

report = client.post('/api/outbreaks/reports', headers={'Authorization': f'Bearer {user_token}'}, json={'disease_name':'Chikungunya','state':'Tamil Nadu','district':'Chennai','locality':'Royapettah','description':'Several residents developed fever and joint pain this week.','reported_cases':28,'source_reference':'Local clinic report'})
print('REPORT_STATUS', report.status_code)
print('PUBLIC_BEFORE', client.get('/api/outbreaks').json()['total'])

review = client.post(f"/api/admin/outbreak-reports/{report.json()['id']}/review", headers={'Authorization': f'Bearer {admin_token}'}, json={'status':'approved','decision_reason':'Field report validated','review_notes':'Approved after review'})
print('REVIEW_STATUS', review.status_code, review.json()['status'])
print('PUBLIC_AFTER_APPROVAL', client.get('/api/outbreaks').json()['total'])

rejected = client.post('/api/outbreaks/reports', headers={'Authorization': f'Bearer {user_token}'}, json={'disease_name':'Malaria','state':'Odisha','district':'Cuttack','description':'Possible cluster after rainwater stagnation.','reported_cases':7,'source_reference':'Field observation'})
client.post(f"/api/admin/outbreak-reports/{rejected.json()['id']}/review", headers={'Authorization': f'Bearer {admin_token}'}, json={'status':'rejected','decision_reason':'Insufficient evidence','review_notes':'Rejected'})
print('REJECTED_PUBLIC_COUNT', client.get('/api/outbreaks').json()['total'])

case_data = client.post('/api/admin/case-data', headers={'Authorization': f'Bearer {admin_token}'}, json={'disease':'Dengue','state':'Kerala','district':'Thiruvananthapuram','reported_cases':19,'risk_level':'High','source_name':'State health bulletin','description':'Verified dengue cases recorded by the district surveillance unit.','latitude':8.5241,'longitude':76.9366})
print('CASE_DATA_STATUS', case_data.status_code)
print('PUBLIC_FINAL', client.get('/api/outbreaks').json()['total'])
print('PUBLIC_NAMES', [item['disease'] for item in client.get('/api/outbreaks').json()['items']])
