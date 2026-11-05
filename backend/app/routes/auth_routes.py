from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
import secrets
import smtplib
import threading
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.user_schema import (
    UserSignup, AdminSignup, UserLogin, Token, UserResponse,
    ForgotPasswordRequest, ResetPasswordRequest
)
from app.utils.security import (
    get_password_hash, verify_password, create_access_token, get_current_user
)
from app.config import settings

router = APIRouter()

@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
def signup(user_data: UserSignup, db: Session = Depends(get_db)):
    """User registration"""
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    new_user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        name=user_data.name,
        role=UserRole.USER
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create access token
    access_token = create_access_token(
        data={"sub": new_user.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user)
    )


@router.post("/signup/admin", response_model=Token, status_code=status.HTTP_201_CREATED)
def signup_admin(admin_data: AdminSignup, db: Session = Depends(get_db)):
    """Admin registration with secret key"""
    
    # Verify admin secret key
    if admin_data.admin_secret_key != settings.ADMIN_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid admin secret key"
        )
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == admin_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new admin user
    new_admin = User(
        email=admin_data.email,
        password_hash=get_password_hash(admin_data.password),
        name=admin_data.name,
        role=UserRole.ADMIN
    )
    
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)
    
    # Create access token
    access_token = create_access_token(
        data={"sub": new_admin.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_admin)
    )


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """User/Admin login"""
    
    # Check for hardcoded admin credentials
    if credentials.username and credentials.username == "SDG3_ADMIN":
        if credentials.password == "SDG3_ADMIN_2026":
            # Find or create the admin user
            admin_user = db.query(User).filter(User.role == UserRole.ADMIN).first()
            if not admin_user:
                # Create default admin if doesn't exist
                admin_user = User(
                    email="admin@sdg3.com",
                    password_hash=get_password_hash("SDG3_ADMIN_2026"),
                    name="SDG3 Admin",
                    role=UserRole.ADMIN
                )
                db.add(admin_user)
                db.commit()
                db.refresh(admin_user)
            
            # Create access token
            access_token = create_access_token(
                data={"sub": admin_user.email},
                expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
            )
            
            return Token(
                access_token=access_token,
                token_type="bearer",
                user=UserResponse.model_validate(admin_user)
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid admin credentials"
            )
    
    # Regular email/password login
    # Find user by email
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    return UserResponse.model_validate(current_user)


def send_reset_email(to_email: str, reset_link: str):
    """Send password reset email via Gmail SMTP — runs in a background thread"""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Password Reset - SDG3 Health Platform"
        msg["From"] = settings.MAIL_FROM
        msg["To"] = to_email

        html = f"""
        <html>
          <body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 30px;">
            <div style="max-width: 500px; margin: auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <h2 style="color: #2563eb;">SDG3 Health Platform</h2>
              <h3>Password Reset Request</h3>
              <p>We received a request to reset your password. Click the button below to set a new password:</p>
              <a href="{reset_link}" style="display:inline-block; margin: 20px 0; padding: 12px 28px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Reset Password
              </a>
              <p style="color: #666; font-size: 13px;">This link expires in <strong>30 minutes</strong>. If you did not request a password reset, you can safely ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #999; font-size: 12px;">SDG3 Health Platform &mdash; Disease Outbreak Prediction System</p>
            </div>
          </body>
        </html>
        """
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=15) as server:
            server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
            server.sendmail(settings.MAIL_FROM, to_email, msg.as_string())
        print(f"[EMAIL] Reset email sent to {to_email}")
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send reset email to {to_email}: {e}")


@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Send password reset email"""
    user = db.query(User).filter(User.email == data.email).first()

    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If that email exists, a reset link has been sent."}

    # Generate a secure token valid for 30 minutes
    token = secrets.token_urlsafe(32)
    user.reset_token = token
    user.reset_token_expires = datetime.utcnow() + timedelta(minutes=30)
    db.commit()

    reset_link = f"http://localhost:5173/reset-password?token={token}"

    # Send email in background thread so it never crashes the server
    thread = threading.Thread(target=send_reset_email, args=(user.email, reset_link), daemon=True)
    thread.start()

    return {"message": "If that email exists, a reset link has been sent."}


@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using token"""
    user = db.query(User).filter(User.reset_token == data.token).first()

    if not user or not user.reset_token_expires:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token."
        )

    if datetime.utcnow() > user.reset_token_expires:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired. Please request a new one."
        )

    user.password_hash = get_password_hash(data.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()

    return {"message": "Password reset successfully. You can now log in."}
