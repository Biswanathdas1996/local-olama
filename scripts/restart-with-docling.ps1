# Restart the Local Olama application with Docling enabled

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "RESTARTING LOCAL OLAMA WITH DOCLING" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# Step 1: Stop all Python processes
Write-Host "[1/4] Stopping all Python processes..." -ForegroundColor Yellow
Get-Process -Name python -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Write-Host "  ✓ All Python processes stopped`n" -ForegroundColor Green

# Step 2: Clean Python cache
Write-Host "[2/4] Cleaning Python cache..." -ForegroundColor Yellow
Get-ChildItem -Path . -Recurse -Directory -Filter "__pycache__" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force
Write-Host "  ✓ Python cache cleaned`n" -ForegroundColor Green

# Step 3: Verify Docling is available
Write-Host "[3/4] Verifying Docling installation..." -ForegroundColor Yellow
$doclingCheck = python -c "from core.doc_extractor import DOCLING_AVAILABLE; print(DOCLING_AVAILABLE)" 2>&1
if ($doclingCheck -match "True") {
    Write-Host "  ✓ Docling is available and ready!`n" -ForegroundColor Green
} else {
    Write-Host "  ✗ Docling NOT available - there may be import errors`n" -ForegroundColor Red
    Write-Host "  Running detailed check..." -ForegroundColor Yellow
    python -c "from core import doc_extractor"
}

# Step 4: Start the application
Write-Host "[4/4] Starting application..." -ForegroundColor Yellow
Write-Host "  Server will start on http://0.0.0.0:8000" -ForegroundColor Cyan
Write-Host "  Press CTRL+C to stop`n" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# Set offline mode
$env:HF_HUB_OFFLINE = '1'
$env:TRANSFORMERS_OFFLINE = '1'
$env:HF_DATASETS_OFFLINE = '1'

# Start the app
python main.py
