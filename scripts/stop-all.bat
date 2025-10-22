@echo off
REM Stop All Services - Ollama Server, Backend & Frontend

echo === Local LLM Platform - Stopping All Services ===
echo.

REM Change to project root (parent directory of scripts folder)
cd /d "%~dp0.."

set PROCESSES_KILLED=0

REM Stop Ollama Server (running on port 11434)
echo [1/3] Stopping Ollama server...

REM Find and kill processes on port 11434
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :11434') do (
    taskkill /F /PID %%a >nul 2>nul
    if %errorlevel% equ 0 (
        set /a PROCESSES_KILLED+=1
    )
)

REM Kill all Ollama-related processes
taskkill /F /IM "ollama.exe" >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Ollama server stopped
    set /a PROCESSES_KILLED+=1
) else (
    echo [INFO] Ollama server not running
)

REM Stop ollama_llama_server if running
taskkill /F /IM "ollama_llama_server.exe" >nul 2>nul

echo.

REM Stop Backend (Python/uvicorn on port 8000)
echo [2/3] Stopping backend server...

set BACKEND_STOPPED=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do (
    taskkill /F /PID %%a >nul 2>nul
    if %errorlevel% equ 0 (
        set BACKEND_STOPPED=1
        set /a PROCESSES_KILLED+=1
    )
)

if %BACKEND_STOPPED% equ 1 (
    echo [OK] Backend server stopped
) else (
    echo [INFO] Backend server not running
)

echo.

REM Stop Frontend (Node/Vite on common ports)
echo [3/3] Stopping frontend server...

set FRONTEND_STOPPED=0

REM Check port 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    taskkill /F /PID %%a >nul 2>nul
    if %errorlevel% equ 0 (
        set FRONTEND_STOPPED=1
        set /a PROCESSES_KILLED+=1
    )
)

REM Check port 5173 (Vite default)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    taskkill /F /PID %%a >nul 2>nul
    if %errorlevel% equ 0 (
        set FRONTEND_STOPPED=1
        set /a PROCESSES_KILLED+=1
    )
)

REM Check port 5000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000') do (
    taskkill /F /PID %%a >nul 2>nul
    if %errorlevel% equ 0 (
        set FRONTEND_STOPPED=1
        set /a PROCESSES_KILLED+=1
    )
)

if %FRONTEND_STOPPED% equ 1 (
    echo [OK] Frontend server stopped
) else (
    echo [INFO] Frontend server not running
)

echo.

if %PROCESSES_KILLED% gtr 0 (
    echo [OK] All services stopped successfully! (%PROCESSES_KILLED% process(es) terminated^)
) else (
    echo [INFO] No running services found
)

echo.
pause
