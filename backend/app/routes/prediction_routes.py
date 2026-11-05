from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.prediction import Prediction
from app.schemas.prediction_schema import (
    PredictionAnalyzeRequest, PredictionResponse, SavePredictionRequest,
    PredictionHistoryResponse, PredictionDetailResponse
)
from app.services.prediction_service import PredictionService
from app.services.report_service import ReportService
from app.utils.role_checker import require_user

router = APIRouter()

@router.post("/analyze", response_model=PredictionResponse)
def analyze_outbreak(
    request: PredictionAnalyzeRequest,
    current_user: User = Depends(require_user)
):
    """Calculate outbreak risk and generate analysis"""
    
    # Perform risk analysis
    risk_analysis = PredictionService.analyze_prediction(request)
    
    # Generate report
    report = ReportService.generate_report(
        risk_score=risk_analysis.risk_score,
        risk_level=risk_analysis.risk_level,
        health_data=request.health_data.dict(),
        environmental_data=request.environmental_data.dict(),
        population_data=request.population_data.dict()
    )
    
    return PredictionResponse(
        risk_analysis=risk_analysis,
        report=report
    )


@router.post("/save", status_code=status.HTTP_201_CREATED)
def save_prediction(
    request: SavePredictionRequest,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Save prediction to history"""
    
    new_prediction = Prediction(
        user_id=current_user.id,
        health_data=request.health_data.dict(),
        environmental_data=request.environmental_data.dict(),
        population_data=request.population_data.dict(),
        risk_score=request.risk_score,
        risk_level=request.risk_level,
        weekly_projections=request.weekly_projections,
        monthly_projections=request.monthly_projections,
        report_data=request.report_data
    )
    
    db.add(new_prediction)
    db.commit()
    db.refresh(new_prediction)
    
    return {
        "message": "Prediction saved successfully",
        "prediction_id": new_prediction.id
    }

@router.get("/history", response_model=List[PredictionHistoryResponse])
def get_prediction_history(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Get user's prediction history"""
    
    predictions = db.query(Prediction)\
        .filter(Prediction.user_id == current_user.id)\
        .order_by(Prediction.created_at.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()
    
    return predictions


@router.get("/{prediction_id}", response_model=PredictionDetailResponse)
def get_prediction_detail(
    prediction_id: str,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Get specific prediction details"""
    
    prediction = db.query(Prediction)\
        .filter(Prediction.id == prediction_id)\
        .filter(Prediction.user_id == current_user.id)\
        .first()
    
    if not prediction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prediction not found"
        )
    
    return prediction

@router.delete("/{prediction_id}")
def delete_prediction(
    prediction_id: str,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """Delete prediction from history"""
    
    prediction = db.query(Prediction)\
        .filter(Prediction.id == prediction_id)\
        .filter(Prediction.user_id == current_user.id)\
        .first()
    
    if not prediction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prediction not found"
        )
    
    db.delete(prediction)
    db.commit()
    
    return {"message": "Prediction deleted successfully"}
