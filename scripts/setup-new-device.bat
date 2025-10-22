@echo off
REM Complete Setup Script for Ollama RAG Platform on a New Device
REM This script will:
REM 1. Check prerequisites (Python, Node.js, Ollama)
REM 2. Create Python virtual environment
REM 3. Install Python dependencies
REM 4. Install frontend dependencies
REM 5. Download spaCy language model
REM 6. Pull llama3 8b model from Ollama

echo =========================================================
echo    Ollama RAG Platform - New Device Setup
echo =========================================================
echo.

REM Change to script directory's parent (project root)
cd /d "%~dp0.."

REM ============================================
REM Step 1: Check Prerequisites
REM ============================================
echo [Step 1/7] Checking prerequisites...
echo.

REM Check Python
echo Checking Python installation...
python --version >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python not found!
    echo Please install Python 3.8 or higher from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)
python --version
echo [OK] Python found
echo.

REM Check Node.js
echo Checking Node.js installation...
node --version >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
node --version
echo [OK] Node.js found
echo.

REM Check npm
echo Checking npm installation...
npm --version >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm not found!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
npm --version
echo [OK] npm found
echo.

REM Check Ollama
echo Checking Ollama installation...
where ollama >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] Ollama not found!
    echo Please install Ollama from https://ollama.ai/download
    echo.
    echo After installing Ollama, you can run this script again.
    echo Or continue without Ollama (you can install it later).
    echo.
    choice /C YN /M "Do you want to continue without Ollama"
    if errorlevel 2 exit /b 1
    set SKIP_OLLAMA=1
) else (
    ollama --version
    echo [OK] Ollama found
    set SKIP_OLLAMA=0
)
echo.

echo [OK] All prerequisites checked!
echo.
timeout /t 2 /nobreak >nul

REM ============================================
REM Step 2: Create Python Virtual Environment
REM ============================================
echo [Step 2/7] Creating Python virtual environment...
echo.

if exist ".venv\" (
    echo Virtual environment already exists. Skipping creation.
) else (
    echo Creating virtual environment...
    python -m venv .venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment!
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created
)
echo.
timeout /t 1 /nobreak >nul

REM ============================================
REM Step 3: Activate Virtual Environment
REM ============================================
echo [Step 3/7] Activating virtual environment...
echo.

call .venv\Scripts\activate.bat
if %errorlevel% neq 0 (
    echo [ERROR] Failed to activate virtual environment!
    pause
    exit /b 1
)
echo [OK] Virtual environment activated
echo.
timeout /t 1 /nobreak >nul

REM ============================================
REM Step 4: Install Python Dependencies
REM ============================================
echo [Step 4/7] Installing Python dependencies...
echo This may take several minutes...
echo.

pip install --upgrade pip
echo.
echo Installing requirements from requirements.txt...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Python dependencies!
    pause
    exit /b 1
)
echo.
echo [OK] Python dependencies installed
echo.
timeout /t 2 /nobreak >nul

REM ============================================
REM Step 5: Download spaCy Language Model
REM ============================================
echo [Step 5/7] Downloading spaCy English language model...
echo.

python -m spacy download en_core_web_sm
if %errorlevel% neq 0 (
    echo [WARNING] Failed to download spaCy model.
    echo You can try again later by running: python -m spacy download en_core_web_sm
) else (
    echo [OK] spaCy model downloaded
)
echo.
timeout /t 2 /nobreak >nul

REM ============================================
REM Step 6: Install Frontend Dependencies
REM ============================================
echo [Step 6/7] Installing frontend dependencies...
echo This may take a few minutes...
echo.

cd frontend
if exist "node_modules\" (
    echo Frontend dependencies already installed. Skipping...
) else (
    echo Installing npm packages...
    npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install frontend dependencies!
        cd ..
        pause
        exit /b 1
    )
    echo [OK] Frontend dependencies installed
)
cd ..
echo.
timeout /t 2 /nobreak >nul

REM ============================================
REM Step 7: Pull Ollama llama3 8b Model
REM ============================================
echo [Step 7/7] Pulling llama3 8b model from Ollama...
echo This will download approximately 4.7GB and may take several minutes...
echo.

if %SKIP_OLLAMA%==1 (
    echo [SKIPPED] Ollama not installed. Skipping model download.
    echo You can download the model later by running: ollama pull llama3
) else (
    echo Starting Ollama service...
    REM Start Ollama serve in background if not running
    tasklist /FI "IMAGENAME eq ollama.exe" 2>NUL | find /I /N "ollama.exe">NUL
    if %errorlevel% neq 0 (
        echo Ollama is not running. Starting it now...
        start "Ollama Server" /MIN ollama serve
        timeout /t 5 /nobreak >nul
    )
    
    echo Pulling llama3 model (this will take a while)...
    ollama pull llama3
    if %errorlevel% neq 0 (
        echo [WARNING] Failed to pull llama3 model.
        echo You can try again later by running: ollama pull llama3
    ) else (
        echo [OK] llama3 model downloaded successfully
    )
)
echo.

REM ============================================
REM Setup Complete
REM ============================================
echo.
echo =========================================================
echo    Setup Complete!
echo =========================================================
echo.
echo Your Ollama RAG Platform is ready to use!
echo.
echo To start all services, run:
echo   scripts\start-all.bat
echo.
echo Or use PowerShell:
echo   scripts\start-all.ps1
echo.
echo Service URLs:
echo   * Backend API:   http://localhost:8000
echo   * API Docs:      http://localhost:8000/docs
echo   * Frontend UI:   http://localhost:3000
echo   * Ollama Server: http://localhost:11434
echo.
echo Available models:
if %SKIP_OLLAMA%==0 (
    ollama list
) else (
    echo   (Install Ollama to see available models)
)
echo.
echo =========================================================
echo.
pause
