@echo off
REM Check Status of All Services - Ollama Server, Backend, Frontend & Metabase

echo ========================================================
echo   Local LLM Platform - Services Status Check
echo ========================================================
echo.

REM Change to project root (parent directory of scripts folder)
cd /d "%~dp0.."

set SERVICES_RUNNING=0
set SERVICES_TOTAL=4

REM ============================================================
REM 1. Check Ollama Server (Port 11434)
REM ============================================================
echo [1/4] Ollama Server (Port 11434)
echo ----------------------------------------

REM Check if port 11434 is listening
netstat -ano | findstr :11434 | findstr LISTENING >nul 2>nul
if %errorlevel% equ 0 (
    echo Status: RUNNING
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :11434 ^| findstr LISTENING') do (
        for /f "tokens=1" %%p in ('tasklist /FI "PID eq %%a" /FO TABLE /NH') do (
            echo Process: %%p ^(PID: %%a^)
            goto :ollama_found
        )
    )
    :ollama_found
    echo URL: http://localhost:11434
    
    REM Try to get Ollama version
    curl -s http://localhost:11434/api/tags >nul 2>nul
    if %errorlevel% equ 0 (
        echo Health: OK
    ) else (
        echo Health: Port open but service not responding
    )
    set /a SERVICES_RUNNING+=1
) else (
    echo Status: NOT RUNNING
    echo URL: http://localhost:11434 ^(Not accessible^)
)
echo.

REM ============================================================
REM 2. Check Backend Server (Port 8000)
REM ============================================================
echo [2/4] Backend API Server (Port 8000)
echo ----------------------------------------

REM Check if port 8000 is listening
netstat -ano | findstr :8000 | findstr LISTENING >nul 2>nul
if %errorlevel% equ 0 (
    echo Status: RUNNING
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
        for /f "tokens=1" %%p in ('tasklist /FI "PID eq %%a" /FO TABLE /NH') do (
            echo Process: %%p ^(PID: %%a^)
            goto :backend_found
        )
    )
    :backend_found
    echo URL: http://localhost:8000
    echo API Docs: http://localhost:8000/docs
    
    REM Try to ping backend health endpoint
    curl -s http://localhost:8000/docs >nul 2>nul
    if %errorlevel% equ 0 (
        echo Health: OK
    ) else (
        echo Health: Port open but service not responding
    )
    set /a SERVICES_RUNNING+=1
) else (
    echo Status: NOT RUNNING
    echo URL: http://localhost:8000 ^(Not accessible^)
)
echo.

REM ============================================================
REM 3. Check Frontend Server (Port 3000/5000/5173)
REM ============================================================
echo [3/4] Frontend UI Server (Port 3000/5000/5173)
echo ----------------------------------------

set FRONTEND_RUNNING=0

REM Check port 3000
netstat -ano | findstr :3000 | findstr LISTENING >nul 2>nul
if %errorlevel% equ 0 (
    echo Status: RUNNING on Port 3000
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
        for /f "tokens=1" %%p in ('tasklist /FI "PID eq %%a" /FO TABLE /NH') do (
            echo Process: %%p ^(PID: %%a^)
            goto :frontend_found
        )
    )
    :frontend_found
    echo URL: http://localhost:3000
    set FRONTEND_RUNNING=1
    set /a SERVICES_RUNNING+=1
    goto :frontend_done
)

REM Check port 5000
netstat -ano | findstr :5000 | findstr LISTENING >nul 2>nul
if %errorlevel% equ 0 (
    echo Status: RUNNING on Port 5000
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
        for /f "tokens=1" %%p in ('tasklist /FI "PID eq %%a" /FO TABLE /NH') do (
            echo Process: %%p ^(PID: %%a^)
            goto :frontend_5000_found
        )
    )
    :frontend_5000_found
    echo URL: http://localhost:5000
    set FRONTEND_RUNNING=1
    set /a SERVICES_RUNNING+=1
    goto :frontend_done
)

REM Check port 5173 (Vite default)
netstat -ano | findstr :5173 | findstr LISTENING >nul 2>nul
if %errorlevel% equ 0 (
    echo Status: RUNNING on Port 5173
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
        for /f "tokens=1" %%p in ('tasklist /FI "PID eq %%a" /FO TABLE /NH') do (
            echo Process: %%p ^(PID: %%a^)
            goto :frontend_vite_found
        )
    )
    :frontend_vite_found
    echo URL: http://localhost:5173
    set FRONTEND_RUNNING=1
    set /a SERVICES_RUNNING+=1
    goto :frontend_done
)

