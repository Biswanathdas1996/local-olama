# Start backend server in offline mode
# This script ensures all HuggingFace libraries use cached models only

Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 69) -ForegroundColor Cyan
Write-Host "  Starting Local LLM Platform (OFFLINE MODE)" -ForegroundColor Green
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 69) -ForegroundColor Cyan
Write-Host ""

# Set offline mode environment variables
$env:HF_HUB_OFFLINE = "1"
$env:TRANSFORMERS_OFFLINE = "1"
$env:HF_DATASETS_OFFLINE = "1"

Write-Host "✓ Offline mode enabled for HuggingFace libraries" -ForegroundColor Green
Write-Host "✓ Models will be loaded from local cache only" -ForegroundColor Green
Write-Host ""

# Navigate to project root
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
Set-Location $projectRoot

Write-Host "Starting FastAPI server..." -ForegroundColor Yellow
Write-Host "Project root: $projectRoot" -ForegroundColor Gray
Write-Host ""

# Start the server
python main.py
