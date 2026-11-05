"""
Prediction Agent - Handles outbreak prediction queries and historical prediction data
"""
import logging
from sqlalchemy.orm import Session
from app.models.prediction import Prediction

logger = logging.getLogger(__name__)

class PredictionAgent:
    """Agent for outbreak prediction and analysis"""
    
    def __init__(self, db: Session = None):
        self.db = db
    
    def process(self, query: str, user_id: str) -> str:
        """Process prediction-related queries"""
        logger.info(f"PredictionAgent processing query for user {user_id}: {query[:50]}...")
        
        query_lower = query.lower()
        
        # Check for last prediction query
        if any(phrase in query_lower for phrase in ["last prediction", "recent prediction", "my prediction", "previous prediction"]):
            return self._get_last_prediction(user_id)
        
        # Check for outbreak increase query
        if any(phrase in query_lower for phrase in ["why outbreak", "outbreak increasing", "outbreak rising", "cases increasing"]):
            return self._explain_outbreak_increase()
        
        # Check for risk analysis query
        if any(word in query_lower for word in ["risk", "danger", "threat", "vulnerable"]):
            return self._explain_risk_factors()
        
        # Check for prediction methodology query
        if any(word in query_lower for word in ["how predict", "prediction work", "model", "algorithm"]):
            return self._explain_prediction_methodology()
        
        # Default prediction response
        return self._default_prediction_response()
    
    def _get_last_prediction(self, user_id: str) -> str:
        """Retrieve user's last prediction from database"""
        if not self.db:
            return "I need database access to retrieve your predictions. Please try again later."
        
        try:
            last_prediction = self.db.query(Prediction).filter(
                Prediction.user_id == user_id
            ).order_by(Prediction.created_at.desc()).first()
            
            if not last_prediction:
                return """You haven't made any outbreak predictions yet. 

Would you like to create a prediction? Go to the "Predict Outbreak" page to analyze outbreak risks based on:
- Health data (active cases, recovery rates)
- Environmental factors (temperature, rainfall, humidity)
- Population data (density, migration)

Our AI model will provide risk analysis and recommendations."""
            
            risk_level = last_prediction.risk_level.upper()
            risk_score = last_prediction.risk_score
            
            # Determine risk emoji and color
            risk_emoji = "🟢" if risk_level == "LOW" else "🟡" if risk_level == "MEDIUM" else "🔴"
            
            return f"""**Your Last Outbreak Prediction:**

{risk_emoji} **Risk Level:** {risk_level}
📊 **Risk Score:** {risk_score:.2f}%
📅 **Date:** {last_prediction.created_at.strftime('%B %d, %Y at %I:%M %p')}

**Key Factors Analyzed:**
- Active Cases: {last_prediction.health_data.get('active_cases', 'N/A')}
- Temperature: {last_prediction.environmental_data.get('temperature', 'N/A')}°C
- Population Density: {last_prediction.population_data.get('population_density', 'N/A')}

Would you like to:
- Create a new prediction with updated data?
- View detailed analysis and recommendations?
- Compare with previous predictions?"""
        
        except Exception as e:
            logger.error(f"Error retrieving prediction: {e}")
            return "I encountered an error retrieving your prediction history. Please try again later."
    
    def _explain_outbreak_increase(self) -> str:
        """Explain factors contributing to outbreak increases"""
        return """**Why Outbreaks Increase - Key Factors:**

**Environmental Factors:**
- Climate change creating favorable conditions for disease vectors
- Increased rainfall leading to mosquito breeding
- Temperature changes affecting pathogen survival
- Seasonal variations

**Population Factors:**
- High population density facilitating rapid spread
- Increased migration and travel
- Urbanization and crowded living conditions
- Inadequate sanitation infrastructure

**Healthcare Factors:**
- Limited access to healthcare services
- Delayed detection and reporting
- Insufficient vaccination coverage
- Antimicrobial resistance

**Behavioral Factors:**
- Poor hygiene practices
- Lack of awareness about prevention
- Non-compliance with health guidelines

**Our prediction model analyzes these factors to forecast outbreak risks and help authorities take preventive action.**"""
    
    def _explain_risk_factors(self) -> str:
        """Explain risk factors in outbreak prediction"""
        return """**Outbreak Risk Factors Analysis:**

**High-Risk Indicators:**
🔴 Rapid increase in active cases
🔴 Low recovery rates
🔴 High population density in affected areas
🔴 Favorable environmental conditions for disease vectors
🔴 Limited healthcare infrastructure

**Medium-Risk Indicators:**
🟡 Moderate case increase
🟡 Seasonal disease patterns
🟡 Urban areas with good healthcare access
🟡 Ongoing prevention measures

**Low-Risk Indicators:**
🟢 Declining case numbers
🟢 High recovery rates
🟢 Strong healthcare response
🟢 Effective prevention measures in place
🟢 Low population density

**Our AI model weighs these factors to provide accurate risk assessments and actionable recommendations.**"""
    
    def _explain_prediction_methodology(self) -> str:
        """Explain how the prediction system works"""
        return """**How Our Outbreak Prediction System Works:**

**Data Collection:**
- Health metrics (active cases, hospitalizations, recovery rates)
- Environmental data (temperature, rainfall, humidity, air quality)
- Population statistics (density, migration patterns, area type)

**AI Analysis:**
Our machine learning model analyzes:
1. **Historical patterns** - Learning from past outbreaks
2. **Current trends** - Real-time data analysis
3. **Risk factors** - Weighing multiple variables
4. **Seasonal patterns** - Understanding disease cycles

**Risk Calculation:**
- Combines all factors into a comprehensive risk score (0-100%)
- Categorizes risk as LOW, MEDIUM, or HIGH
- Generates weekly and monthly projections
- Provides trend analysis

**Output:**
- Risk level and percentage
- Contributing factors
- Preventive recommendations
- Government advisory
- Actionable insights

**Accuracy:** Our model is continuously improved with new data and feedback."""
    
    def _default_prediction_response(self) -> str:
        """Default response for prediction queries"""
        return """**Outbreak Prediction System:**

I can help you with:
- Viewing your last prediction
- Understanding why outbreaks increase
- Explaining risk factors
- How our prediction model works
- Creating new predictions

**To make a new prediction:**
Go to "Predict Outbreak" page and provide:
- Health data (cases, recovery rates)
- Environmental conditions
- Population information

Our AI will analyze the data and provide risk assessment with recommendations.

What would you like to know about outbreak predictions?"""