if %FRONTEND_RUNNING% equ 0 (
    echo Status: NOT RUNNING
    echo URL: http://localhost:3000/5000/5173 ^(Not accessible^)
)

:frontend_done
echo.

REM ============================================================
REM 4. Check Metabase Server (Port 3001)
REM ============================================================
echo [4/4] Metabase Analytics (Port 3001)
echo ----------------------------------------

REM Check if Metabase JAR exists
if not exist "metabase\metabase.jar" (
    echo Status: NOT INSTALLED
    echo Info: metabase\metabase.jar not found
    echo Install: Run scripts\setup.bat to install Metabase
    set /a SERVICES_TOTAL-=1
) else (
    REM Check if port 3001 is listening
    netstat -ano | findstr :3001 | findstr LISTENING >nul 2>nul
    if %errorlevel% equ 0 (
        echo Status: RUNNING
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
            for /f "tokens=1" %%p in ('tasklist /FI "PID eq %%a" /FO TABLE /NH') do (
                echo Process: %%p ^(PID: %%a^)
                goto :metabase_found
            )
        )
        :metabase_found
        echo URL: http://localhost:3001
        
        REM Try to check Metabase health
        curl -s http://localhost:3001/api/health >nul 2>nul
        if %errorlevel% equ 0 (
            echo Health: OK
        ) else (
            echo Health: Starting up or not responding
        )
        set /a SERVICES_RUNNING+=1
    ) else (
        echo Status: NOT RUNNING
        echo URL: http://localhost:3001 ^(Not accessible^)
    )
)
echo.

REM ============================================================
REM Summary
REM ============================================================
echo ========================================================
echo   Summary
echo ========================================================
echo.
echo Services Running: %SERVICES_RUNNING%/%SERVICES_TOTAL%
echo.

if %SERVICES_RUNNING% equ %SERVICES_TOTAL% (
    echo [OK] All services are running!
    echo.
    echo Quick Links:
    echo   * Ollama Server:  http://localhost:11434
    echo   * Backend API:    http://localhost:8000
    echo   * API Docs:       http://localhost:8000/docs
    if %FRONTEND_RUNNING% equ 1 (
        netstat -ano | findstr :3000 | findstr LISTENING >nul 2>nul
        if %errorlevel% equ 0 (
            echo   * Frontend UI:    http://localhost:3000
        ) else (
            netstat -ano | findstr :5000 | findstr LISTENING >nul 2>nul
            if %errorlevel% equ 0 (
                echo   * Frontend UI:    http://localhost:5000
            ) else (
                echo   * Frontend UI:    http://localhost:5173
            )
        )
    )
    if exist "metabase\metabase.jar" (
        netstat -ano | findstr :3001 | findstr LISTENING >nul 2>nul
        if %errorlevel% equ 0 (
            echo   * Metabase:       http://localhost:3001
        )
    )
) else if %SERVICES_RUNNING% equ 0 (
    echo [WARNING] No services are running!
    echo.
    echo To start all services, run: scripts\start-all.bat
) else (
    echo [WARNING] Some services are not running!
    echo.
    echo Missing services need to be started
    echo To start all services, run: scripts\start-all.bat
)
echo.
echo ========================================================
echo.

REM ============================================================
REM Additional System Info
REM ============================================================
echo System Information:
echo ----------------------------------------

REM Check if virtual environment exists
if exist ".venv\" (
    echo Python venv: INSTALLED
) else (
    echo Python venv: NOT FOUND ^(Run scripts\setup.bat^)
)

REM Check if frontend dependencies exist
if exist "frontend\node_modules\" (
    echo Frontend deps: INSTALLED
) else (
    echo Frontend deps: NOT FOUND ^(Run scripts\setup.bat^)
)

REM Check Ollama installation
where ollama >nul 2>nul
if %errorlevel% equ 0 (
    echo Ollama: INSTALLED
    echo.
    echo Installed Models:
    echo ----------------------------------------
    ollama list 2>nul
) else (
    echo Ollama: NOT FOUND ^(Visit https://ollama.ai/^)
)

echo.
echo ========================================================
echo.
pause
