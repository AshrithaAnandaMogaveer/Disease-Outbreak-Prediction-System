from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.chat_schema import ChatRequest, ChatResponse
from app.utils.role_checker import require_user
from app.services.agents.agent_controller import AgentController
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
def chat_with_ai(
    request: ChatRequest,
    current_user: User = Depends(require_user),
    db: Session = Depends(get_db)
):
    """
    Chat with AI Disease Intelligence Assistant
    
    Protected endpoint - requires JWT authentication
    Uses agentic architecture to intelligently route queries
    """
    
    # Validate message is not empty
    if not request.message or not request.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty"
        )
    
    try:
        # Initialize agent controller with database session
        agent_controller = AgentController(db=db)
        
        # Process query through agent system
        logger.info(f"Processing chat request from user {current_user.id}")
        response_text = agent_controller.process_query(
            message=request.message,
            user_id=current_user.id
        )
        
        return ChatResponse(response=response_text)
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred processing your request. Please try again."
        )
