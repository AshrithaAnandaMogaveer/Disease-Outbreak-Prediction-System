from __future__ import annotations

import hashlib
import json
from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional

from sqlalchemy.orm import Session

from app.models.rag_chunk import RAGChunk
from app.models.rag_document import RAGDocument
from app.rag.embeddings import build_embedding


class VectorStore:
    def __init__(self, db: Session):
        self.db = db

    def _build_content_hash(self, title: str, content: str, source_url: str) -> str:
        payload = json.dumps({"title": title, "content": content, "source_url": source_url}, sort_keys=True)
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    def store_document(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        content = (payload.get("content") or "").strip()
        title = (payload.get("title") or "Untitled source").strip()
        source_name = payload.get("source_name") or "Trusted source"
        source_url = payload.get("source_url") or "https://example.com"
        category = payload.get("category") or "health"
        geography = payload.get("geography") or "India"
        published_at = payload.get("published_at")
        credibility = float(payload.get("credibility") or 0.0)

        content_hash = self._build_content_hash(title, content, source_url)
        existing = self.db.query(RAGDocument).filter(RAGDocument.content_hash == content_hash).first()
        if existing:
            return {
                "id": existing.id,
                "title": existing.title,
                "source_name": existing.source_name,
                "source_url": existing.source_url,
                "content_hash": existing.content_hash,
                "status": existing.status,
            }

        parsed_date = None
        if published_at:
            if isinstance(published_at, str):
                try:
                    parsed_date = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
                except ValueError:
                    parsed_date = None
            else:
                parsed_date = published_at

        document = RAGDocument(
            source_name=source_name,
            source_url=source_url,
            title=title,
            category=category,
            geography=geography,
            published_at=parsed_date,
            content_hash=content_hash,
            credibility=credibility,
            status="active",
            content=content,
        )
        self.db.add(document)
        self.db.commit()
        self.db.refresh(document)

        embedding = build_embedding(f"{title} {content}")
        chunk = RAGChunk(
            document_id=document.id,
            chunk_index=0,
            content=content,
            embedding=embedding,
            chunk_metadata={"title": title, "category": category, "geography": geography},
        )
        self.db.add(chunk)
        self.db.commit()
        return {
            "id": document.id,
            "title": title,
            "source_name": source_name,
            "source_url": source_url,
            "content_hash": content_hash,
            "status": "active",
        }

    def list_active_documents(self, category: Optional[str] = None, geography: Optional[str] = None) -> List[RAGDocument]:
        query = self.db.query(RAGDocument).filter(RAGDocument.status == "active")
        if category:
            query = query.filter(RAGDocument.category.ilike(f"%{category}%"))
        if geography:
            query = query.filter(RAGDocument.geography.ilike(f"%{geography}%"))
        return query.order_by(RAGDocument.published_at.desc().nullslast()).all()

    def query_candidates(self, question: str, region: Optional[str] = None, category: Optional[str] = None, limit: int = 6) -> List[Dict[str, Any]]:
        documents = self.list_active_documents(category=category, geography=region)
        if not documents:
            return []

        from app.rag.embeddings import build_embedding, cosine_similarity

        query_vector = build_embedding(question)
        ranked = []
        for document in documents:
            chunk = self.db.query(RAGChunk).filter(RAGChunk.document_id == document.id).order_by(RAGChunk.chunk_index.asc()).first()
            if not chunk:
                continue
            similarity = cosine_similarity(query_vector, chunk.embedding)
            ranked.append({
                "document": document,
                "chunk": chunk,
                "similarity": similarity,
            })

        ranked.sort(key=lambda item: item["similarity"], reverse=True)
        results = []
        for item in ranked[:limit]:
            document = item["document"]
            results.append({
                "id": document.id,
                "title": document.title,
                "summary": (document.content or "")[:220],
                "category": document.category,
                "location": document.geography,
                "published_at": document.published_at.isoformat() if document.published_at else None,
                "source": document.source_name,
                "source_url": document.source_url,
                "credibility": document.credibility,
                "content": document.content,
                "relevance_score": round(item["similarity"], 4),
            })
        return results
