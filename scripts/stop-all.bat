@echo off
REM Stop All Services - Ollama Server, Backend, Frontend & Metabase

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
    set /a PROCESSES_KILLED+=1
)

taskkill /F /IM "ollama app.exe" >nul 2>nul
if %errorlevel% equ 0 (
    set /a PROCESSES_KILLED+=1
)

REM Stop ollama_llama_server if running
taskkill /F /IM "ollama_llama_server.exe" >nul 2>nul
if %errorlevel% equ 0 (
    set /a PROCESSES_KILLED+=1
)

REM Check if any Ollama process was killed
if %PROCESSES_KILLED% gtr 0 (
    echo [OK] Ollama server stopped
) else (
    echo [INFO] Ollama server not running
)

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
echo [3/4] Stopping frontend server...

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

REM Stop Metabase (Java on port 3001)
echo [4/4] Stopping Metabase server...

set METABASE_STOPPED=0

REM Check port 3001
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do (
    taskkill /F /PID %%a >nul 2>nul
    if %errorlevel% equ 0 (
        set METABASE_STOPPED=1
        set /a PROCESSES_KILLED+=1
    )
)

REM Also kill java processes running metabase.jar
for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq java.exe" /FO LIST ^| findstr "PID:"') do (
    REM Get command line to check if it's running metabase.jar
    wmic process where "ProcessId=%%a" get CommandLine 2>nul | findstr /i "metabase.jar" >nul
    if %errorlevel% equ 0 (
        taskkill /F /PID %%a >nul 2>nul
        if %errorlevel% equ 0 (
            set METABASE_STOPPED=1
            set /a PROCESSES_KILLED+=1
        )
    )
)

if %METABASE_STOPPED% equ 1 (
    echo [OK] Metabase server stopped
) else (
    echo [INFO] Metabase server not running
)

echo.

if %PROCESSES_KILLED% gtr 0 (
    echo [OK] All services stopped successfully! (%PROCESSES_KILLED% process(es) terminated^)
) else (
    echo [INFO] No running services found
)

echo.
pause
