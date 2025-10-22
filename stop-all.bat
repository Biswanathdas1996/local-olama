@echo off
REM Stop All Services - Ollama Server, Backend & Frontend
REM This script stops all running services

echo ====================================================
echo   Local LLM Platform - Stopping All Services
echo ====================================================
echo.

set PROCESSES_KILLED=0

REM Stop Ollama Server
echo [1/3] Stopping Ollama server...

REM First try to stop by port
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :11434 ^| findstr LISTENING 2^>nul') do (
    echo   Stopping process on port 11434 ^(PID: %%a^)
    taskkill /F /PID %%a >nul 2>&1
    if not errorlevel 1 set /a PROCESSES_KILLED+=1
)

REM Stop all Ollama-related processes
echo   Stopping ollama.exe...
taskkill /F /IM ollama.exe >nul 2>&1
if not errorlevel 1 set /a PROCESSES_KILLED+=1

echo   Stopping "ollama app.exe"...
taskkill /F /FI "IMAGENAME eq ollama app.exe" >nul 2>&1
if not errorlevel 1 set /a PROCESSES_KILLED+=1

echo   Stopping ollama_llama_server.exe...
taskkill /F /IM ollama_llama_server.exe >nul 2>&1
if not errorlevel 1 set /a PROCESSES_KILLED+=1

REM Use wildcard to catch any other ollama processes
taskkill /F /FI "IMAGENAME eq ollama*" >nul 2>&1

echo [OK] Ollama processes stopped

REM Stop Backend (Python processes on port 8000)
echo [2/3] Stopping backend server...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
    if not errorlevel 1 (
        echo [OK] Backend server stopped
        set /a PROCESSES_KILLED+=1
    )
)

REM If no backend found on port, check for general message
netstat -ano | findstr :8000 | findstr LISTENING >nul 2>&1
if errorlevel 1 (
    echo [INFO] Backend server not running
)

REM Stop Frontend (Node processes on common ports: 3000, 5000, 5173, 8080)
echo [3/3] Stopping frontend server...

REM Check and stop port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    echo   Stopping process on port 3000 ^(PID: %%a^)
    taskkill /F /PID %%a >nul 2>&1
    if not errorlevel 1 set /a PROCESSES_KILLED+=1
)

REM Check and stop port 5000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING 2^>nul') do (
    echo   Stopping process on port 5000 ^(PID: %%a^)
    taskkill /F /PID %%a >nul 2>&1
    if not errorlevel 1 set /a PROCESSES_KILLED+=1
)

REM Check and stop port 5173 (Vite default)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING 2^>nul') do (
    echo   Stopping process on port 5173 ^(PID: %%a^)
    taskkill /F /PID %%a >nul 2>&1
    if not errorlevel 1 set /a PROCESSES_KILLED+=1
)

REM Check and stop port 8080
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8080 ^| findstr LISTENING 2^>nul') do (
    echo   Stopping process on port 8080 ^(PID: %%a^)
    taskkill /F /PID %%a >nul 2>&1
    if not errorlevel 1 set /a PROCESSES_KILLED+=1
)

REM Kill all Node.js processes as a fallback
echo   Stopping all node.exe processes...
taskkill /F /IM node.exe >nul 2>&1
if not errorlevel 1 set /a PROCESSES_KILLED+=1

echo [OK] Frontend processes stopped

echo.
if %PROCESSES_KILLED% gtr 0 (
    echo ====================================================
    echo   All services stopped successfully!
    echo   ^(%PROCESSES_KILLED% process^(es^) terminated^)
    echo ====================================================
) else (
    echo ====================================================
    echo   No running services found
    echo ====================================================
)
echo.
pause
