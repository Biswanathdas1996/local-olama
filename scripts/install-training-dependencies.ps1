# Install Model Training Dependencies
# Run this script to install the required packages for model training features

Write-Host "Installing Model Training Dependencies..." -ForegroundColor Green

# Check if virtual environment exists
if (Test-Path ".\.venv\Scripts\python.exe") {
    Write-Host "Using virtual environment..." -ForegroundColor Cyan
    $pythonCmd = ".\.venv\Scripts\python.exe"
    $pipCmd = ".\.venv\Scripts\pip.exe"
} else {
    Write-Host "Virtual environment not found. Using global Python..." -ForegroundColor Yellow
    $pythonCmd = "python"
    $pipCmd = "pip"
}

# Upgrade pip
Write-Host "`nUpgrading pip..." -ForegroundColor Yellow
& $pythonCmd -m pip install --upgrade pip

# Install core training libraries
Write-Host "`nInstalling PEFT (Parameter-Efficient Fine-Tuning)..." -ForegroundColor Yellow
& $pipCmd install peft>=0.7.0

Write-Host "`nInstalling BitsAndBytes (for quantization)..." -ForegroundColor Yellow
& $pipCmd install bitsandbytes>=0.41.0

Write-Host "`nInstalling Accelerate (for distributed training)..." -ForegroundColor Yellow
& $pipCmd install accelerate>=0.24.0

Write-Host "`nInstalling Datasets library..." -ForegroundColor Yellow
& $pipCmd install datasets>=2.14.0

Write-Host "`nInstalling Evaluate library..." -ForegroundColor Yellow
& $pipCmd install evaluate>=0.4.0

Write-Host "`nInstalling TRL (Transformer Reinforcement Learning)..." -ForegroundColor Yellow
& $pipCmd install trl>=0.7.0

Write-Host "`n" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Training Dependencies Installed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "You can now use the Model Training feature!" -ForegroundColor Cyan
Write-Host "Navigate to http://localhost:3000/training after starting the app" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start the full application:" -ForegroundColor Yellow
Write-Host "  .\scripts\start-fullstack.ps1" -ForegroundColor White
Write-Host ""
