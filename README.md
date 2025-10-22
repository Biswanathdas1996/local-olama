# 🧠 Local LLM Platform with Ollama

A production-ready, backend-only FastAPI platform for running Large Language Models (LLMs) completely offline using Ollama. Built for high performance, large context handling, and ease of use.

## ✨ Features

- **🔒 Fully Offline**: Works completely without internet access after initial setup
- **🚀 Multiple Models**: Manage and run multiple local LLM models concurrently
- **📊 Large Context Support**: Handle prompts up to 10MB (configurable)
- **⚡ Async & Concurrent**: Efficient async processing for multiple simultaneous requests
- **📝 REST API Only**: Non-streaming responses with comprehensive Swagger documentation
- **🛡️ Production Ready**: Structured logging, error handling, and request validation
- **🎯 Simple Integration**: Clean REST API with detailed OpenAPI/Swagger docs

## 📋 Prerequisites

### Required Software

1. **Python 3.11+**
   ```powershell
   python --version
   ```

2. **Ollama** - [Download and install](https://ollama.ai/)
   ```powershell
   ollama --version
   ```

3. **Git** (optional, for cloning)

### System Requirements

- **RAM**: Minimum 8GB (16GB+ recommended for larger models)
- **Storage**: Varies by model (e.g., Llama3 ~4.7GB, Mistral ~4.1GB)
- **OS**: Windows, macOS, or Linux

## 🚀 Quick Start

### 1. Installation

#### Clone or Download the Project
```powershell
cd "c:\Users\daspa\Desktop\Olama"
```

#### Create Virtual Environment
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

#### Install Dependencies
```powershell
pip install -r requirements.txt
```

### 2. Configuration

#### Create Environment File
```powershell
Copy-Item .env.example -Destination .env
```

#### Edit `.env` (Optional)
```ini
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_TIMEOUT=300

# Application Configuration
APP_NAME="Local LLM Platform"
DEBUG=False
LOG_LEVEL=INFO

# Server Configuration
HOST=0.0.0.0
PORT=8000

# Performance Settings
MAX_CONCURRENT_REQUESTS=10
MAX_PROMPT_SIZE_MB=10
```

### 3. Start Ollama

Ensure Ollama is running in the background:

```powershell
ollama serve
```

Or simply start the Ollama desktop application.

### 4. Download a Model

Download your first model (e.g., Llama3):

```powershell
ollama pull llama3
```

**Popular Models:**
- `llama3` - Meta's Llama 3 (4.7GB)
- `mistral` - Mistral 7B (4.1GB)
- `codellama` - Code-specialized Llama (3.8GB)
- `phi3` - Microsoft Phi-3 (2.3GB)

Browse more: [Ollama Library](https://ollama.ai/library)

### 5. Run the Application

```powershell
python main.py
```

Or with uvicorn directly:
```powershell
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 6. Access the API

- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

## 📖 API Usage

### Health Check

Check if the service is running and Ollama is connected:

```bash
curl http://localhost:8000/health
```

**Response:**
```json
{
  "status": "healthy",
  "ollama_connected": true,
  "timestamp": "2025-10-22T10:00:00Z",
  "version": "1.0.0"
}
```

### List Available Models

Get all locally available models:

```bash
curl http://localhost:8000/models
```

**Response:**
```json
{
  "models": [
    {
      "name": "llama3:latest",
      "size": 4661224768,
      "digest": "sha256:abc123...",
      "modified_at": "2025-10-20T15:30:00Z"
    }
  ],
  "count": 1
}
```

### Download a Model

Download a new model via API:

```bash
curl -X POST http://localhost:8000/models/download \
  -H "Content-Type: application/json" \
  -d '{"model_name": "mistral"}'
```

**Response:**
```json
{
  "status": "success",
  "model_name": "mistral",
  "message": "Model 'mistral' downloaded successfully"
}
```

### Generate Text

Generate text using a model:

```bash
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3",
    "prompt": "Explain quantum computing in simple terms.",
    "max_tokens": 500,
    "temperature": 0.7
  }'
```

**Response:**
```json
{
  "response": "Quantum computing is a revolutionary approach...",
  "model": "llama3",
  "total_duration": 5000000000,
  "prompt_eval_count": 12,
  "eval_count": 150,
  "context": [123, 456, ...]
}
```

#### Advanced Generation Parameters

```json
{
  "model": "llama3",
  "prompt": "Your prompt here",
  "max_tokens": 4000,
  "temperature": 0.7,
  "top_p": 0.9,
  "top_k": 40,
  "repeat_penalty": 1.1,
  "context": [...]  // For multi-turn conversations
}
```

### Delete a Model

Remove a model to free disk space:

```bash
curl -X DELETE http://localhost:8000/models/llama3
```

**Response:**
```json
{
  "status": "success",
  "model_name": "llama3",
  "message": "Model 'llama3' deleted successfully"
}
```

## 🏗️ Project Structure

```
Olama/
├── main.py                 # FastAPI application entry point
├── requirements.txt        # Python dependencies
├── .env.example           # Environment variables template
├── .env                   # Your configuration (create from .example)
├── routes/                # API route definitions
│   ├── __init__.py
│   ├── models.py         # Model management endpoints
│   └── generate.py       # Text generation endpoint
├── services/             # Business logic layer
│   ├── __init__.py
│   ├── ollama_service.py # Ollama API/CLI wrapper
│   └── context_handler.py # Large context management
├── schemas/              # Pydantic models for validation
│   ├── __init__.py
│   ├── request_schemas.py
│   └── response_schemas.py
└── utils/                # Utilities
    ├── __init__.py
    ├── config.py         # Settings management
    └── logger.py         # Structured logging
```

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_TIMEOUT` | `300` | Request timeout (seconds) |
| `APP_NAME` | `"Local LLM Platform"` | Application name |
| `DEBUG` | `False` | Enable debug mode |
| `LOG_LEVEL` | `INFO` | Logging level |
| `HOST` | `0.0.0.0` | Server host |
| `PORT` | `8000` | Server port |
| `MAX_CONCURRENT_REQUESTS` | `10` | Max concurrent requests |
| `MAX_PROMPT_SIZE_MB` | `10` | Max prompt size in MB |

## 🧪 Testing

### Test Health Endpoint
```powershell
Invoke-RestMethod -Uri http://localhost:8000/health
```

### Test Generation
```powershell
$body = @{
    model = "llama3"
    prompt = "What is FastAPI?"
    max_tokens = 200
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:8000/generate -Method Post -Body $body -ContentType "application/json"
```

## 🔧 Troubleshooting

### Ollama Connection Failed

**Problem**: `ollama_connected: false` in health check

**Solutions:**
1. Ensure Ollama is running: `ollama serve`
2. Check Ollama is accessible: `curl http://localhost:11434/api/tags`
3. Verify `OLLAMA_BASE_URL` in `.env`

### Model Not Found

**Problem**: `ModelNotFoundError` when generating

**Solutions:**
1. List available models: `ollama list`
2. Download the model: `ollama pull <model-name>`
3. Or use the API: `POST /models/download`

### Prompt Too Large

**Problem**: `Prompt size exceeds maximum allowed size`

**Solutions:**
1. Reduce prompt size
2. Increase `MAX_PROMPT_SIZE_MB` in `.env`
3. Use prompt truncation via `context_handler`

### Slow Response Times

**Problem**: Generation takes too long

**Solutions:**
1. Use smaller models (e.g., `phi3` instead of `llama3`)
2. Reduce `max_tokens` in generation request
3. Ensure sufficient RAM is available
4. Lower `temperature` for faster, more deterministic responses

## 📊 Performance Optimization

### For Large Context Sizes

The platform is optimized for large prompts:
- Automatic prompt validation
- Memory-efficient context handling
- Configurable size limits

### For Concurrent Requests

- Async/await throughout
- Connection pooling
- Request queue management
- Configurable concurrency limits

## 🛠️ Development

### Running in Development Mode

```powershell
# Enable debug mode
$env:DEBUG = "True"
$env:LOG_LEVEL = "DEBUG"

# Run with auto-reload
uvicorn main:app --reload --port 8000
```

### Code Formatting

```powershell
# Install dev tools
pip install black isort

# Format code
black .
isort .
```

## 📝 API Documentation

Once the server is running, comprehensive interactive documentation is available:

- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
  - Interactive API testing
  - Request/response schemas
  - Authentication (if added)

- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
  - Clean, readable documentation
  - Code samples
  - Search functionality

## 🔐 Security Considerations

### For Production Deployment:

1. **CORS Configuration**: Update `allow_origins` in `main.py`
2. **Environment Variables**: Never commit `.env` to version control
3. **API Authentication**: Consider adding authentication middleware
4. **Rate Limiting**: Add rate limiting for public deployments
5. **HTTPS**: Use reverse proxy (nginx, Caddy) with SSL/TLS

## 🤝 Contributing

This is a template project. Feel free to:
- Add database integration for request logging
- Implement streaming responses
- Add user authentication
- Enhance error handling
- Add monitoring/metrics

## 📄 License

This project is provided as-is for educational and development purposes.

## 🙏 Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) - Modern web framework
- [Ollama](https://ollama.ai/) - Local LLM runtime
- [Pydantic](https://pydantic-docs.helpmanual.io/) - Data validation
- [structlog](https://www.structlog.org/) - Structured logging

## 📞 Support

For issues related to:
- **This Platform**: Check the troubleshooting section above
- **Ollama**: [Ollama Documentation](https://github.com/ollama/ollama)
- **FastAPI**: [FastAPI Documentation](https://fastapi.tiangolo.com/)

---

**Built with ❤️ for offline AI development**
