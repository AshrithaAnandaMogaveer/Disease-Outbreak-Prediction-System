@echo off
REM SDG 3 Health Platform Backend Startup Script for Windows

echo Starting SDG 3 Health Platform Backend...

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Check if .env exists
if not exist ".env" (
    echo Creating .env file from .env.example...
    copy .env.example .env
    echo Please update .env file with your configuration
)

REM Run the server
echo Starting FastAPI server...
uvicorn app.main:app --reload --port 8000
