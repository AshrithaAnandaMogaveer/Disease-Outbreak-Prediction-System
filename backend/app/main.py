from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.config import settings
from app.database import engine, Base
from app.routes import auth_routes, prediction_routes, admin_routes, rag_routes

# Import all models so SQLAlchemy registers them before create_all
import app.models  # noqa: F401 — side-effect import ensures all tables are registered

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="SDG 3 Health Platform API",
    description="AI-Based Disease Outbreak Prediction Platform",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    sanitized_errors = []
    for error in exc.errors():
        cleaned = dict(error)
        ctx = cleaned.get("ctx")
        if isinstance(ctx, dict):
            cleaned["ctx"] = {
                key: str(value) if isinstance(value, Exception) else value
                for key, value in ctx.items()
            }
        sanitized_errors.append(cleaned)

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": "Validation error",
            "errors": sanitized_errors,
        }
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log the actual error
    import traceback
    print(f"ERROR: {exc}")
    traceback.print_exc()
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "message": "Internal server error"
        }
    )

@app.get("/")
def root():
    return {
        "message": "SDG 3 Health Platform API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/debug/cors")
def debug_cors():
    """Debug endpoint to check CORS configuration"""
    return {
        "cors_origins": settings.CORS_ORIGINS,
        "cors_origins_type": str(type(settings.CORS_ORIGINS))
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# Include routers
from app.routes import chat_routes
from app.routes import outbreak_routes
from app.routes import contact_routes
from app.routes import information_routes
from app.routes import feedback_routes
from app.routes import alert_routes

app.include_router(auth_routes.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(prediction_routes.router, prefix="/api/predictions", tags=["Predictions"])
app.include_router(admin_routes.router, prefix="/api/admin", tags=["Admin"])
app.include_router(rag_routes.router, prefix="/api", tags=["RAG"])
app.include_router(chat_routes.router, prefix="/api", tags=["Chat"])
app.include_router(outbreak_routes.router, prefix="/api", tags=["Outbreaks"])
app.include_router(contact_routes.router, prefix="/api", tags=["Contact"])
app.include_router(information_routes.router, prefix="/api", tags=["Information Requests"])
app.include_router(feedback_routes.router, prefix="/api", tags=["Feedback Requests"])
app.include_router(alert_routes.router, prefix="/api", tags=["Alerts & Notifications"])
