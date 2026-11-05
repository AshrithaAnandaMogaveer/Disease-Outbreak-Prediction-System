@echo off
echo ========================================
echo FIXING BACKEND DEPENDENCIES
echo ========================================
echo.

cd /d "%~dp0"

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Upgrading pip...
python -m pip install --upgrade pip

echo.
echo Installing missing dependencies...
pip install email-validator
pip install passlib[argon2]

echo.
echo Verifying installation...
python -c "import email_validator; print('✓ email-validator installed')"
python -c "import passlib; print('✓ passlib installed')"

echo.
echo ========================================
echo DEPENDENCIES FIXED!
echo ========================================
echo.
echo Starting backend server...
echo Backend will be available at: http://localhost:8000
echo API docs will be available at: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop the server
echo.

uvicorn app.main:app --reload --port 8000
