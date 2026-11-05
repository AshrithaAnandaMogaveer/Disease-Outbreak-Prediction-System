from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.database import Base

class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Input data stored as JSON
    health_data = Column(JSON, nullable=False)
    environmental_data = Column(JSON, nullable=False)
    population_data = Column(JSON, nullable=False)
    
    # Risk analysis results
    risk_score = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False)
    
    # Projections stored as JSON
    weekly_projections = Column(JSON)
    monthly_projections = Column(JSON)
    
    # Report data stored as JSON
    report_data = Column(JSON)

    # Relationship
    user = relationship("User", back_populates="predictions")
