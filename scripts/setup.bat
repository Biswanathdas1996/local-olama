@echo off
REM Complete Setup Script for Local LLM Platform
REM This script installs and configures everything needed to run the platform

echo ========================================================
echo   Local LLM Platform - Complete Setup
echo ========================================================
echo.
echo This script will install and configure:
echo   1. Python Virtual Environment
echo   2. Python Dependencies (Backend)
echo   3. Node.js Dependencies (Frontend)
echo   4. Metabase Analytics Platform
echo   5. Required ML Models and Data
echo   6. Ollama LLM Server
echo.
echo Estimated time: 15-30 minutes depending on internet speed
echo ========================================================
echo.

REM Change to project root (parent directory of scripts folder)
cd /d "%~dp0.."
set "PROJECT_ROOT=%CD%"

REM ============================================================
REM STEP 1: Check Prerequisites
REM ============================================================
echo.
echo [STEP 1/6] Checking prerequisites...
echo.

REM Check Python
echo Checking Python installation...
python --version >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python not found!
    echo Please install Python 3.9 or higher from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo [OK] Python %PYTHON_VERSION% found
echo.

REM Check Node.js
echo Checking Node.js installation...
node --version >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found!
    echo Please install Node.js 18 or higher from https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=1" %%i in ('node --version 2^>^&1') do set NODE_VERSION=%%i
echo [OK] Node.js %NODE_VERSION% found
echo.

REM Check npm
echo Checking npm installation...
npm --version >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm not found!
    echo npm should be installed with Node.js
    pause
    exit /b 1
)
for /f "tokens=1" %%i in ('npm --version 2^>^&1') do set NPM_VERSION=%%i
echo [OK] npm %NPM_VERSION% found
echo.

REM Check Git (optional but recommended)
echo Checking Git installation...
git --version >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] Git not found (optional)
    echo Git is recommended for version control
) else (
    for /f "tokens=3" %%i in ('git --version 2^>^&1') do set GIT_VERSION=%%i
    echo [OK] Git %GIT_VERSION% found
)
echo.

echo [OK] All prerequisites satisfied!
echo.

REM ============================================================
REM STEP 2: Setup Python Virtual Environment
REM ============================================================
echo.
echo [STEP 2/6] Setting up Python virtual environment...
echo.

if exist ".venv\" (
    echo [INFO] Virtual environment already exists
    choice /C YN /M "Do you want to recreate it? (recommended for clean setup)"
    if %errorlevel% equ 1 (
        echo Removing old virtual environment...
        rmdir /s /q .venv
        echo Creating new virtual environment...
        python -m venv .venv
        if %errorlevel% neq 0 (
            echo [ERROR] Failed to create virtual environment
            pause
            exit /b 1
        )
        echo [OK] Virtual environment created
    ) else (
        echo [INFO] Keeping existing virtual environment
    )
) else (
    echo Creating virtual environment...
    python -m venv .venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created
)
echo.

REM ============================================================
REM STEP 3: Install Python Dependencies
REM ============================================================
echo.
echo [STEP 3/6] Installing Python dependencies...
echo This may take 10-20 minutes depending on internet speed...
echo.

REM Activate virtual environment
call .venv\Scripts\activate.bat

REM Upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip
echo.

REM Install PyTorch first (large dependency)
echo Installing PyTorch (this will take a while)...
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install PyTorch
    pause
    exit /b 1
)
echo [OK] PyTorch installed
echo.

REM Install all requirements
echo Installing remaining Python dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Python dependencies
    echo Check the error messages above
    pause
    exit /b 1
)
echo.
echo [OK] Python dependencies installed
echo.

REM Download spaCy language model
echo Downloading spaCy English language model...
python -m spacy download en_core_web_sm
echo.

REM ============================================================
REM STEP 4: Install Frontend Dependencies
REM ============================================================
echo.
echo [STEP 4/6] Installing frontend dependencies...
echo.

cd frontend
if %errorlevel% neq 0 (
    echo [ERROR] Frontend directory not found
    cd "%PROJECT_ROOT%"
    pause
    exit /b 1
)

if exist "node_modules\" (
    echo [INFO] Frontend dependencies already installed
    choice /C YN /M "Do you want to reinstall them?"
    if %errorlevel% equ 1 (
        echo Removing old node_modules...
        rmdir /s /q node_modules
        echo Installing frontend dependencies...
        npm install
    ) else (
        echo [INFO] Keeping existing frontend dependencies
    )
) else (
    echo Installing frontend dependencies...
    npm install
)

if %errorlevel% neq 0 (
    echo [ERROR] Failed to install frontend dependencies
    cd "%PROJECT_ROOT%"
    pause
    exit /b 1
)

cd "%PROJECT_ROOT%"
echo [OK] Frontend dependencies installed
echo.

REM ============================================================
REM STEP 5: Setup Metabase Analytics
REM ============================================================
echo.
echo [STEP 5/6] Setting up Metabase analytics...
echo.

