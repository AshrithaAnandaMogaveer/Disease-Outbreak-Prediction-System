import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./sdg3.db")
    
    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    
    # Admin
    ADMIN_SECRET_KEY: str = os.getenv("ADMIN_SECRET_KEY", "SDG3_ADMIN_2026")
    
    # CORS
    CORS_ORIGINS: list = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5174").split(",")

    # Email (Gmail SMTP)
    MAIL_USERNAME: str = os.getenv("MAIL_USERNAME", "outbreak.forecast@gmail.com")
    MAIL_PASSWORD: str = os.getenv("MAIL_PASSWORD", "")
    MAIL_FROM: str = os.getenv("MAIL_FROM", "outbreak.forecast@gmail.com")

    # Mistral AI
    MISTRAL_API_KEY: str = os.getenv("MISTRAL_API_KEY", "")
    MISTRAL_API_BASE: str = os.getenv("MISTRAL_API_BASE", "http://localhost:1234/v1")
    MISTRAL_MODEL: str = os.getenv("MISTRAL_MODEL", "mistral-7b-instruct-v0.2")

    # RAG / contextual intelligence
    RAG_DEFAULT_REGION: str = os.getenv("RAG_DEFAULT_REGION", "India")
    RAG_FRESHNESS_DAYS: int = int(os.getenv("RAG_FRESHNESS_DAYS", "30"))

settings = Settings()
