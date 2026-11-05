from typing import List, Dict
from app.schemas.prediction_schema import (
    PredictionAnalyzeRequest, RiskAnalysis, WeeklyProjection, MonthlyProjection
)

class PredictionService:
    
    @staticmethod
    def calculate_risk_score(
        health_data: Dict,
        environmental_data: Dict,
        population_data: Dict,
        climate_variation: Dict = None
    ) -> float:
        """Calculate outbreak risk score using weighted formula"""
        
        # Apply climate variations if provided
        temp = environmental_data.get("temperature", 0)
        rainfall = environmental_data.get("rainfall", 0)
        humidity = environmental_data.get("humidity", 0)
        
        if climate_variation:
            temp += climate_variation.get("temperature_change", 0)
            rainfall += climate_variation.get("rainfall_change", 0)
            humidity += climate_variation.get("humidity_change", 0)
        
        # Weighted formula
        new_cases = health_data.get("new_cases", 0)
        hospital_admissions = health_data.get("hospital_admissions", 0)
        population_density = population_data.get("population_density", 0)
        
        risk_score = (
            (0.4 * new_cases) +
            (0.2 * rainfall) +
            (0.2 * humidity) +
            (0.1 * population_density) +
            (0.1 * hospital_admissions)
        )
        
        # Normalize to 0-100 scale
        normalized_score = min(max(risk_score / 10, 0), 100)
        
        return round(normalized_score, 2)

    @staticmethod
    def classify_risk(risk_score: float) -> str:
        """Classify risk level based on score"""
        if risk_score <= 30:
            return "Low"
        elif risk_score <= 60:
            return "Medium"
        else:
            return "High"
    
    @staticmethod
    def generate_weekly_projections(risk_score: float) -> List[WeeklyProjection]:
        """Generate 4-week projections"""
        projections = []
        growth_factor = 1.05 if risk_score > 50 else 0.98
        
        for week in range(1, 5):
            projected_score = risk_score * (growth_factor ** week)
            projected_score = min(max(projected_score, 0), 100)
            
            trend = "increasing" if growth_factor > 1 else "decreasing"
            
            projections.append(WeeklyProjection(
                week=week,
                risk_score=round(projected_score, 2),
                trend=trend
            ))
        
        return projections
    
    @staticmethod
    def generate_monthly_projections(risk_score: float) -> List[MonthlyProjection]:
        """Generate 3-month projections"""
        projections = []
        growth_factor = 1.15 if risk_score > 50 else 0.92
        
        for month in range(1, 4):
            projected_score = risk_score * (growth_factor ** month)
            projected_score = min(max(projected_score, 0), 100)
            
            trend = "increasing" if growth_factor > 1 else "decreasing"
            
            projections.append(MonthlyProjection(
                month=month,
                risk_score=round(projected_score, 2),
                trend=trend
            ))
        
        return projections

    @staticmethod
    def analyze_prediction(request: PredictionAnalyzeRequest) -> RiskAnalysis:
        """Complete prediction analysis"""
        
        health_dict = request.health_data.dict()
        env_dict = request.environmental_data.dict()
        pop_dict = request.population_data.dict()
        climate_dict = request.climate_variation.dict() if request.climate_variation else None
        
        # Calculate risk score
        risk_score = PredictionService.calculate_risk_score(
            health_dict, env_dict, pop_dict, climate_dict
        )
        
        # Classify risk
        risk_level = PredictionService.classify_risk(risk_score)
        
        # Generate projections
        weekly_projections = PredictionService.generate_weekly_projections(risk_score)
        monthly_projections = PredictionService.generate_monthly_projections(risk_score)
        
        return RiskAnalysis(
            risk_score=risk_score,
            risk_level=risk_level,
            risk_percentage=risk_score,
            weekly_projections=weekly_projections,
            monthly_projections=monthly_projections
        )
