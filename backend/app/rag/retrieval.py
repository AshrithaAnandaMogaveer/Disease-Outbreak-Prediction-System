from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from app.rag.embeddings import build_embedding, cosine_similarity


class RetrievalService:
    def __init__(self, documents: Optional[List[Dict[str, Any]]] = None):
        self.documents = documents or []

    def search(self, query: str, region: Optional[str] = None, category: Optional[str] = None, timeframe_days: int = 30, limit: int = 6) -> List[Dict[str, Any]]:
        query_vector = build_embedding(query)
        results = []
        for item in self.documents:
            if category and str(item.get("category", "")).lower() != str(category).lower():
                continue
            if region and str(item.get("geography", "")).lower() not in {str(region).lower(), "india", "global"}:
                if str(region).lower() not in str(item.get("geography", "")).lower():
                    continue
            published_at = item.get("published_at")
            if published_at:
                try:
                    dt = datetime.fromisoformat(str(published_at).replace("Z", "+00:00"))
                    if datetime.now(dt.tzinfo or datetime.utcnow().astimezone().tzinfo) - dt > timedelta(days=timeframe_days):
                        continue
                except Exception:
                    pass

            doc_text = f"{item.get('title', '')} {item.get('content', '')}"
            similarity = cosine_similarity(query_vector, build_embedding(doc_text))
            results.append({**item, "similarity": similarity})

        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:limit]
