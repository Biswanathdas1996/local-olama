# Stop All Services - Ollama Server, Backend & Frontend
# This script stops all running services

Write-Host "=== Local LLM Platform - Stopping All Services ===" -ForegroundColor Cyan
Write-Host ""

$processesKilled = 0

# Stop Ollama Server (running on port 11434)
Write-Host "[1/3] Stopping Ollama server..." -ForegroundColor Yellow

$ollamaStopped = $false

# Try to find Ollama processes by port first
$ollamaPort = Get-NetTCPConnection -LocalPort 11434 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($ollamaPort) {
    $ollamaPort | ForEach-Object {
        Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
        $processesKilled++
        $ollamaStopped = $true
    }
}

# Stop all Ollama-related processes by name (ollama, ollama app, ollama_llama_server, etc.)
$ollamaProcesses = Get-Process | Where-Object { $_.ProcessName -like "*ollama*" } -ErrorAction SilentlyContinue
if ($ollamaProcesses) {
    $ollamaProcesses | ForEach-Object {
        Write-Host "  Stopping: $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Gray
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        $processesKilled++
        $ollamaStopped = $true
    }
}

if ($ollamaStopped) {
    Write-Host "✓ Ollama server stopped" -ForegroundColor Green
} else {
    Write-Host "○ Ollama server not running" -ForegroundColor Gray
}

# Stop Backend (Python/uvicorn on port 8000)
Write-Host "[2/3] Stopping backend server..." -ForegroundColor Yellow
$backendProcesses = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($backendProcesses) {
    $backendProcesses | ForEach-Object {
        Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
        $processesKilled++
    }
    Write-Host "✓ Backend server stopped" -ForegroundColor Green
} else {
    Write-Host "○ Backend server not running" -ForegroundColor Gray
}

# Stop Frontend (Node/Vite on port 3000, 5000, 5173, or other ports)
Write-Host "[3/3] Stopping frontend server..." -ForegroundColor Yellow

$frontendStopped = $false

# Check common frontend ports: 3000, 5000, 5173, 8080
$frontendPorts = @(3000, 5000, 5173, 8080)
foreach ($port in $frontendPorts) {
    $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($processes) {
        $processes | ForEach-Object {
            $proc = Get-Process -Id $_ -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "  Stopping: $($proc.ProcessName) on port $port (PID: $_)" -ForegroundColor Gray
                Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
                $processesKilled++
                $frontendStopped = $true
            }
        }
    }
}

# Also kill any remaining Node processes that might be related to frontend
$nodeProcesses = Get-Process | Where-Object { $_.ProcessName -like "*node*" } -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | ForEach-Object {
        # Check if this node process has any connections (likely a server)
        $connections = Get-NetTCPConnection -OwningProcess $_.Id -ErrorAction SilentlyContinue
        if ($connections) {
            Write-Host "  Stopping: $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Gray
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
            $processesKilled++
            $frontendStopped = $true
        }
    }
}

if ($frontendStopped) {
    Write-Host "✓ Frontend server stopped" -ForegroundColor Green
} else {
    Write-Host "○ Frontend server not running" -ForegroundColor Gray
}

# Additional cleanup - stop any Node processes that might be related
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "Cleaning up Node processes..." -ForegroundColor Yellow
    $nodeProcesses | ForEach-Object {
        # Only kill if it's listening on port 3000 or related to Vite
        $connections = Get-NetTCPConnection -OwningProcess $_.Id -ErrorAction SilentlyContinue
        if ($connections | Where-Object { $_.LocalPort -eq 3000 -or $_.LocalPort -eq 5173 }) {
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
            $processesKilled++
        }
    }
}

# Additional cleanup - stop any Python processes on port 8000
$pythonProcesses = Get-Process -Name "python", "pythonw" -ErrorAction SilentlyContinue
if ($pythonProcesses) {
    $pythonProcesses | ForEach-Object {
        $connections = Get-NetTCPConnection -OwningProcess $_.Id -ErrorAction SilentlyContinue
        if ($connections | Where-Object { $_.LocalPort -eq 8000 }) {
            Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
            $processesKilled++
        }
    }
}

Write-Host ""
if ($processesKilled -gt 0) {
    Write-Host "✓ All services stopped successfully! ($processesKilled process(es) terminated)" -ForegroundColor Green
} else {
    Write-Host "○ No running services found" -ForegroundColor Gray
}
Write-Host ""
