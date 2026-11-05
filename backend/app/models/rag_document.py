from __future__ import annotations

from datetime import datetime
import uuid

from sqlalchemy import Column, String, DateTime, Float, Text

from app.database import Base


class RAGDocument(Base):
    __tablename__ = "rag_documents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    source_name = Column(String, nullable=False)
    source_url = Column(String, nullable=False)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False, default="health")
    geography = Column(String, nullable=True)
    published_at = Column(DateTime, nullable=True)
    fetched_at = Column(DateTime, default=datetime.utcnow)
    content_hash = Column(String, unique=True, nullable=False)
    credibility = Column(Float, default=0.0)
    status = Column(String, default="active")
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
