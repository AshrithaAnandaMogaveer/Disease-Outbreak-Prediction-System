@echo off
echo ========================================
echo BACKEND RESTART SCRIPT
echo ========================================
echo.
echo This script will:
echo 1. Navigate to backend directory
echo 2. Activate virtual environment
echo 3. Start the backend server
echo.
echo Press Ctrl+C to stop the server when needed
echo ========================================
echo.

cd backend

echo Activating virtual environment...
call venv\Scripts\activate

echo.
echo Starting backend server...
echo Backend will run at: http://localhost:8000
echo API docs at: http://localhost:8000/docs
echo.

uvicorn app.main:app --reload --port 8000

pause
