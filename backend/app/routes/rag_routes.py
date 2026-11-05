from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.rag_document import RAGDocument
from app.models.user import User
from app.rag.service import RAGService
from app.utils.role_checker import require_admin, require_user

router = APIRouter()


class AssistantQueryRequest(BaseModel):
    question: str
    analysis_id: Optional[str] = None
    region: Optional[str] = None


@router.get("/rag/around")
def get_around(
    region: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    timeframe: str = Query(default="7"),
    limit: int = Query(default=6, ge=1, le=10),
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    service = RAGService(db=db)
    return service.get_around(region=region, category=category, timeframe=timeframe, limit=limit)


@router.post("/assistant/query")
def assistant_query(
    payload: AssistantQueryRequest,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    service = RAGService(db=db)
    return service.answer_question(
        question=payload.question,
        region=payload.region,
        category=None,
        analysis_id=payload.analysis_id,
        user_id=current_user.id,
    )


@router.post("/admin/rag/ingest", status_code=status.HTTP_200_OK)
def ingest_rag_sources(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    service = RAGService(db=db)
    service._ensure_seed_documents()
    count = db.query(RAGDocument).count()
    return {"message": "RAG knowledge base checked", "documents": count}
