from fastapi import Depends, HTTPException, status
from app.models.user import User, UserRole
from app.utils.security import get_current_user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to check if user is admin"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

def require_user(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to check if user is authenticated (any role)"""
    return current_user
