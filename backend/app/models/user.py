from sqlalchemy import Column, String, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from app.database import Base

class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Extended profile fields (added — safe because nullable)
    location = Column(String, nullable=True)   # free-text, user-supplied
    bio = Column(String, nullable=True)

    # Password reset
    reset_token = Column(String, nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)

    # Relationship
    predictions = relationship("Prediction", back_populates="user", cascade="all, delete-orphan")
    submitted_reports = relationship(
        "OutbreakReport",
        foreign_keys="[OutbreakReport.submitter_id]",
        back_populates="submitter",
        cascade="all, delete-orphan",
    )
    reviewed_reports = relationship(
        "OutbreakReport",
        foreign_keys="[OutbreakReport.reviewer_id]",
        back_populates="reviewer",
    )
    reviewed_outbreaks = relationship(
        "PublishedOutbreakRecord",
        foreign_keys="[PublishedOutbreakRecord.reviewer_id]",
        back_populates="reviewer",
    )
    created_outbreaks = relationship(
        "PublishedOutbreakRecord",
        foreign_keys="[PublishedOutbreakRecord.created_by_admin_id]",
        back_populates="created_by_admin",
    )
    audit_events = relationship(
        "OutbreakAuditEvent",
        foreign_keys="[OutbreakAuditEvent.actor_user_id]",
        back_populates="actor",
    )
    information_requests = relationship(
        "InformationRequest",
        foreign_keys="[InformationRequest.user_id]",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    answered_information_requests = relationship(
        "InformationRequest",
        foreign_keys="[InformationRequest.admin_id]",
        back_populates="admin",
    )
    contact_requests = relationship(
        "ContactRequest",
        foreign_keys="[ContactRequest.user_id]",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    reviewed_contact_requests = relationship(
        "ContactRequest",
        foreign_keys="[ContactRequest.admin_id]",
        back_populates="admin",
    )
    # Alert relationships
    created_alerts = relationship(
        "AnomalyAlert",
        foreign_keys="[AnomalyAlert.created_by_id]",
        back_populates="created_by",
    )
    notifications = relationship(
        "UserNotification",
        foreign_keys="[UserNotification.user_id]",
        back_populates="user",
        cascade="all, delete-orphan",
    )
