#!/bin/bash

# SDG 3 Health Platform Backend Startup Script

echo "Starting SDG 3 Health Platform Backend..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "Please update .env file with your configuration"
fi

# Run the server
echo "Starting FastAPI server..."
uvicorn app.main:app --reload --port 8000
