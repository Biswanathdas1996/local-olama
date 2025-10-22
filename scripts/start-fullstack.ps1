# Start Both Backend and Frontend

Write-Host "=== Local LLM Platform - Full Stack Startup ===" -ForegroundColor Cyan
Write-Host ""

# Check if virtual environment exists for backend
$venvPath = Join-Path $PSScriptRoot ".venv"
if (-not (Test-Path $venvPath)) {
    Write-Host "✗ Python virtual environment not found!" -ForegroundColor Red
    Write-Host "Please run the backend setup first." -ForegroundColor Yellow
    exit 1
}

# Check if frontend dependencies are installed
$nodeModules = Join-Path $PSScriptRoot "frontend\node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Host "✗ Frontend dependencies not installed!" -ForegroundColor Red
    Write-Host "Please run setup-frontend.ps1 first." -ForegroundColor Yellow
    exit 1
}

Write-Host "Starting backend server..." -ForegroundColor Yellow

# Start backend in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; & '.\.venv\Scripts\Activate.ps1'; python main.py"

# Wait a moment for backend to start
Start-Sleep -Seconds 3

Write-Host "Starting frontend server..." -ForegroundColor Yellow

# Start frontend in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev"

Write-Host ""
Write-Host "✓ Both servers are starting!" -ForegroundColor Green
Write-Host ""
Write-Host "Backend API: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Frontend UI: http://localhost:3000" -ForegroundColor Cyan
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Close the PowerShell windows to stop the servers." -ForegroundColor Yellow
