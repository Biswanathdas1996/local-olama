@echo off
REM Start All Services - Ollama Server, Backend, Frontend & Metabase

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

REM Check if Metabase JAR exists
set "JAVA_PATH=C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot\bin\java.exe"

if not exist "metabase\metabase.jar" (
    echo [WARNING] metabase\metabase.jar not found!
    echo Metabase analytics will not be available.
    echo Run setup-metabase.ps1 to install Metabase.
    echo.
    set SKIP_METABASE=1
) else (
    set SKIP_METABASE=0
)

REM Check if Java exists for Metabase
if %SKIP_METABASE% EQU 0 (
    if not exist "%JAVA_PATH%" (
        echo [WARNING] Java 17 not found at: %JAVA_PATH%
        echo Metabase analytics will not be available.
        echo.
        set SKIP_METABASE=1
    )
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
echo [1/4] Starting Ollama server on port 11434...
start "Ollama Server" cmd /k "echo Ollama Server && echo Port: 11434 && echo. && set OLLAMA_HOST=127.0.0.1:11434 && ollama serve"

REM Wait for Ollama to start
timeout /t 3 /nobreak >nul

echo [OK] Ollama server started
echo.

REM 2. Start Backend Server
echo [2/4] Starting backend server on port 8000...
start "Backend Server" cmd /k "echo Backend Server && echo Port: 8000 && echo. && cd /d "%~dp0.." && call .venv\Scripts\activate.bat && python main.py"

REM Wait for backend to start
timeout /t 5 /nobreak >nul

echo [OK] Backend server started
echo.

REM 3. Start Frontend Server
echo [3/4] Starting frontend server on port 3000...
start "Frontend Server" cmd /k "echo Frontend Server && echo Port: 3000 && echo. && cd /d "%~dp0..\frontend" && npm run dev"

echo.
echo [OK] Frontend server started
echo.

REM 4. Start Metabase Server (if available)
if %SKIP_METABASE% EQU 0 (
    echo [4/4] Starting Metabase analytics on port 3001...
    start "Metabase Server" powershell -NoExit -Command "cd '%~dp0..'; Write-Host 'Metabase Server' -ForegroundColor Cyan; Write-Host 'Port: 3001' -ForegroundColor Green; Write-Host ''; $env:MB_JETTY_PORT='3001'; $env:MB_DB_FILE='metabase\data\metabase.db'; $env:MB_CHECK_FOR_UPDATES='false'; $env:MB_ANON_TRACKING_ENABLED='false'; $env:MB_SEND_EMAIL_ON_FIRST_LOGIN_FROM_NEW_DEVICE='false'; $env:MB_DISABLE_SESSION_THROTTLE='true'; & '%JAVA_PATH%' -jar metabase\metabase.jar"
    echo [OK] Metabase server started
) else (
    echo [4/4] Skipping Metabase (not installed)
)
echo.
echo [OK] All services started successfully!
echo.
echo ===============================================
echo Service URLs:
echo   * Ollama Server:  http://localhost:11434
echo   * Backend API:    http://localhost:8000
echo   * API Docs:       http://localhost:8000/docs
echo   * Frontend UI:    http://localhost:3000
if %SKIP_METABASE% EQU 0 (
    echo   * Metabase Analytics: http://localhost:3001
)
echo ===============================================
echo.
echo To stop all services, run: stop-all.bat
if %SKIP_METABASE% EQU 0 (
    echo Or close all four command prompt windows manually.
) else (
    echo Or close all three command prompt windows manually.
)
echo.
pause
