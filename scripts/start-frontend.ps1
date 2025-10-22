# Start Frontend Development Server

Write-Host "=== Local LLM Platform - Starting Frontend ===" -ForegroundColor Cyan
Write-Host ""

# Navigate to frontend directory
$frontendDir = Join-Path $PSScriptRoot "frontend"
if (-not (Test-Path $frontendDir)) {
    Write-Host "✗ Frontend directory not found!" -ForegroundColor Red
    Write-Host "Please run setup-frontend.ps1 first." -ForegroundColor Yellow
    exit 1
}

# Check if node_modules exists
$nodeModules = Join-Path $frontendDir "node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Host "✗ Dependencies not installed!" -ForegroundColor Red
    Write-Host "Please run setup-frontend.ps1 first." -ForegroundColor Yellow
    exit 1
}

Set-Location $frontendDir

Write-Host "Starting frontend development server..." -ForegroundColor Yellow
Write-Host "The app will be available at http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Start the development server
npm run dev
