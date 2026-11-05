# Models package — import order matters for SQLAlchemy relationship resolution
from app.models.user import User, UserRole
from app.models.prediction import Prediction
from app.models.rag_document import RAGDocument
from app.models.rag_chunk import RAGChunk
from app.models.outbreak_report import OutbreakReport, OutbreakReportStatus
from app.models.published_outbreak import PublishedOutbreakRecord, OutbreakAuditEvent
from app.models.information_request import InformationRequest, InformationRequestStatus
from app.models.contact_request import ContactRequest, ContactRequestStatus, ContactRequestCategory
from app.models.anomaly_alert import AnomalyAlert, UserNotification, AlertSeverity, AlertStatus

__all__ = [
    "User", "UserRole",
    "Prediction",
    "RAGDocument", "RAGChunk",
    "OutbreakReport", "OutbreakReportStatus",
    "PublishedOutbreakRecord", "OutbreakAuditEvent",
    "InformationRequest", "InformationRequestStatus",
    "ContactRequest", "ContactRequestStatus", "ContactRequestCategory",
    "AnomalyAlert", "UserNotification", "AlertSeverity", "AlertStatus",
]
