"""
Agent Controller - Orchestrates multiple agents based on user intent.
Uses Mistral AI as primary LLM; falls back to rule-based agents if unavailable.
"""
import logging
from typing import Optional
from sqlalchemy.orm import Session
from .knowledge_agent import KnowledgeAgent
from .prediction_agent import PredictionAgent
from .report_agent import ReportAgent
from .mistral_service import get_mistral_response
from app.rag.service import RAGService

logger = logging.getLogger(__name__)


class AgentController:
    """
    Main controller — tries Mistral LLM first, falls back to rule-based agents.
    """

    def __init__(self, db: Optional[Session] = None):
        self.db = db
        self.knowledge_agent = KnowledgeAgent()
        self.prediction_agent = PredictionAgent(db=db)
        self.report_agent = ReportAgent()
        self.rag_service = RAGService(db=db)
        logger.info("AgentController initialized")

    def process_query(self, message: str, user_id: str) -> str:
        logger.info(f"Processing query for user {user_id}: {message[:80]}...")

        try:
            # ── Domain guardrail ──────────────────────────────────────────────
            if not self._is_health_related(message):
                return self._domain_restriction_response()

            # ── Special case: prediction history needs DB, bypass LLM ────────
            msg_lower = message.lower()
            if any(p in msg_lower for p in ["last prediction", "my prediction",
                                             "recent prediction", "previous prediction"]):
                return self.prediction_agent.process(message, user_id)

            # ── Ground the answer in trusted retrieval before the generic LLM ─────
            rag_result = self.rag_service.answer_question(message)
            if rag_result["grounded"] and "insufficient reliable information" not in rag_result["answer"].lower():
                logger.info("Returning grounded RAG response")
                return rag_result["answer"]

            # ── Try Mistral LLM first ─────────────────────────────────────────
            llm_response = get_mistral_response(message)
            if llm_response:
                logger.info("Returning Mistral LLM response")
                return llm_response

            # ── Fallback: rule-based agents ───────────────────────────────────
            logger.info("Mistral unavailable — using rule-based fallback")
            intent = self._determine_intent(message)

            if intent == "prediction":
                return self.prediction_agent.process(message, user_id)
            elif intent == "knowledge":
                return self.knowledge_agent.process(message, user_id)
            elif intent == "report":
                return self.report_agent.process(message, user_id)
            elif intent == "multi":
                return self._handle_multi_agent_query(message, user_id)
            else:
                return self._handle_general_query(message, user_id)

        except Exception as e:
            logger.error(f"Error processing query: {e}", exc_info=True)
            return self._error_response()
    
    def _determine_intent(self, message: str) -> str:
        """
        Determine user intent from message
        
        Returns:
            Intent type: 'prediction', 'knowledge', 'report', 'multi', or 'general'
        """
        message_lower = message.lower()
        
        # Prediction intent keywords
        prediction_keywords = [
            "predict", "prediction", "forecast", "risk", "outbreak increasing",
            "last prediction", "my prediction", "previous prediction",
            "risk score", "risk level", "why outbreak", "cases increasing"
        ]
        
        # Knowledge intent keywords
        knowledge_keywords = [
            "what is", "tell me about", "symptoms", "how does", "disease",
            "malaria", "dengue", "covid", "cholera", "tuberculosis",
            "transmission", "spread", "contagious", "causes"
        ]
        
        # Report intent keywords
        report_keywords = [
            "government advisory", "govt advisory", "preventive action",
            "emergency", "report", "advisory", "guidelines", "recommendations",
            "what to do", "how to prevent", "community"
        ]
        
        # Count matches for each intent
        prediction_score = sum(1 for keyword in prediction_keywords if keyword in message_lower)
        knowledge_score = sum(1 for keyword in knowledge_keywords if keyword in message_lower)
        report_score = sum(1 for keyword in report_keywords if keyword in message_lower)
        
        # Determine primary intent
        scores = {
            "prediction": prediction_score,
            "knowledge": knowledge_score,
            "report": report_score
        }
        
        max_score = max(scores.values())
        
        # If no clear intent or multiple high scores, check for multi-agent need
        if max_score == 0:
            return "general"
        
        # If multiple intents have high scores, it's a multi-agent query
        high_score_intents = [intent for intent, score in scores.items() if score >= max_score and score > 0]
        if len(high_score_intents) > 1:
            return "multi"
        
        # Return the intent with highest score
        return max(scores, key=scores.get)
    
    def _handle_multi_agent_query(self, message: str, user_id: str) -> str:
        """Handle queries that require multiple agents"""
        logger.info(f"Handling multi-agent query for user {user_id}")
        
        message_lower = message.lower()
        responses = []
        
        # Check if prediction agent is needed
        if any(word in message_lower for word in ["predict", "risk", "outbreak", "last prediction"]):
            pred_response = self.prediction_agent.process(message, user_id)
            responses.append(("Outbreak Analysis", pred_response))
        
        # Check if knowledge agent is needed
        if any(word in message_lower for word in ["symptom", "disease", "transmission", "what is"]):
            know_response = self.knowledge_agent.process(message, user_id)
            responses.append(("Disease Information", know_response))
        
        # Check if report agent is needed
        if any(word in message_lower for word in ["prevent", "advisory", "guideline", "what to do"]):
            report_response = self.report_agent.process(message, user_id)
            responses.append(("Recommendations", report_response))
        
        # Combine responses
        if len(responses) == 0:
            return self._handle_general_query(message, user_id)
        
        combined = "\n\n---\n\n".join([f"**{title}:**\n\n{response}" for title, response in responses])
        return combined
    
    def _handle_general_query(self, message: str, user_id: str) -> str:
        """Handle general queries that don't fit specific intents"""
        logger.info(f"Handling general query for user {user_id}")
        
        message_lower = message.lower()
        
        # Greetings
        if any(word in message_lower for word in ["hello", "hi", "hey", "greetings"]):
            return """Hello! 👋 I'm your AI Disease Intelligence Assistant.

I can help you with:

🔬 **Disease Information**
- Symptoms, prevention, and transmission of diseases
- Information about malaria, dengue, COVID-19, cholera, tuberculosis, and more

📊 **Outbreak Predictions**
- View your prediction history
- Understand outbreak risk factors
- Learn about our prediction methodology

📋 **Reports & Advisories**
- Government health advisories
- Preventive action guidelines
- Emergency response protocols
- Community health guidelines

How can I assist you today?"""
        
        # Help or capabilities
        if any(word in message_lower for word in ["help", "what can you do", "capabilities", "features"]):
            return """**My Capabilities:**

I'm an AI-powered health assistant specialized in disease outbreak intelligence. Here's what I can do:

**1. Disease Knowledge 🔬**
- Explain symptoms of various diseases
- Provide prevention measures
- Describe transmission methods
- Answer health-related questions

**2. Outbreak Prediction 📊**
- Show your prediction history
- Explain risk factors
- Describe prediction methodology
- Analyze outbreak trends

**3. Reports & Advisories 📋**
- Generate government advisories
- Provide preventive action plans
- Emergency response guidelines
- Community health recommendations

**Example Questions:**
- "What are the symptoms of malaria?"
- "Show me my last prediction"
- "How can I prevent dengue?"
- "Generate a government advisory"
- "Why are outbreaks increasing?"

What would you like to know?"""
        
        # Thank you
        if any(word in message_lower for word in ["thank", "thanks", "appreciate"]):
            return """You're welcome! 😊

I'm here to help you stay informed and safe. If you have any more questions about:
- Disease information
- Outbreak predictions
- Health advisories
- Prevention measures

Feel free to ask anytime. Stay healthy and safe!"""
        
        # Default response for unclear queries
        return """I'm here to help with disease outbreak intelligence!

I can assist you with:
- **Disease Information** - Symptoms, prevention, transmission
- **Outbreak Predictions** - Risk analysis and forecasts
- **Health Advisories** - Guidelines and recommendations

Could you please be more specific about what you'd like to know? For example:
- "What are malaria symptoms?"
- "Show my last prediction"
- "How to prevent dengue?"
- "Generate government advisory"

What would you like to know?"""
    
    def _error_response(self) -> str:
        """Return error response"""
        return """I apologize, but I encountered an error processing your request.

Please try:
- Rephrasing your question
- Being more specific
- Asking about a specific disease or topic

If the problem persists, please contact support.

I'm here to help with:
- Disease information
- Outbreak predictions
- Health advisories

What would you like to know?"""
    
    def _is_health_related(self, message: str) -> bool:
        """
        Broad health domain check — only blocks clearly off-topic queries.
        Errs on the side of allowing queries through to Mistral.
        """
        message_lower = message.lower()

        # Always allow greetings, help, thanks
        always_allow = [
            "hello", "hi", "hey", "help", "thanks", "thank you", "bye",
            "what can you", "capabilities", "who are you", "what are you"
        ]
        if any(w in message_lower for w in always_allow):
            return True

        # Clearly off-topic — block these
        off_topic = [
            "cricket", "football", "ipl", "movie", "film", "song", "music",
            "stock market", "share price", "bitcoin", "crypto",
            "recipe", "cooking", "restaurant",
            "politics", "election", "party",
            "weather forecast", "rain today",
            "joke", "funny", "meme",
        ]
        # Only block if the message is PURELY about off-topic (no health words)
        health_words = [
            "health", "disease", "sick", "symptom", "fever", "pain", "virus",
            "bacteria", "infection", "outbreak", "epidemic", "vaccine", "medicine",
            "doctor", "hospital", "treatment", "prevention", "malaria", "dengue",
            "covid", "flu", "cholera", "typhoid", "risk", "cases", "spread",
            "contagious", "immunity", "diagnosis", "cure", "drug", "patient",
            "medical", "clinical", "public health", "sanitation", "hygiene",
            "mosquito", "vector", "quarantine", "isolation", "mortality",
            "nutrition", "diet", "mental health", "anxiety", "stress",
            "pregnancy", "child", "infant", "elderly", "chronic", "acute",
        ]

        has_health = any(w in message_lower for w in health_words)
        has_offtopic = any(w in message_lower for w in off_topic)

        # Block only if clearly off-topic AND no health context
        if has_offtopic and not has_health:
            return False

        # Allow everything else — let Mistral decide
        return True
    
    def _domain_restriction_response(self) -> str:
        return """I'm specialized in **health, disease, and outbreak intelligence** 🏥

I can help you with topics like:
- 🦟 Disease symptoms, prevention & treatment (Dengue, Malaria, COVID-19, Flu, Cholera, Typhoid...)
- 📊 Outbreak data and risk analysis across India
- 💊 Medications, vaccines, and public health guidelines
- 🧬 How diseases spread and how to stop them
- 🏥 When to see a doctor and what to expect
- 🌿 Nutrition, immunity, and staying healthy

Please ask me a health-related question and I'll do my best to help!"""
