# Local LLM Platform - Complete Guide

## Overview

A modern full-stack platform for running local Large Language Models (LLMs) using Ollama. Features a FastAPI backend and a React frontend with a beautiful, responsive UI.

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  React Frontend │ ────▶│  FastAPI Backend│ ────▶│     Ollama      │
│   (Port 3000)   │      │   (Port 8000)   │      │   (Port 11434)  │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

## Prerequisites

### Backend
- Python 3.11+
- Ollama installed and running
- Virtual environment (recommended)

### Frontend
- Node.js 18+
- npm or yarn

## Quick Start

### 1. Setup Backend

```powershell
# Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Start backend
python main.py
```

Backend will be available at: http://localhost:8000
API Documentation: http://localhost:8000/docs

### 2. Setup Frontend

```powershell
# Install frontend dependencies
.\setup-frontend.ps1

# Start frontend
.\start-frontend.ps1
```

Frontend will be available at: http://localhost:3000

### 3. Start Everything (Full Stack)

```powershell
# Start both backend and frontend in separate windows
.\start-fullstack.ps1
```

## Frontend Features

### 🎨 Modern UI
- Clean, responsive design with Tailwind CSS
- Dark/light theme support
- Smooth animations and transitions

### 💬 Chat Interface
- Real-time conversation with LLMs
- Markdown rendering with syntax highlighting
- Multi-turn conversations with context preservation
- Performance statistics display

### 🔧 Model Management
- Download models from Ollama library
- View installed models with size info
- Delete models to free up space
- Real-time model status updates

### ⚙️ Advanced Settings
- Customizable generation parameters:
  - Max tokens (1-100,000)
  - Temperature (0.0-2.0)
  - Top P (0.0-1.0)
  - Top K (1-100)
  - Repeat penalty (0.0-2.0)

### 📊 Performance Metrics
- Response time tracking
- Token count statistics
- Model load duration

## API Endpoints

### Health
- `GET /health` - Check API and Ollama status

### Models
- `GET /models` - List all available models
- `POST /models/download` - Download a new model
- `DELETE /models/{model_name}` - Delete a model

### Generation
- `POST /generate` - Generate text with a model

## Project Structure

```
Olama/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API service layer
│   │   ├── types/           # TypeScript types
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # Entry point
│   ├── public/              # Static assets
│   └── package.json         # Frontend dependencies
├── routes/                  # FastAPI routes
├── schemas/                 # Pydantic schemas
├── services/                # Business logic
├── utils/                   # Utilities
├── main.py                  # Backend entry point
├── requirements.txt         # Python dependencies
├── setup-frontend.ps1       # Frontend setup script
├── start-frontend.ps1       # Start frontend
├── start-fullstack.ps1      # Start both servers
└── README.md               # This file
```

## Configuration

### Backend Configuration
Edit `utils/config.py` to configure:
- Ollama URL (default: http://localhost:11434)
- API host and port
- Logging settings
- Debug mode

### Frontend Configuration
Edit `frontend/vite.config.ts` to configure:
- Proxy settings
- Development server port
- Build options

## Popular Models

Download these models to get started:

- `llama3` - Meta's Llama 3 (8B)
- `mistral` - Mistral 7B
- `codellama` - Code generation
- `phi3` - Microsoft Phi-3
- `gemma` - Google Gemma

Example:
```bash
# In the frontend UI, go to Models tab and enter:
llama3
```

## Usage Examples

### Chat with a Model
1. Download a model in the Models tab
2. Switch to Chat tab
3. Select the model from dropdown
4. Type your prompt and press Enter

### Adjust Generation Settings
1. Click the settings icon in Chat interface
2. Adjust parameters:
   - Higher temperature = more creative
   - Lower temperature = more focused
   - Increase max tokens for longer responses

### Multi-turn Conversations
The context is automatically preserved between messages in the same session. Click "Clear Chat" to start fresh.

## Troubleshooting

### Backend Issues

**Ollama not connected**
- Ensure Ollama is running: `ollama serve`
- Check if Ollama is accessible at http://localhost:11434

**Model not found**
- Download the model first using the Models tab
- Verify model name matches exactly

### Frontend Issues

**Cannot connect to API**
- Ensure backend is running on port 8000
- Check browser console for CORS errors
- Verify proxy configuration in vite.config.ts

**Models not loading**
- Check backend logs for errors
- Verify Ollama is running
- Refresh the page

## Development

### Frontend Development

```powershell
cd frontend

# Install dependencies
npm install

# Run development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Backend Development

```powershell
# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Run with auto-reload
python main.py

# Or use uvicorn directly
uvicorn main:app --reload --port 8000
```

## Technologies Used

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Axios** - HTTP client
- **React Markdown** - Markdown rendering
- **React Syntax Highlighter** - Code syntax highlighting
- **React Icons** - Icon library

### Backend
- **FastAPI** - Modern Python web framework
- **Pydantic** - Data validation
- **httpx** - Async HTTP client
- **Uvicorn** - ASGI server

## Performance

- Non-blocking async operations
- Concurrent request handling
- Efficient context management
- Optimized frontend rendering
- Code splitting and lazy loading

## Security Notes

- CORS is configured to allow all origins in development
- Update CORS settings for production
- No authentication implemented (add as needed)
- Runs completely offline after setup

## License

This project is provided as-is for local LLM experimentation.

## Support

For issues or questions:
1. Check backend logs for API errors
2. Check browser console for frontend errors
3. Verify Ollama is running and accessible
4. Ensure all dependencies are installed

## Roadmap

- [ ] Streaming responses
- [ ] Multiple concurrent chats
- [ ] Chat history persistence
- [ ] Export conversations
- [ ] Advanced model configuration
- [ ] Model comparison mode
- [ ] Dark mode toggle
- [ ] Custom system prompts
- [ ] File upload support
