# Windows-Specific Setup Guide

## PowerShell Execution Policy

If you encounter an error running `start.ps1` about execution policy:

```powershell
# Check current policy
Get-ExecutionPolicy

# Set policy for current user (recommended)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or run the script with bypass for this session only
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

## Virtual Environment Activation

### PowerShell (default)
```powershell
.\venv\Scripts\Activate.ps1
```

### Command Prompt (cmd)
```cmd
venv\Scripts\activate.bat
```

### Git Bash
```bash
source venv/Scripts/activate
```

## Installing Ollama on Windows

1. Download from: https://ollama.ai/download/windows
2. Run the installer
3. Ollama will start automatically as a service
4. Verify installation:
   ```powershell
   ollama --version
   ollama list
   ```

## Running the Application

### Quick Start (Automated)
```powershell
.\start.ps1
```

### Manual Start
```powershell
# Activate environment
.\venv\Scripts\Activate.ps1

# Start application
python main.py
```

### Background Mode (keeps terminal free)
```powershell
Start-Process powershell -ArgumentList "-File .\start.ps1" -WindowStyle Hidden
```

## Testing API with PowerShell

### Health Check
```powershell
Invoke-RestMethod http://localhost:8000/health | ConvertTo-Json -Depth 10
```

### List Models
```powershell
Invoke-RestMethod http://localhost:8000/models | ConvertTo-Json -Depth 10
```

### Generate Text
```powershell
$headers = @{
    "Content-Type" = "application/json"
}

$body = @{
    model = "llama3"
    prompt = "What is Python?"
    max_tokens = 200
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:8000/generate `
    -Method Post `
    -Headers $headers `
    -Body $body | ConvertTo-Json -Depth 10
```

## Common Windows Issues

### Port Already in Use
```powershell
# Find process using port 8000
Get-NetTCPConnection -LocalPort 8000

# Kill process (replace PID with actual process ID)
Stop-Process -Id <PID> -Force

# Or change port in .env
PORT=8001
```

### Python Not Found
```powershell
# Add Python to PATH or use full path
C:\Users\<YourUsername>\AppData\Local\Programs\Python\Python313\python.exe main.py
```

### Ollama Service Not Running
```powershell
# Check if Ollama is running
Get-Process -Name ollama -ErrorAction SilentlyContinue

# Start Ollama manually
Start-Process ollama -ArgumentList "serve" -WindowStyle Hidden

# Or use the Ollama desktop app
```

### Virtual Environment Issues
```powershell
# Remove old venv
Remove-Item -Recurse -Force venv

# Create new one
python -m venv venv

# Activate and install
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Opening Browser Automatically

```powershell
# After starting the server, open browser
Start-Process "http://localhost:8000/docs"
```

## Firewall Configuration

If you can't access the API from other devices:

1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Click "Inbound Rules" → "New Rule"
4. Select "Port" → Next
5. TCP, Specific port: 8000 → Next
6. Allow the connection → Next
7. Apply to all profiles → Next
8. Name it "FastAPI LLM Platform" → Finish

## Running as Windows Service

For production deployment, consider using NSSM (Non-Sucking Service Manager):

```powershell
# Download NSSM from https://nssm.cc/download
# Install the service
nssm install LocalLLMPlatform "C:\Path\To\venv\Scripts\python.exe" "C:\Path\To\main.py"

# Configure service
nssm set LocalLLMPlatform AppDirectory "C:\Path\To\Project"
nssm set LocalLLMPlatform AppStdout "C:\Path\To\logs\service.log"
nssm set LocalLLMPlatform AppStderr "C:\Path\To\logs\error.log"

# Start service
nssm start LocalLLMPlatform

# Stop service
nssm stop LocalLLMPlatform

# Remove service
nssm remove LocalLLMPlatform confirm
```

## Performance Tips for Windows

### Increase Virtual Memory
1. Right-click "This PC" → Properties
2. Advanced system settings → Advanced tab
3. Performance → Settings → Advanced tab
4. Virtual memory → Change
5. Set custom size (Initial: 8192 MB, Maximum: 16384 MB)

### Disable Antivirus Scanning for venv
Add exclusion in Windows Defender:
1. Settings → Update & Security → Windows Security
2. Virus & threat protection → Manage settings
3. Add exclusion → Folder → Select `venv` folder

### Use PowerShell 7 (Optional)
Install PowerShell 7 for better performance:
```powershell
winget install Microsoft.PowerShell
```

## Logs and Debugging

### View Logs in Real-Time
```powershell
Get-Content .\logs\app.log -Wait -Tail 50
```

### Enable Debug Mode
Edit `.env`:
```ini
DEBUG=True
LOG_LEVEL=DEBUG
```

Restart application to see detailed logs.

## Useful Aliases

Add to your PowerShell profile (`$PROFILE`):

```powershell
# Quick navigation
function llm { Set-Location "c:\Users\daspa\Desktop\Olama" }

# Quick start
function llm-start { 
    Set-Location "c:\Users\daspa\Desktop\Olama"
    .\start.ps1 
}

# Quick test
function llm-test {
    Invoke-RestMethod http://localhost:8000/health | ConvertTo-Json
}
```

Then use:
```powershell
llm-start
llm-test
```

## Uninstall / Cleanup

```powershell
# Deactivate virtual environment
deactivate

# Remove project
Remove-Item -Recurse -Force "c:\Users\daspa\Desktop\Olama"

# Uninstall Ollama
# Go to Settings → Apps → Ollama → Uninstall
```

---

**For more help, see [README.md](README.md) and [QUICKSTART.md](QUICKSTART.md)**
