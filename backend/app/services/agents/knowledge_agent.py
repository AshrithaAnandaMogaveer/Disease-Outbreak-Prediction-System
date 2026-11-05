"""
Knowledge Agent - Handles disease information, symptoms, prevention, and general health queries
"""
import logging

logger = logging.getLogger(__name__)

class KnowledgeAgent:
    """Agent for disease knowledge and health information"""
    
    def __init__(self):
        self.knowledge_base = {
            "malaria": {
                "symptoms": ["fever", "chills", "headache", "nausea", "vomiting", "muscle pain"],
                "prevention": [
                    "Use insecticide-treated bed nets",
                    "Apply mosquito repellent",
                    "Wear long-sleeved clothing",
                    "Use indoor residual spraying",
                    "Take antimalarial medication if traveling to endemic areas"
                ],
                "transmission": "Transmitted through bites of infected Anopheles mosquitoes"
            },
            "dengue": {
                "symptoms": ["high fever", "severe headache", "pain behind eyes", "joint pain", "muscle pain", "rash", "bleeding"],
                "prevention": [
                    "Eliminate standing water where mosquitoes breed",
                    "Use mosquito repellent",
                    "Wear protective clothing",
                    "Use mosquito nets and screens",
                    "Community-wide mosquito control programs"
                ],
                "transmission": "Transmitted by Aedes mosquitoes, primarily Aedes aegypti"
            },
            "covid-19": {
                "symptoms": ["fever", "cough", "shortness of breath", "fatigue", "loss of taste or smell", "sore throat"],
                "prevention": [
                    "Get vaccinated",
                    "Wear masks in crowded areas",
                    "Practice social distancing",
                    "Wash hands frequently",
                    "Improve ventilation indoors",
                    "Stay home when sick"
                ],
                "transmission": "Spreads through respiratory droplets and aerosols"
            },
            "cholera": {
                "symptoms": ["severe diarrhea", "vomiting", "dehydration", "muscle cramps"],
                "prevention": [
                    "Drink safe, treated water",
                    "Practice good hygiene and handwashing",
                    "Eat properly cooked food",
                    "Avoid raw or undercooked seafood",
                    "Get vaccinated if in high-risk areas"
                ],
                "transmission": "Spread through contaminated water and food"
            },
            "tuberculosis": {
                "symptoms": ["persistent cough", "chest pain", "coughing up blood", "fatigue", "weight loss", "night sweats", "fever"],
                "prevention": [
                    "Get BCG vaccine",
                    "Ensure good ventilation",
                    "Cover mouth when coughing",
                    "Complete full course of treatment if infected",
                    "Screen high-risk populations"
                ],
                "transmission": "Spreads through airborne particles when infected person coughs or sneezes"
            }
        }
    
    def process(self, query: str, user_id: str) -> str:
        """Process knowledge-based queries"""
        logger.info(f"KnowledgeAgent processing query for user {user_id}: {query[:50]}...")
        
        query_lower = query.lower()
        
        # Check for disease-specific queries
        for disease, info in self.knowledge_base.items():
            if disease in query_lower or disease.replace("-", " ") in query_lower:
                return self._format_disease_info(disease, info, query_lower)
        
        # General prevention query
        if any(word in query_lower for word in ["prevent", "prevention", "avoid", "protect"]):
            return self._general_prevention_advice()
        
        # General symptoms query
        if any(word in query_lower for word in ["symptom", "symptoms", "signs"]):
            return self._general_symptom_advice()
        
        # Transmission query
        if any(word in query_lower for word in ["transmit", "transmission", "spread", "contagious"]):
            return self._general_transmission_info()
        
        # Default knowledge response
        return self._default_knowledge_response()
    
    def _format_disease_info(self, disease: str, info: dict, query: str) -> str:
        """Format disease information based on query type"""
        disease_name = disease.replace("-", " ").title()
        
        if any(word in query for word in ["prevent", "prevention", "avoid"]):
            prevention_list = "\n".join([f"- {item}" for item in info["prevention"]])
            return f"**{disease_name} Prevention Measures:**\n\n{prevention_list}\n\n**Transmission:** {info['transmission']}\n\nStay safe and follow these guidelines to reduce your risk."
        
        elif any(word in query for word in ["symptom", "symptoms", "signs"]):
            symptoms_list = ", ".join(info["symptoms"])
            return f"**{disease_name} Symptoms:**\n\nCommon symptoms include: {symptoms_list}.\n\n**Transmission:** {info['transmission']}\n\nIf you experience these symptoms, please consult a healthcare professional immediately."
        
        elif any(word in query for word in ["transmit", "transmission", "spread"]):
            return f"**{disease_name} Transmission:**\n\n{info['transmission']}\n\nUnderstanding transmission helps in taking appropriate preventive measures."
        
        else:
            # Comprehensive info
            symptoms_list = ", ".join(info["symptoms"])
            prevention_list = "\n".join([f"- {item}" for item in info["prevention"]])
            return f"""**{disease_name} Information:**

**Symptoms:** {symptoms_list}

**Transmission:** {info['transmission']}

**Prevention Measures:**
{prevention_list}

For medical advice, please consult healthcare professionals."""
    
    def _general_prevention_advice(self) -> str:
        """Provide general disease prevention advice"""
        return """**General Disease Prevention Guidelines:**

- Maintain good personal hygiene (regular handwashing)
- Ensure safe drinking water and food
- Get vaccinated according to schedule
- Use mosquito protection in endemic areas
- Practice social distancing during outbreaks
- Maintain a healthy lifestyle and strong immune system
- Seek early medical attention for symptoms
- Follow public health advisories

Prevention is always better than cure. Stay informed and stay safe!"""
    
    def _general_symptom_advice(self) -> str:
        """Provide general symptom recognition advice"""
        return """**Recognizing Disease Symptoms:**

Common warning signs to watch for:
- Persistent fever
- Unusual fatigue or weakness
- Respiratory issues (cough, breathing difficulty)
- Gastrointestinal problems (diarrhea, vomiting)
- Unexplained rashes or skin changes
- Severe headaches
- Body aches and pains

**Important:** If you experience severe or persistent symptoms, seek immediate medical attention. Early detection and treatment are crucial for better outcomes."""
    
    def _general_transmission_info(self) -> str:
        """Provide general disease transmission information"""
        return """**How Diseases Spread:**

**Vector-borne:** Through mosquitoes, ticks, or other insects (e.g., malaria, dengue)

**Airborne:** Through respiratory droplets (e.g., COVID-19, tuberculosis)

**Waterborne:** Through contaminated water or food (e.g., cholera, typhoid)

**Contact:** Through direct contact with infected persons or surfaces

**Understanding transmission routes helps in taking appropriate preventive measures.**"""
    
    def _default_knowledge_response(self) -> str:
        """Default response for general health queries"""
        return """I can help you with information about various diseases including:

- Malaria
- Dengue
- COVID-19
- Cholera
- Tuberculosis

You can ask me about:
- Symptoms of specific diseases
- Prevention measures
- How diseases spread
- General health advice

What would you like to know?"""
