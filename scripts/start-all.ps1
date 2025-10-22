# Start All Services - Ollama Server, Backend & Frontend
# This script starts all three services in separate windows

Write-Host "=== Local LLM Platform - Starting All Services ===" -ForegroundColor Cyan
Write-Host ""

# Check if virtual environment exists for backend
$venvPath = Join-Path $PSScriptRoot ".venv"
if (-not (Test-Path $venvPath)) {
    Write-Host "✗ Python virtual environment not found!" -ForegroundColor Red
    Write-Host "Please run: python -m venv .venv" -ForegroundColor Yellow
    Write-Host "Then: .\.venv\Scripts\Activate.ps1" -ForegroundColor Yellow
    Write-Host "Then: pip install -r requirements.txt" -ForegroundColor Yellow
    exit 1
}

# Check if frontend dependencies are installed
$nodeModules = Join-Path $PSScriptRoot "frontend\node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Host "✗ Frontend dependencies not installed!" -ForegroundColor Red
    Write-Host "Please run setup-frontend.ps1 first." -ForegroundColor Yellow
    exit 1
}

# Check if Ollama is installed
Write-Host "Checking Ollama installation..." -ForegroundColor Yellow
try {
    $null = Get-Command ollama -ErrorAction Stop
    Write-Host "✓ Ollama found" -ForegroundColor Green
} catch {
    Write-Host "✗ Ollama not found!" -ForegroundColor Red
    Write-Host "Please install Ollama from https://ollama.ai/" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Starting services..." -ForegroundColor Yellow
Write-Host ""

# 1. Start Ollama Server
Write-Host "[1/3] Starting Ollama server on port 11434..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Ollama Server' -ForegroundColor Green; Write-Host 'Port: 11434' -ForegroundColor Cyan; Write-Host ''; $env:OLLAMA_HOST='127.0.0.1:11434'; ollama serve"

# Wait for Ollama to start
Start-Sleep -Seconds 3

# Verify Ollama is running
$ollamaRunning = $false
for ($i = 1; $i -le 10; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 2 -ErrorAction Stop
        $ollamaRunning = $true
        break
    } catch {
        Start-Sleep -Seconds 1
    }
}

if ($ollamaRunning) {
    Write-Host "✓ Ollama server started successfully" -ForegroundColor Green
} else {
    Write-Host "⚠ Ollama server may still be starting..." -ForegroundColor Yellow
}

# 2. Start Backend Server
Write-Host "[2/3] Starting backend server on port 8000..." -ForegroundColor Cyan
$backendScript = @"
Write-Host 'Backend Server' -ForegroundColor Green
Write-Host 'Port: 8000' -ForegroundColor Cyan
Write-Host ''
Set-Location '$PSScriptRoot'
& '$PSScriptRoot\.venv\Scripts\Activate.ps1'
python '$PSScriptRoot\main.py'
"@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript

# Wait for backend to start
Start-Sleep -Seconds 5

# 3. Start Frontend Server
Write-Host "[3/3] Starting frontend server on port 3000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Frontend Server' -ForegroundColor Green; Write-Host 'Port: 3000' -ForegroundColor Cyan; Write-Host ''; cd '$PSScriptRoot\frontend'; npm run dev"

Write-Host ""
Write-Host "✓ All services started successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Service URLs:" -ForegroundColor White
Write-Host "  • Ollama Server: http://localhost:11434" -ForegroundColor Cyan
Write-Host "  • Backend API:   http://localhost:8000" -ForegroundColor Cyan
Write-Host "  • API Docs:      http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "  • Frontend UI:   http://localhost:3000" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "To stop all services, run: .\stop-all.ps1" -ForegroundColor Yellow
Write-Host "Or close all three PowerShell windows manually." -ForegroundColor Gray
Write-Host ""
