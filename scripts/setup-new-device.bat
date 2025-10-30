@echo off
REM Complete Setup Script for Ollama RAG Platform on a New Device
REM This script will perform a COMPLETE initial setup including:
REM 1. Check prerequisites (Python, Node.js, Ollama)
REM 2. Create Python virtual environment
REM 3. Install all Python dependencies (core, RAG, image processing, training)
REM 4. Install frontend dependencies
REM 5. Download spaCy language model
REM 6. Download all AI models (embedding, docling, paddleocr)
REM 7. Pull Ollama LLM models
REM 8. Verify offline setup
REM
REM Expected time: 20-60 minutes (depending on internet speed)
REM Total download size: ~6-8 GB

echo =========================================================
echo    Ollama RAG Platform - Complete Initial Setup
echo =========================================================
echo    This will download 6-8 GB and take 20-60 minutes
echo =========================================================
echo.

REM Change to script directory's parent (project root)
cd /d "%~dp0.."

REM ============================================
REM Step 0: Display Setup Plan
REM ============================================
echo.
echo This setup will perform the following:
echo   [1] Check prerequisites (Python, Node.js, Ollama)
echo   [2] Create Python virtual environment
echo   [3] Install core Python dependencies (~500MB)
echo   [4] Install RAG, image processing, training dependencies
echo   [5] Install frontend dependencies
echo   [6] Download spaCy language model
echo   [7] Download embedding models (~500MB)
echo   [8] Download Docling models (~1GB)
echo   [9] Download PaddleOCR models (~500MB)
echo   [10] Pull Ollama llama3 model (~4.7GB)
echo   [11] Verify offline setup
echo.
echo Total download size: Approximately 6-8 GB
echo Estimated time: 20-60 minutes (depends on internet speed)
echo.
choice /C YN /M "Continue with complete setup"
if errorlevel 2 (
    echo Setup cancelled.
    exit /b 0
)
echo.

REM ============================================
REM Step 1: Check Prerequisites
REM ============================================
echo =========================================================
echo [Step 1/11] Checking prerequisites...
echo =========================================================
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
echo =========================================================
echo [Step 2/11] Creating Python virtual environment...
echo =========================================================
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
echo =========================================================
echo [Step 3/11] Activating virtual environment...
echo =========================================================
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
REM Step 4: Install Core Python Dependencies
REM ============================================
echo =========================================================
echo [Step 4/11] Installing core Python dependencies...
echo This may take several minutes (downloading ~500MB)...
echo =========================================================
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
REM Step 5: Install Additional Dependencies
REM ============================================
echo =========================================================
echo [Step 5/11] Installing additional dependencies...
echo (RAG, Image Processing, Training modules)
echo =========================================================
echo.

REM Install RAG dependencies
echo Installing RAG enhancement dependencies...
pip install keybert --quiet
pip install whoosh --quiet
echo [OK] RAG dependencies installed
echo.

REM Install Image Processing dependencies
echo Installing image processing dependencies...
pip install paddleocr>=2.7.0 --quiet
pip install paddlepaddle>=2.5.0 --quiet
pip install opencv-python>=4.8.0 --quiet
pip install shapely>=2.0.0 --quiet
echo [OK] Image processing dependencies installed
echo.

REM Install Training dependencies
echo Installing training dependencies...
pip install peft>=0.7.0 --quiet
pip install bitsandbytes>=0.41.0 --quiet
pip install accelerate>=0.24.0 --quiet
pip install datasets>=2.14.0 --quiet
pip install evaluate>=0.4.0 --quiet
pip install trl>=0.7.0 --quiet
echo [OK] Training dependencies installed
echo.
timeout /t 2 /nobreak >nul

REM ============================================
REM Step 6: Download spaCy Language Model
REM ============================================
echo =========================================================
echo [Step 6/11] Downloading spaCy English language model...
echo =========================================================
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
REM Step 7: Install Frontend Dependencies
REM ============================================
echo =========================================================
echo [Step 7/11] Installing frontend dependencies...
echo This may take a few minutes...
echo =========================================================
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
REM Step 8: Download Embedding Models
REM ============================================
echo =========================================================
echo [Step 8/11] Downloading embedding models...
echo This will download ~500MB of AI models for text embeddings
echo =========================================================
echo.

python scripts\download_embedding_models.py
if %errorlevel% neq 0 (
    echo [WARNING] Failed to download embedding models.
    echo You can try again later by running: python scripts\download_embedding_models.py
    echo.
    choice /C YN /M "Continue setup anyway"
    if errorlevel 2 exit /b 1
) else (
    echo [OK] Embedding models downloaded successfully
)
echo.
timeout /t 2 /nobreak >nul

REM ============================================
REM Step 9: Download Docling Models
REM ============================================
echo =========================================================
echo [Step 9/11] Downloading Docling models...
echo This will download ~1GB of AI models for document processing
echo =========================================================
echo.

python scripts\download_docling_models.py
if %errorlevel% neq 0 (
    echo [WARNING] Failed to download Docling models.
    echo You can try again later by running: python scripts\download_docling_models.py
    echo.
    choice /C YN /M "Continue setup anyway"
    if errorlevel 2 exit /b 1
) else (
    echo [OK] Docling models downloaded successfully
)
echo.
timeout /t 2 /nobreak >nul

