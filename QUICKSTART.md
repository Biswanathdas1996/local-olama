# Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Install Dependencies

```powershell
# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install packages
pip install -r requirements.txt
```

### Step 2: Start Ollama

Make sure Ollama is running:

```powershell
ollama serve
```

Or just start the Ollama desktop app.

### Step 3: Run the Platform

**Option A - Using the startup script (recommended):**
```powershell
.\start.ps1
```

**Option B - Manual start:**
```powershell
python main.py
```

### Step 4: Access the API

Open your browser to:
- **Swagger UI**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

---

## 📝 First Request

### Download a model (if you haven't already):

**Via CLI:**
```powershell
ollama pull llama3
```

**Or via API:**
```powershell
$body = @{ model_name = "llama3" } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:8000/models/download -Method Post -Body $body -ContentType "application/json"
```

### Generate your first text:

```powershell
$body = @{
    model = "llama3"
    prompt = "What is FastAPI?"
    max_tokens = 200
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:8000/generate -Method Post -Body $body -ContentType "application/json"
```

---

## 🎯 Common Commands

### List available models
```powershell
Invoke-RestMethod -Uri http://localhost:8000/models
```

### Check health
```powershell
Invoke-RestMethod -Uri http://localhost:8000/health
```

### Stop the server
Press `Ctrl+C` in the terminal

---

## 📚 More Information

See the full [README.md](README.md) for:
- Complete API documentation
- Configuration options
- Troubleshooting
- Advanced usage examples
