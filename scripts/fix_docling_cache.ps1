# Fix Docling Model Cache Issues
# This script clears the Docling cache and forces re-download of models

Write-Host "`n===============================================" -ForegroundColor Cyan
Write-Host "Docling Cache Repair Tool" -ForegroundColor Cyan
Write-Host "===============================================`n" -ForegroundColor Cyan

# 0. Ensure HF_HUB_OFFLINE is disabled (enable online downloads)
Write-Host "Checking Hugging Face offline mode..." -ForegroundColor Yellow
if ($env:HF_HUB_OFFLINE -eq "1") {
    Write-Host "   HF_HUB_OFFLINE is currently set to 1 (offline mode)" -ForegroundColor Red
    Write-Host "   Setting HF_HUB_OFFLINE=0 to enable model downloads..." -ForegroundColor Yellow
    $env:HF_HUB_OFFLINE = "0"
} else {
    Write-Host "   HF_HUB_OFFLINE is not blocking downloads" -ForegroundColor Green
}

# 1. Find Hugging Face cache directory
$HF_HOME = $env:HF_HOME
if (-not $HF_HOME) {
    $HF_HOME = Join-Path $env:USERPROFILE ".cache\huggingface"
}

Write-Host "Hugging Face Cache Location: $HF_HOME" -ForegroundColor Yellow

# 2. Backup existing cache (optional)
$backupDir = Join-Path $env:TEMP "docling_cache_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Write-Host "`nCreating backup at: $backupDir" -ForegroundColor Yellow

if (Test-Path $HF_HOME) {
    try {
        New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
        Copy-Item -Path $HF_HOME -Destination $backupDir -Recurse -ErrorAction SilentlyContinue
        Write-Host "Backup created successfully" -ForegroundColor Green
    } catch {
        Write-Host "Backup failed (non-critical): $_" -ForegroundColor Yellow
    }
}

# 3. Clear Docling-related caches
Write-Host "`nClearing Docling model cache..." -ForegroundColor Yellow

$cacheDirs = @(
    (Join-Path $HF_HOME "hub"),
    (Join-Path $HF_HOME "modules"),
    (Join-Path $env:USERPROFILE ".docling"),
    (Join-Path $env:LOCALAPPDATA "docling")
)

foreach ($dir in $cacheDirs) {
    if (Test-Path $dir) {
        Write-Host "   Removing: $dir" -ForegroundColor Gray
        try {
            Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "   Cleared" -ForegroundColor Green
        } catch {
            Write-Host "   Failed to clear: $_" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   Not found: $dir" -ForegroundColor Gray
    }
}

# 4. Pre-download Docling models
Write-Host "`nPre-downloading Docling models..." -ForegroundColor Yellow
Write-Host "   This may take several minutes depending on your connection..." -ForegroundColor Gray

$pythonScript = @"
import os
import sys

# Set cache directory and ENABLE online mode
os.environ['HF_HOME'] = r'$HF_HOME'
os.environ['HF_HUB_OFFLINE'] = '0'  # Enable online downloads

print('\nInitializing Docling with model download...')
print('HF_HOME: ' + os.environ.get('HF_HOME', 'not set'))
print('HF_HUB_OFFLINE: ' + os.environ.get('HF_HUB_OFFLINE', 'not set'))

try:
    from docling.document_converter import DocumentConverter
    from docling.datamodel.base_models import InputFormat
    
    print('Docling imported successfully')
    
    # Initialize converter - this will download models
    print('Downloading models (this may take a few minutes)...')
    converter = DocumentConverter(
        allowed_formats=[
            InputFormat.PDF,
            InputFormat.DOCX,
            InputFormat.HTML,
            InputFormat.PPTX,
        ]
    )
    
    print('Docling models downloaded and cached successfully!')
    print('Models cached in: ' + os.environ.get('HF_HOME', 'default location'))
    
except Exception as e:
    print('Error: ' + str(e))
    import traceback
    traceback.print_exc()
    sys.exit(1)
"@

# Save Python script
$scriptPath = Join-Path $env:TEMP "download_docling_models.py"
$pythonScript | Out-File -FilePath $scriptPath -Encoding UTF8

# Run Python script
python $scriptPath

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nDocling models downloaded successfully!" -ForegroundColor Green
    Write-Host "   You can now use Docling for document extraction." -ForegroundColor Green
} else {
    Write-Host "`nFailed to download Docling models." -ForegroundColor Red
    Write-Host "   Please check your internet connection and try again." -ForegroundColor Red
}

# Cleanup
Remove-Item -Path $scriptPath -Force -ErrorAction SilentlyContinue

Write-Host "`n===============================================" -ForegroundColor Cyan
Write-Host "Cache Repair Complete" -ForegroundColor Cyan
Write-Host "===============================================`n" -ForegroundColor Cyan
