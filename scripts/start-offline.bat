@echo off
REM Start Local LLM Platform in Complete Offline Mode
REM This batch file sets all necessary environment variables before starting Python

echo ======================================================================
echo   Starting Local LLM Platform (COMPLETE OFFLINE MODE)
echo ======================================================================
echo.

REM Set offline mode environment variables
set HF_HUB_OFFLINE=1
set TRANSFORMERS_OFFLINE=1
set HF_DATASETS_OFFLINE=1
set HF_HUB_DISABLE_TELEMETRY=1
set TRANSFORMERS_CACHE=.\models\embeddings
set HF_HOME=.\models\embeddings

echo [OK] Offline mode enabled for all HuggingFace libraries
echo [OK] Models will be loaded from local cache only
echo.

REM Navigate to project root
cd /d "%~dp0\.."

echo Starting FastAPI server...
echo Project root: %CD%
echo.

REM Start the server
python main.py

pause
