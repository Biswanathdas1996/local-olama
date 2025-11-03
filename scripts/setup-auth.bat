@echo off
REM Authentication System Setup Script for Windows

echo ========================================
echo Authentication System Setup
echo ========================================
echo.

echo Step 1: Installing dependencies...
pip install python-jose[cryptography]==3.3.0 passlib[bcrypt]==1.7.4 bcrypt==4.1.2 sqlalchemy==2.0.23 alembic==1.13.0
if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)
echo Done!
echo.

echo Step 2: Initializing database...
python scripts\init_auth.py
if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to initialize database
    pause
    exit /b 1
)
echo Done!
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Default admin credentials:
echo   Username: admin
echo   Password: admin123
echo.
echo IMPORTANT: Change the admin password after first login!
echo.
echo You can now start the application with:
echo   python main.py
echo.
echo Then login at: http://localhost:8000/login
echo.
pause