REM ============================================
REM Step 10: Download PaddleOCR Models
REM ============================================
echo =========================================================
echo [Step 10/11] Downloading PaddleOCR models...
echo This will download ~500MB of AI models for OCR
echo =========================================================
echo.

python scripts\download_paddleocr_models.py
if %errorlevel% neq 0 (
    echo [WARNING] Failed to download PaddleOCR models.
    echo You can try again later by running: python scripts\download_paddleocr_models.py
    echo.
    choice /C YN /M "Continue setup anyway"
    if errorlevel 2 exit /b 1
) else (
    echo [OK] PaddleOCR models downloaded successfully
)
echo.
timeout /t 2 /nobreak >nul

REM ============================================
REM Step 11: Pull Ollama LLM Models
REM ============================================
echo =========================================================
echo [Step 11/11] Pulling Ollama llama3 model...
echo This will download approximately 4.7GB and may take several minutes...
echo =========================================================
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
    
    REM Optionally pull additional models
    echo.
    echo Additional recommended models (optional):
    echo   - llama3:70b (larger, more capable model - 40GB)
    echo   - mistral (faster, smaller model - 4.1GB)
    echo   - codellama (specialized for coding - 3.8GB)
    echo.
    choice /C YN /M "Do you want to download additional models now"
    if not errorlevel 2 (
        echo.
        echo Select additional models to download:
        echo   1. Mistral (4.1GB - fast and efficient)
        echo   2. CodeLlama (3.8GB - best for coding)
        echo   3. Both
        echo   4. Skip
        choice /C 1234 /M "Select option"
        
        if errorlevel 4 goto skip_additional
        if errorlevel 3 (
            echo Downloading Mistral...
            ollama pull mistral
            echo Downloading CodeLlama...
            ollama pull codellama
            goto skip_additional
        )
        if errorlevel 2 (
            echo Downloading CodeLlama...
            ollama pull codellama
            goto skip_additional
        )
        if errorlevel 1 (
            echo Downloading Mistral...
            ollama pull mistral
        )
        :skip_additional
    )
)
echo.

REM ============================================
REM Verify Offline Setup
REM ============================================
echo =========================================================
echo Verifying offline setup...
echo =========================================================
echo.

python scripts\verify_offline_setup.py
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Some offline verification checks failed.
    echo The application may still work, but some features might require internet.
    echo.
) else (
    echo.
    echo [OK] All offline verification checks passed!
    echo.
)

REM ============================================
REM Setup Complete
REM ============================================
echo.
echo =========================================================
echo    SETUP COMPLETE!
echo =========================================================
echo.
echo Your Ollama RAG Platform is fully configured and ready!
echo.
echo =========================================================
echo INSTALLED COMPONENTS:
echo =========================================================
echo   [✓] Python virtual environment
echo   [✓] Core dependencies (FastAPI, Uvicorn, etc.)
echo   [✓] RAG dependencies (KeyBERT, Whoosh, spaCy)
echo   [✓] Image processing (PaddleOCR, OpenCV)
echo   [✓] Training libraries (PEFT, LoRA, etc.)
echo   [✓] Frontend (React + TypeScript + Vite)
echo   [✓] Embedding models (sentence-transformers)
echo   [✓] Docling models (document extraction)
echo   [✓] PaddleOCR models (OCR capabilities)
echo   [✓] Ollama LLM models
echo.
echo =========================================================
echo NEXT STEPS:
echo =========================================================
echo.
echo 1. START THE APPLICATION:
echo    Full stack:  scripts\start-all.bat
echo    Or:          scripts\start-all.ps1
echo.
echo    Offline mode: scripts\start-offline.bat
echo                  scripts\start-backend-offline.ps1
echo.
echo 2. ACCESS THE SERVICES:
echo    * Backend API:   http://localhost:8000
echo    * API Docs:      http://localhost:8000/docs
echo    * Frontend UI:   http://localhost:3000
echo    * Ollama Server: http://localhost:11434
echo.
echo 3. VERIFY SETUP:
echo    Test offline:  python scripts\verify_offline_setup.py
echo    List models:   ollama list
echo.
echo =========================================================
echo USEFUL COMMANDS:
echo =========================================================
echo   Download more models:
echo     python scripts\download_embedding_models.py --list-available
echo     ollama list  (to see available LLM models)
echo     ollama pull <model-name>  (to download more)
echo.
echo   Training features:
echo     Navigate to http://localhost:3000/training
echo.
echo   Stop all services:
echo     scripts\stop-all.bat
echo.
echo =========================================================
echo OFFLINE MODE:
echo =========================================================
echo   All AI models are now cached locally!
echo   The app can run completely offline.
echo.
echo   To enable offline mode, set environment variables:
echo     $env:HF_HUB_OFFLINE='1'
echo     $env:TRANSFORMERS_OFFLINE='1'
echo.
echo   Or use: scripts\start-offline.bat
echo.
echo =========================================================
echo =========================================================
echo.
echo Available Ollama models:
if %SKIP_OLLAMA%==0 (
    ollama list
) else (
    echo   (Install Ollama to see available models)
)
echo.
echo =========================================================
echo.
echo Setup completed at: %date% %time%
echo.
pause
