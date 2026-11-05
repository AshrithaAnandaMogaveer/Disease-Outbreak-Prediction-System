from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, List

class HealthData(BaseModel):
    active_cases: int = Field(..., ge=0)
    new_cases: int = Field(..., ge=0)
    hospital_admissions: int = Field(..., ge=0)
    recovery_rate: float = Field(..., ge=0, le=100)

class EnvironmentalData(BaseModel):
    temperature: float
    rainfall: float = Field(..., ge=0)
    humidity: float = Field(..., ge=0, le=100)
    air_quality: float = Field(..., ge=0)

class PopulationData(BaseModel):
    population_density: float = Field(..., ge=0)
    area_type: str = Field(..., pattern="^(urban|rural)$")
    migration_rate: float

class PredictionRequest(BaseModel):
    health_data: HealthData
    environmental_data: EnvironmentalData
    population_data: PopulationData

class ClimateVariation(BaseModel):
    temperature_change: float = Field(0, ge=-10, le=10)
    rainfall_change: float = Field(0, ge=-50, le=50)
    humidity_change: float = Field(0, ge=-20, le=20)

class PredictionAnalyzeRequest(BaseModel):
    health_data: HealthData
    environmental_data: EnvironmentalData
    population_data: PopulationData
    climate_variation: Optional[ClimateVariation] = None

class WeeklyProjection(BaseModel):
    week: int
    risk_score: float
    trend: str

class MonthlyProjection(BaseModel):
    month: int
    risk_score: float
    trend: str

class RiskAnalysis(BaseModel):
    risk_score: float
    risk_level: str
    risk_percentage: float
    weekly_projections: List[WeeklyProjection]
    monthly_projections: List[MonthlyProjection]

class ReportData(BaseModel):
    reasons: List[str]
    preventive_actions: List[str]
    executive_summary: str
    government_advisory: str

class PredictionResponse(BaseModel):
    risk_analysis: RiskAnalysis
    report: Optional[ReportData] = None

class SavePredictionRequest(BaseModel):
    health_data: HealthData
    environmental_data: EnvironmentalData
    population_data: PopulationData
    risk_score: float
    risk_level: str
    weekly_projections: List[Dict]
    monthly_projections: List[Dict]
    report_data: Optional[Dict] = None

class PredictionHistoryResponse(BaseModel):
    id: str
    created_at: datetime
    risk_score: float
    risk_level: str
    health_data: Dict
    environmental_data: Dict
    population_data: Dict

    model_config = {"from_attributes": True}

class PredictionDetailResponse(BaseModel):
    id: str
    created_at: datetime
    health_data: Dict
    environmental_data: Dict
    population_data: Dict
    risk_score: float
    risk_level: str
    weekly_projections: Dict
    monthly_projections: Dict
    report_data: Optional[Dict] = None

    model_config = {"from_attributes": True}
