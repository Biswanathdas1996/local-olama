@echo off
REM Fix Docling Model Cache Issues
REM This script runs the PowerShell cache repair tool

echo.
echo ===============================================
echo    Docling Cache Repair Tool
echo ===============================================
echo.

REM Check if PowerShell is available
where powershell >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: PowerShell not found!
    echo Please ensure PowerShell is installed on your system.
    pause
    exit /b 1
)

REM Get the directory where this batch file is located
set SCRIPT_DIR=%~dp0

REM Run the PowerShell script
echo Running PowerShell script...
echo.
powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%fix_docling_cache.ps1"

REM Check result
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===============================================
    echo    Script completed successfully!
    echo ===============================================
) else (
    echo.
    echo ===============================================
    echo    Script encountered errors.
    echo ===============================================
)

echo.
pause
