@echo off
REM Start All Services - Ollama Server, Backend & Frontend

echo === Local LLM Platform - Starting All Services ===
echo.

REM Change to project root (parent directory of scripts folder)
cd /d "%~dp0.."

REM Check if virtual environment exists
if not exist ".venv\" (
    echo [ERROR] Python virtual environment not found!
    echo Please run: python -m venv .venv
    echo Then: .venv\Scripts\activate.bat
    echo Then: pip install -r requirements.txt
    exit /b 1
)

REM Check if frontend dependencies are installed
if not exist "frontend\node_modules\" (
    echo [ERROR] Frontend dependencies not installed!
    echo Please run setup-frontend.ps1 first.
    exit /b 1
)

REM Check if Ollama is installed
echo Checking Ollama installation...
where ollama >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Ollama not found!
    echo Please install Ollama from https://ollama.ai/
    exit /b 1
)
echo [OK] Ollama found
echo.

echo Starting services...
echo.

REM 1. Start Ollama Server
echo [1/3] Starting Ollama server on port 11434...
start "Ollama Server" cmd /k "echo Ollama Server && echo Port: 11434 && echo. && set OLLAMA_HOST=127.0.0.1:11434 && ollama serve"

REM Wait for Ollama to start
timeout /t 3 /nobreak >nul

echo [OK] Ollama server started
echo.

REM 2. Start Backend Server
echo [2/3] Starting backend server on port 8000...
start "Backend Server" cmd /k "echo Backend Server && echo Port: 8000 && echo. && cd /d "%~dp0.." && call .venv\Scripts\activate.bat && python main.py"

REM Wait for backend to start
timeout /t 5 /nobreak >nul

echo [OK] Backend server started
echo.

REM 3. Start Frontend Server
echo [3/3] Starting frontend server on port 3000...
start "Frontend Server" cmd /k "echo Frontend Server && echo Port: 3000 && echo. && cd /d "%~dp0..\frontend" && npm run dev"

echo.
echo [OK] All services started successfully!
echo.
echo ===============================================
echo Service URLs:
echo   * Ollama Server: http://localhost:11434
echo   * Backend API:   http://localhost:8000
echo   * API Docs:      http://localhost:8000/docs
echo   * Frontend UI:   http://localhost:3000
echo ===============================================
echo.
echo To stop all services, run: stop-all.bat
echo Or close all three command prompt windows manually.
echo.
pause
