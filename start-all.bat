@echo off
REM Start All Services - Ollama Server, Backend & Frontend
REM This script starts all three services in separate windows

echo ====================================================
echo   Local LLM Platform - Starting All Services
echo ====================================================
echo.

REM Check if virtual environment exists
if not exist ".venv\" (
    echo [ERROR] Python virtual environment not found!
    echo Please run: python -m venv .venv
    echo Then: .venv\Scripts\activate
    echo Then: pip install -r requirements.txt
    pause
    exit /b 1
)

REM Check if frontend dependencies are installed
if not exist "frontend\node_modules\" (
    echo [ERROR] Frontend dependencies not installed!
    echo Please run: setup-frontend.ps1
    pause
    exit /b 1
)

REM Check if Ollama is installed
where ollama >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Ollama not found!
    echo Please install Ollama from https://ollama.ai/
    pause
    exit /b 1
)

echo Starting services...
echo.

REM 1. Start Ollama Server
echo [1/3] Starting Ollama server on port 11434...
start "Ollama Server - Port 11434" cmd /k "echo Ollama Server & echo Port: 11434 & echo. & set OLLAMA_HOST=127.0.0.1:11434 & ollama serve"

REM Wait for Ollama to start
timeout /t 3 /nobreak >nul

REM 2. Start Backend Server
echo [2/3] Starting backend server on port 8000...
start "Backend Server - Port 8000" cmd /k "echo Backend Server & echo Port: 8000 & echo. & cd /d "%~dp0" & call "%~dp0.venv\Scripts\activate.bat" & python "%~dp0main.py""

REM Wait for backend to start
timeout /t 5 /nobreak >nul

REM 3. Start Frontend Server
echo [3/3] Starting frontend server on port 3000...
start "Frontend Server - Port 3000" cmd /k "echo Frontend Server & echo Port: 3000 & echo. & cd /d "%~dp0frontend" & npm run dev"

echo.
echo ====================================================
echo   All services started successfully!
echo ====================================================
echo.
echo Service URLs:
echo   - Ollama Server: http://localhost:11434
echo   - Backend API:   http://localhost:8000
echo   - API Docs:      http://localhost:8000/docs
echo   - Frontend UI:   http://localhost:3000
echo ====================================================
echo.
echo To stop all services, run: stop-all.bat
echo Or close all three command prompt windows manually.
echo.
pause
