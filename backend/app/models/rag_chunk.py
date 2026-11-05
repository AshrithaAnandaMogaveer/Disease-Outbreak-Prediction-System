from __future__ import annotations

from datetime import datetime
import uuid

from sqlalchemy import Column, String, DateTime, Integer, JSON, ForeignKey

from app.database import Base


class RAGChunk(Base):
    __tablename__ = "rag_chunks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String, ForeignKey("rag_documents.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False, default=0)
    content = Column(String, nullable=False)
    embedding = Column(JSON, nullable=False)
    chunk_metadata = Column("metadata", JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
