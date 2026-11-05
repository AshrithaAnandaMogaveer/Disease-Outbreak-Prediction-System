@echo off
REM SDG 3 Health Platform Backend Startup Script for Windows

echo.
echo ========================================
echo  SDG 3 Health Platform Backend
echo ========================================
echo.

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Check if .env exists
if not exist ".env" (
    echo .env file not found. Creating from .env.example...
    copy .env.example .env
    echo Please edit .env file with your configuration
)

REM Start server
echo.
echo ========================================
echo  Starting FastAPI Server
echo ========================================
echo.
echo API: http://localhost:8000
echo Docs: http://localhost:8000/docs
echo Health: http://localhost:8000/health
echo.
echo Press Ctrl+C to stop the server
echo.

uvicorn app.main:app --reload --port 8000
