# Authentication System Setup Script for PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Authentication System Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Installing dependencies..." -ForegroundColor Yellow
pip install python-jose[cryptography]==3.3.0 passlib[bcrypt]==1.7.4 bcrypt==4.1.2 sqlalchemy==2.0.23 alembic==1.13.0

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to install dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "Done!" -ForegroundColor Green
Write-Host ""

Write-Host "Step 2: Initializing database..." -ForegroundColor Yellow
python scripts\init_auth.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to initialize database" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "Done!" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Default admin credentials:" -ForegroundColor Yellow
Write-Host "  Username: admin"
Write-Host "  Password: admin123"
Write-Host ""
Write-Host "IMPORTANT: Change the admin password after first login!" -ForegroundColor Red
Write-Host ""
Write-Host "You can now start the application with:"
Write-Host "  python main.py"
Write-Host ""
Write-Host "Then login at: http://localhost:8000/login"
Write-Host ""
Read-Host "Press Enter to exit"
