#!/usr/bin/env pwsh
# Install RAG-specific dependencies for optimal performance

Write-Host "Installing RAG Enhancement Dependencies..." -ForegroundColor Green
Write-Host ""

# Activate virtual environment
$venvPath = ".\.venv\Scripts\Activate.ps1"
if (Test-Path $venvPath) {
    Write-Host "Activating virtual environment..." -ForegroundColor Yellow
    & $venvPath
} else {
    Write-Host "Virtual environment not found. Please run setup first." -ForegroundColor Red
    exit 1
}

# Install core dependencies
Write-Host "`nInstalling KeyBERT for semantic keyword extraction..." -ForegroundColor Cyan
pip install keybert --quiet

Write-Host "Installing sentence-transformers..." -ForegroundColor Cyan
pip install sentence-transformers --quiet

Write-Host "Installing spaCy for NLP..." -ForegroundColor Cyan
pip install spacy --quiet

Write-Host "Installing Whoosh for full-text search..." -ForegroundColor Cyan
pip install whoosh --quiet

# Download spaCy model
Write-Host "`nDownloading spaCy English model..." -ForegroundColor Cyan
python -m spacy download en_core_web_sm

Write-Host "`n✅ RAG dependencies installed successfully!" -ForegroundColor Green
Write-Host "You can now use enhanced keyword extraction and hybrid search." -ForegroundColor Green
