# 🚀 Installation Instructions

## Complete Setup Guide for Local LLM Platform

Follow these steps to get your full-stack LLM platform up and running!

---

## Prerequisites

### Required Software

1. **Python 3.11+**
   - Download from https://www.python.org/downloads/
   - Make sure to check "Add Python to PATH" during installation

2. **Node.js 18+**
   - Download from https://nodejs.org/
   - LTS version recommended
   - npm comes bundled with Node.js

3. **Ollama**
   - Download from https://ollama.ai/
   - Install and ensure it's running
   - Test with: `ollama --version`

### Verify Prerequisites

```powershell
# Check Python
python --version
# Should show: Python 3.11.x or higher

# Check Node.js
node --version
# Should show: v18.x.x or higher

# Check npm
npm --version
# Should show: 9.x.x or higher

# Check Ollama
ollama --version
# Should show ollama version
```

---

## Installation Steps

### Step 1: Backend Setup (Already Done ✅)

Your backend should already be set up. If not:

```powershell
# Create virtual environment
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install Python dependencies
pip install -r requirements.txt
```

### Step 2: Frontend Setup (Do This Now! 🎯)

Open PowerShell in your project directory and run:

```powershell
# Install all frontend dependencies
.\setup-frontend.ps1
```

This will:
- ✅ Check for Node.js and npm
- ✅ Navigate to frontend directory
- ✅ Install all npm packages (~2-5 minutes)
- ✅ Set up the React development environment

**Expected Output:**
```
=== Local LLM Platform - Frontend Setup ===

Checking for Node.js...
✓ Node.js found: v18.x.x
Checking for npm...
✓ npm found: v9.x.x

Installing frontend dependencies...
This may take a few minutes...

[... npm install output ...]

✓ Frontend setup complete!
```

---

## Starting the Application

### Option 1: Start Everything at Once (Recommended 🌟)

```powershell
.\start-fullstack.ps1
```

This will:
- ✅ Start the backend API server (Port 8000)
- ✅ Start the frontend dev server (Port 3000)
- ✅ Open two PowerShell windows (one for each server)

**What you'll see:**
- Backend window showing FastAPI startup
- Frontend window showing Vite dev server
- Both servers running simultaneously

### Option 2: Start Servers Individually

**Start Backend:**
```powershell
# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Start backend
python main.py
```

**Start Frontend (in another window):**
```powershell
# Option A: Use script
.\start-frontend.ps1

# Option B: Manual
cd frontend
npm run dev
```

---

## First-Time Usage

### 1. Ensure Ollama is Running

```powershell
# Start Ollama (if not already running)
ollama serve
```

Keep this running in the background.

### 2. Access the Frontend

Open your browser and navigate to:
```
http://localhost:3000
```

You should see:
- ✅ Header with "Local LLM Platform"
- ✅ "Ollama Connected" status (green)
- ✅ Two tabs: Chat and Models

### 3. Download Your First Model

1. Click the **Models** tab
2. In the download field, enter: `llama3`
3. Click **Download**
4. Wait for download to complete (5-10 minutes depending on speed)

**Alternative models to try:**
- `mistral` - Fast and capable
- `phi3` - Smaller, faster
- `gemma` - Google's model
- `codellama` - For coding

### 4. Start Chatting

1. Click the **Chat** tab
2. Select your model from the dropdown
3. Type a message: "Hello! Can you introduce yourself?"
4. Press Enter or click Send
5. Watch the response appear!

---

## Troubleshooting

### Issue: "Ollama Disconnected"

**Symptoms:** Red warning in header showing "Ollama Disconnected"

**Solutions:**
1. Start Ollama:
   ```powershell
   ollama serve
   ```
2. Verify Ollama is running:
   ```powershell
   curl http://localhost:11434
   ```
3. Restart the backend server

### Issue: Frontend won't start

**Symptoms:** Errors when running start scripts

**Solutions:**
1. Make sure you ran setup first:
   ```powershell
   .\setup-frontend.ps1
   ```
2. Check Node.js is installed:
   ```powershell
   node --version
   ```
3. Try manual installation:
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

### Issue: "Cannot find module" errors

**Symptoms:** Import errors in terminal

**Solutions:**
1. Re-run frontend setup:
   ```powershell
   cd frontend
   rm -r node_modules
   npm install
   ```
