@echo off
echo ========================================
echo Starting Backend with Virtual Environment
echo ========================================
echo.

REM Activate virtual environment
call venv\Scripts\activate.bat

echo Virtual environment activated!
echo.
echo Starting uvicorn server...
echo Backend will run at: http://localhost:8000
echo Press Ctrl+C to stop
echo.

REM Start uvicorn
uvicorn app.main:app --reload --port 8000

pause
