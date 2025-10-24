# Local LLM Platform - Startup Script
# This script helps you get started with the platform

Write-Host "🧠 Local LLM Platform - Setup & Start" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

# Check Python installation
Write-Host "📌 Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found. Please install Python 3.11+ first." -ForegroundColor Red
    exit 1
}

# Check Ollama installation
Write-Host "`n📌 Checking Ollama installation..." -ForegroundColor Yellow
try {
    $ollamaVersion = ollama --version 2>&1
    Write-Host "✅ $ollamaVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Ollama not found. Please install from https://ollama.ai/" -ForegroundColor Red
    Write-Host "   The application will start but won't work without Ollama." -ForegroundColor Yellow
}

# Check if virtual environment exists
Write-Host "`n📌 Checking virtual environment..." -ForegroundColor Yellow
if (Test-Path "venv") {
    Write-Host "✅ Virtual environment found" -ForegroundColor Green
} else {
    Write-Host "⚠️  Virtual environment not found. Creating one..." -ForegroundColor Yellow
    python -m venv venv
    Write-Host "✅ Virtual environment created" -ForegroundColor Green
}

# Activate virtual environment
Write-Host "`n📌 Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"
Write-Host "✅ Virtual environment activated" -ForegroundColor Green

# Install/Update dependencies
Write-Host "`n📌 Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt --quiet --disable-pip-version-check
Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Check if Ollama is running
Write-Host "`n📌 Checking Ollama service..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Ollama is running" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Ollama is not running. Starting it now..." -ForegroundColor Yellow
    Write-Host "   If this fails, please start Ollama manually: 'ollama serve'" -ForegroundColor Yellow
    Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 2
}

# Check for models
Write-Host "`n📌 Checking for installed models..." -ForegroundColor Yellow
try {
    $models = ollama list 2>&1
    if ($models -match "NAME") {
        Write-Host "✅ Models found" -ForegroundColor Green
        Write-Host $models
    } else {
        Write-Host "⚠️  No models found. Download one with: 'ollama pull llama3'" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Could not check models" -ForegroundColor Yellow
}

# Start the application
Write-Host "`n🚀 Starting Local LLM Platform..." -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# Set offline mode for HuggingFace (use cached models only)
$env:HF_HUB_OFFLINE = "1"
$env:TRANSFORMERS_OFFLINE = "1"
$env:HF_DATASETS_OFFLINE = "1"
Write-Host "✅ Offline mode enabled (using cached models only)" -ForegroundColor Green

Write-Host "`nAPI will be available at:" -ForegroundColor Green
Write-Host "  • Main API: http://localhost:8000" -ForegroundColor White
Write-Host "  • Swagger UI: http://localhost:8000/docs" -ForegroundColor White
Write-Host "  • ReDoc: http://localhost:8000/redoc" -ForegroundColor White
Write-Host "  • Health: http://localhost:8000/health" -ForegroundColor White
Write-Host "`nPress Ctrl+C to stop the server`n" -ForegroundColor Yellow

# Run the application
python main.py