2. Check package.json exists in frontend folder

### Issue: Port already in use

**Symptoms:** "Port 3000 is already in use" or "Port 8000 is already in use"

**Solutions:**
1. Close other applications using those ports
2. Or modify ports:
   - Backend: Edit `utils/config.py`
   - Frontend: Edit `frontend/vite.config.ts`

### Issue: Model download fails

**Symptoms:** Download button doesn't work or shows error

**Solutions:**
1. Check internet connection (needed for downloads)
2. Verify Ollama is running
3. Check available disk space
4. Try a different model name

---

## Verification Checklist

Use this checklist to verify everything is working:

- [ ] Python 3.11+ installed
- [ ] Node.js 18+ installed
- [ ] Ollama installed and running
- [ ] Backend dependencies installed
- [ ] Frontend dependencies installed (`.\setup-frontend.ps1`)
- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Can access http://localhost:3000
- [ ] Can access http://localhost:8000/docs
- [ ] "Ollama Connected" shows in header
- [ ] Can see Models tab
- [ ] Can download a model
- [ ] Downloaded model appears in list
- [ ] Can select model in Chat tab
- [ ] Can send a message
- [ ] Receive a response from model

---

## Useful URLs

| URL | Description |
|-----|-------------|
| http://localhost:3000 | **Frontend** - Main UI |
| http://localhost:8000 | **Backend** - API |
| http://localhost:8000/docs | **Swagger Docs** - Interactive API docs |
| http://localhost:8000/redoc | **ReDoc** - Alternative API docs |
| http://localhost:11434 | **Ollama** - LLM service |

---

## Daily Usage

After initial setup, starting the platform is simple:

```powershell
# 1. Start Ollama (if not running)
ollama serve

# 2. Start both servers
.\start-fullstack.ps1

# 3. Open browser
# http://localhost:3000

# That's it! 🎉
```

---

## Stopping the Application

### Stop Frontend
- Press `Ctrl+C` in the frontend terminal
- Or close the PowerShell window

### Stop Backend
- Press `Ctrl+C` in the backend terminal
- Or close the PowerShell window

### Stop Ollama
- `Ctrl+C` if running in terminal
- Or kill the process from Task Manager

---

## File Structure

After installation, your project should look like this:

```
Olama/
├── frontend/                    # React frontend
│   ├── node_modules/           # npm packages (created during setup)
│   ├── src/                    # Source code
│   │   ├── components/         # UI components
│   │   ├── hooks/              # Custom hooks
│   │   ├── services/           # API client
│   │   └── types/              # TypeScript types
│   ├── package.json            # Frontend dependencies
│   └── ...                     # Config files
├── routes/                     # FastAPI routes
├── services/                   # Business logic
├── schemas/                    # Pydantic schemas
├── .venv/                      # Python virtual environment
├── main.py                     # Backend entry point
├── requirements.txt            # Python dependencies
├── setup-frontend.ps1          # Frontend installer
├── start-frontend.ps1          # Start frontend
├── start-fullstack.ps1         # Start both servers
└── README.md                   # Main documentation
```

---

## Next Steps

Once everything is running:

1. **Explore the UI** - Check out both Chat and Models tabs
2. **Try different models** - Each has unique characteristics
3. **Adjust settings** - Click the gear icon in Chat to tune parameters
4. **Test prompts** - Try various types of questions and tasks
5. **Read the docs** - Check FULLSTACK_GUIDE.md for advanced features

---

## Getting Help

If you encounter issues:

1. **Check this guide** - Review troubleshooting section
2. **Check backend logs** - Look for errors in backend terminal
3. **Check browser console** - F12 in browser, look for errors
4. **Verify services** - All URLs should be accessible
5. **Read documentation** - Check FULLSTACK_GUIDE.md

---

## Success! 🎉

If you can:
- ✅ See the frontend at http://localhost:3000
- ✅ See "Ollama Connected" status
- ✅ Download and use a model
- ✅ Have a conversation

**Congratulations! Your Local LLM Platform is fully operational!**

Enjoy having powerful AI running completely offline on your own machine! 🚀

---

*For more detailed information, see:*
- `FULLSTACK_GUIDE.md` - Complete guide
- `QUICKSTART_FRONTEND.md` - Quick start
- `frontend/FEATURES.md` - Feature documentation
