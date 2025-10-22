# 🚀 Quick Start Guide - Local LLM Platform

## Complete Setup in 5 Minutes

### Step 1: Install Frontend Dependencies

Open PowerShell in the project directory and run:

```powershell
.\setup-frontend.ps1
```

This will:
- Check for Node.js and npm
- Install all frontend dependencies
- Set up the React development environment

### Step 2: Start the Full Stack

```powershell
.\start-fullstack.ps1
```

This will start both:
- **Backend API** on http://localhost:8000
- **Frontend UI** on http://localhost:3000

Two PowerShell windows will open - one for each server.

### Step 3: Download Your First Model

1. Open http://localhost:3000 in your browser
2. Go to the **Models** tab
3. Enter a model name (e.g., `llama3` or `mistral`)
4. Click **Download**
5. Wait for the download to complete

### Step 4: Start Chatting!

1. Switch to the **Chat** tab
2. Select your downloaded model from the dropdown
3. Type a message and press Enter
4. Enjoy your fully offline LLM!

## What You Get

### 🎨 Beautiful Modern UI
- Clean, responsive design
- Real-time chat interface
- Markdown & code syntax highlighting
- Performance statistics

### 🔧 Easy Model Management
- Download models with one click
- View all installed models
- Delete models to save space
- See model sizes and info

### ⚙️ Advanced Controls
- Adjustable temperature
- Customizable max tokens
- Fine-tune creativity vs accuracy
- Multi-turn conversations

### 📊 Performance Insights
- Response time tracking
- Token usage statistics
- Model load metrics

## URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Main web interface |
| Backend API | http://localhost:8000 | REST API |
| API Docs | http://localhost:8000/docs | Interactive API documentation |
| ReDoc | http://localhost:8000/redoc | Alternative API docs |

## Popular Models to Try

| Model | Size | Best For |
|-------|------|----------|
| `llama3` | ~4.7GB | General chat, helpful assistant |
| `mistral` | ~4.1GB | Fast, high quality responses |
| `phi3` | ~2.3GB | Smaller, faster model |
| `codellama` | ~3.8GB | Programming & code generation |
| `gemma` | ~5.2GB | Google's capable model |

## Troubleshooting

### "Ollama Disconnected" warning
**Solution:** Make sure Ollama is running:
```powershell
ollama serve
```

### Frontend won't start
**Solution:** Run setup first:
```powershell
.\setup-frontend.ps1
```

### Can't download models
**Solution:** 
1. Check Ollama is running
2. Verify internet connection (only needed for download)
3. Check available disk space

### Backend errors
**Solution:**
1. Activate virtual environment: `.\.venv\Scripts\Activate.ps1`
2. Install dependencies: `pip install -r requirements.txt`
3. Start backend: `python main.py`

## Tips & Tricks

### 💡 Keyboard Shortcuts
- **Enter** - Send message
- **Shift+Enter** - New line in message
- **Clear Chat** - Start fresh conversation

### 🎯 Temperature Guide
- **0.1-0.3** - Very focused, deterministic
- **0.7** - Balanced (default)
- **1.0-1.5** - Creative, varied
- **1.5+** - Very creative, experimental

### 🔄 Conversation Context
The app automatically maintains context between messages. Each response builds on previous messages in the chat.

### 💾 Save Space
Models can be large! Use the **Models** tab to delete models you don't need.

## Next Steps

1. **Experiment with different models** - Each has unique strengths
2. **Adjust settings** - Find your perfect generation parameters
3. **Try different prompts** - Test various use cases
4. **Compare models** - See which works best for your needs

## Need Help?

Check the full documentation: `FULLSTACK_GUIDE.md`

---

**Enjoy your fully offline, privacy-focused LLM platform! 🎉**