REM Check if Java is installed
echo Checking Java installation for Metabase...
set "JAVA_PATH=C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot\bin\java.exe"
if not exist "%JAVA_PATH%" (
    REM Try to find Java in common locations
    where java >nul 2>nul
    if %errorlevel% equ 0 (
        for /f "tokens=*" %%i in ('where java') do set "JAVA_PATH=%%i"
        echo [OK] Java found at: %JAVA_PATH%
    ) else (
        echo [WARNING] Java 17 not found
        echo Metabase requires Java 17 or higher
        echo Download from: https://adoptium.net/temurin/releases/
        echo.
        choice /C YN /M "Skip Metabase installation"
        if %errorlevel% equ 1 (
            echo [INFO] Skipping Metabase setup
            goto SKIP_METABASE
        )
    )
) else (
    echo [OK] Java 17 found
)

REM Download Metabase if not present
if not exist "metabase\metabase.jar" (
    echo Downloading Metabase...
    echo This may take several minutes (file size ~300MB)...
    powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://downloads.metabase.com/v0.48.0/metabase.jar' -OutFile 'metabase\metabase.jar'}"
    
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to download Metabase
        echo You can manually download it from: https://www.metabase.com/start/oss/jar
        echo And place it in the metabase directory
    ) else (
        echo [OK] Metabase downloaded
    )
) else (
    echo [OK] Metabase already downloaded
)

REM Create Metabase directories
if not exist "metabase\data\" mkdir metabase\data
if not exist "metabase\plugins\" mkdir metabase\plugins

echo [OK] Metabase setup complete
echo.

:SKIP_METABASE

REM ============================================================
REM STEP 6: Download and Setup Models
REM ============================================================
echo.
echo [STEP 6/6] Setting up ML models and data directories...
echo.

REM Create necessary directories
echo Creating data directories...
if not exist "data\custom_datasets\" mkdir data\custom_datasets
if not exist "data\docling_output\" mkdir data\docling_output
if not exist "data\keyword_index\" mkdir data\keyword_index
if not exist "data\processed_images\" mkdir data\processed_images
if not exist "data\training_data\" mkdir data\training_data
if not exist "data\vector_store\" mkdir data\vector_store
if not exist "models\checkpoints\" mkdir models\checkpoints
if not exist "models\docling_models\" mkdir models\docling_models
if not exist "models\embeddings\" mkdir models\embeddings
if not exist "models\trained\" mkdir models\trained
if not exist "attached_assets\generated_images\" mkdir attached_assets\generated_images
echo [OK] Directories created
echo.

REM Download Docling models
echo Downloading Docling models...
call .venv\Scripts\activate.bat
python -c "from docling.document_converter import DocumentConverter; converter = DocumentConverter(); print('Docling models initialized')"
echo [OK] Docling models ready
echo.

REM Download embedding models
echo Downloading sentence transformer models...
python -c "from sentence_transformers import SentenceTransformer; model = SentenceTransformer('all-MiniLM-L6-v2'); print('Embedding model downloaded')"
echo [OK] Embedding models ready
echo.

REM ============================================================
REM STEP 7: Install Ollama
REM ============================================================
echo.
echo [STEP 7/7] Checking Ollama installation...
echo.

where ollama >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] Ollama not found!
    echo.
    echo Ollama is required to run local LLM models
    echo.
    echo To install Ollama:
    echo   1. Visit https://ollama.ai/download
    echo   2. Download and install Ollama for Windows
    echo   3. After installation, run: ollama pull llama2
    echo      or any other model you want to use
    echo.
    choice /C YN /M "Do you want to open the Ollama download page now"
    if %errorlevel% equ 1 (
        start https://ollama.ai/download
    )
    echo.
    echo [INFO] Please install Ollama and rerun this script
) else (
    echo [OK] Ollama is installed
    echo.
    echo Checking installed models...
    ollama list
    echo.
    echo [INFO] If no models are listed above, run:
    echo   ollama pull llama2
    echo   or
    echo   ollama pull mistral
)
echo.

REM ============================================================
REM SETUP COMPLETE
REM ============================================================
echo.
echo ========================================================
echo   Setup Complete!
echo ========================================================
echo.
echo Next steps:
echo   1. If you haven't already, install Ollama from https://ollama.ai/
echo   2. Pull a model: ollama pull llama2
echo   3. Start all services: scripts\start-all.bat
echo.
echo Service URLs (after starting):
echo   * Ollama Server:  http://localhost:11434
echo   * Backend API:    http://localhost:8000
echo   * API Docs:       http://localhost:8000/docs
echo   * Frontend UI:    http://localhost:3000
if exist "metabase\metabase.jar" (
    echo   * Metabase Analytics: http://localhost:3001
)
echo.
echo ========================================================
echo.

REM Deactivate virtual environment
call .venv\Scripts\deactivate.bat 2>nul

pause
