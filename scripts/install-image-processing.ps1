# Image Processing Dependencies Installation Script
# Run this script to install PaddleOCR and related dependencies

Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "Installing Image Processing Dependencies" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

# Check if virtual environment is activated
if ($env:VIRTUAL_ENV) {
    Write-Host "✓ Virtual environment detected: $env:VIRTUAL_ENV" -ForegroundColor Green
} else {
    Write-Host "⚠ No virtual environment detected. It's recommended to use one." -ForegroundColor Yellow
    Write-Host "  Consider running: .\.venv\Scripts\Activate.ps1" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne 'y') {
        Write-Host "Installation cancelled." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Installing core dependencies..." -ForegroundColor Cyan

# Install PaddleOCR and dependencies
$packages = @(
    "paddleocr>=2.7.0",
    "paddlepaddle>=2.5.0",
    "opencv-python>=4.8.0",
    "shapely>=2.0.0"
)

foreach ($package in $packages) {
    Write-Host ""
    Write-Host "Installing $package..." -ForegroundColor Yellow
    python -m pip install $package --upgrade
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to install $package" -ForegroundColor Red
        Write-Host "  Please install manually: pip install $package" -ForegroundColor Red
    } else {
        Write-Host "✓ Successfully installed $package" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "Verifying Installation..." -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan

# Test imports
Write-Host ""
Write-Host "Testing imports..." -ForegroundColor Yellow

$testScript = @"
try:
    import paddleocr
    print('✓ PaddleOCR imported successfully')
    
    import cv2
    print('✓ OpenCV imported successfully')
    
    import shapely
    print('✓ Shapely imported successfully')
    
    from PIL import Image
    print('✓ Pillow imported successfully')
    
    # Test basic functionality
    from paddleocr import PaddleOCR
    print('\n✓ All image processing dependencies installed correctly!')
    print('\nTo enable GPU acceleration, install paddlepaddle-gpu instead:')
    print('  pip uninstall paddlepaddle')
    print('  pip install paddlepaddle-gpu')
    
except ImportError as e:
    print(f'✗ Import failed: {e}')
    exit(1)
"@

python -c $testScript

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=" * 80 -ForegroundColor Green
    Write-Host "✓ Image Processing Setup Complete!" -ForegroundColor Green
    Write-Host "=" * 80 -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "  1. Test image processor: python -c ""from core.image_processor import get_image_processor; print(get_image_processor().get_processor_info())""" -ForegroundColor White
    Write-Host "  2. Read documentation: IMAGE_PROCESSING_PIPELINE.md" -ForegroundColor White
    Write-Host "  3. Upload a document with images to test the pipeline" -ForegroundColor White
    Write-Host ""
    Write-Host "Optional - GPU Acceleration:" -ForegroundColor Cyan
    Write-Host "  For faster processing, install GPU version:" -ForegroundColor White
    Write-Host "  pip uninstall paddlepaddle" -ForegroundColor White
    Write-Host "  pip install paddlepaddle-gpu" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "=" * 80 -ForegroundColor Red
    Write-Host "✗ Installation Incomplete" -ForegroundColor Red
    Write-Host "=" * 80 -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check the errors above and try:" -ForegroundColor Yellow
    Write-Host "  1. Update pip: python -m pip install --upgrade pip" -ForegroundColor White
    Write-Host "  2. Install manually: pip install -r requirements.txt" -ForegroundColor White
    Write-Host "  3. Check Python version (3.8+ required)" -ForegroundColor White
    Write-Host ""
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
