"""
Information request routes — users ask questions about diseases/outbreaks.
RAG answers automatically when possible; otherwise routes to admin.
"""
from __future__ import annotations

import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.information_request import InformationRequest, InformationRequestStatus
from app.models.user import User
from app.rag.service import RAGService
from app.schemas.communication_schema import InformationRequestResponse, InformationRequestSubmit
from app.utils.role_checker import require_user

router = APIRouter()


@router.get("/test-rag-dengue")
def test_rag_dengue(db: Session = Depends(get_db)):
    """Test endpoint to verify RAG filtering works"""
    rag_service = RAGService(db=db)
    result = rag_service.answer_question(
        question="tell me about dengue",
        region="India",
        category=None,
        user_id="test",
    )
    return {
        "grounded": result.get("grounded"),
        "outbreak_count": result.get("outbreak_count"),
        "answer_preview": result.get("answer", "")[:300],
    }


@router.post("/information-requests", response_model=InformationRequestResponse, status_code=status.HTTP_201_CREATED)
def submit_information_request(
    payload: InformationRequestSubmit,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """
    Submit a knowledge/clarification request.
    RAG is automatically invoked. If a grounded answer is found the status
    becomes rag_answered; if not, it enters awaiting_admin so an admin can reply.
    """
    rag_answer = None
    rag_sources_json = None
    rag_grounded = "false"
    initial_status = InformationRequestStatus.AWAITING_ADMIN.value

    try:
        rag_service = RAGService(db=db)
        result = rag_service.answer_question(
            question=payload.question,
            region="India",
            category=None,
            user_id=current_user.id,
        )
        answer = result.get("answer", "")
        grounded = result.get("grounded", False)
        sources = result.get("sources", [])

        # Only accept RAG answers that are substantive and grounded
        # Route to admin if: not grounded, no answer, or explicitly says "no data found"
        should_route_to_admin = (
            not grounded or 
            not answer or 
            "couldn't find" in answer.lower() or
            "no published outbreak data found" in answer.lower()
        )
        
        if not should_route_to_admin:
            rag_answer = answer
            rag_sources_json = json.dumps(sources)
            rag_grounded = "true"
            initial_status = InformationRequestStatus.RAG_ANSWERED.value
        else:
            initial_status = InformationRequestStatus.AWAITING_ADMIN.value
    except Exception:
        # RAG failure is non-fatal — route to admin
        initial_status = InformationRequestStatus.AWAITING_ADMIN.value

    request = InformationRequest(
        user_id=current_user.id,
        topic=payload.topic,
        question=payload.question,
        related_outbreak_id=payload.related_outbreak_id,
        rag_answer=rag_answer,
        rag_sources=rag_sources_json,
        rag_grounded=rag_grounded,
        status=initial_status,
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return request


@router.get("/information-requests/my", response_model=List[InformationRequestResponse])
def get_my_information_requests(
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Return the current user's submitted information requests."""
    return (
        db.query(InformationRequest)
        .filter(InformationRequest.user_id == current_user.id)
        .order_by(InformationRequest.created_at.desc())
        .all()
    )


@router.get("/information-requests/{request_id}", response_model=InformationRequestResponse)
def get_information_request(
    request_id: str,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Get a single information request — only the submitter can view it."""
    req = db.query(InformationRequest).filter(InformationRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found.")
    if req.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    return req
