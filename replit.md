# Local LLM Platform - Replit Project

## Overview

This is a full-stack Local LLM Platform application designed to work with Ollama for running Large Language Models locally. The platform includes:

- **Backend**: FastAPI Python application with REST API for LLM operations and RAG (Retrieval-Augmented Generation) capabilities
- **Frontend**: React + TypeScript + Vite application with a modern UI for interacting with LLMs
- **Document Processing**: Support for PDF, DOCX, PPTX, and other document formats
- **Vector Search**: Hybrid search combining semantic and keyword-based retrieval

## Project Architecture

### Backend (Port 8000)
- **Framework**: FastAPI with async/await support
- **API Documentation**: Available at `/docs` (Swagger UI) and `/redoc`
- **Core Features**:
  - Model management (list, download, delete models)
  - Text generation with configurable parameters
  - Document ingestion and RAG search
  - Health monitoring

### Frontend (Port 5000)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router for multi-page navigation
- **Styling**: Tailwind CSS with modern gradients and shadows
- **Replit Configuration**: 
  - Host: 0.0.0.0 (required for Replit proxy)
  - allowedHosts: true (critical for Replit proxy access)
  - HMR clientPort: 443 (for hot module replacement through proxy)
- **Features**:
  - Modern multi-page interface with sidebar navigation
  - Chat page: LLM interactions with streaming and RAG support
  - Documents page (BYOD): Upload and search documents using hybrid retrieval
  - Models page: Download and manage LLM models
  - Real-time status monitoring and health indicators

## Development Setup

### Workflows

The project has two workflows configured:

1. **Frontend** (Port 5000): Runs the Vite dev server with hot module replacement
2. **Backend** (Port 8000): Runs the FastAPI application with auto-reload

Both workflows start automatically when you run the project.

### Port Configuration

- **Frontend**: 5000 (user-facing web interface)
- **Backend**: 8000 (API server)
- Frontend proxies `/api/*` requests to the backend at `http://localhost:8000`

### Environment Configuration

The backend uses environment variables from a `.env` file (optional, has sensible defaults). To customize the configuration:

1. Copy `.env.example` to `.env`: `cp .env.example .env`
2. Edit `.env` with your desired values

**Available Environment Variables:**

**Ollama Configuration:**
- `OLLAMA_BASE_URL`: Ollama server URL (default: http://localhost:11434)
- `OLLAMA_TIMEOUT`: Request timeout in seconds (default: 300)

**Application Configuration:**
- `APP_NAME`: Application name (default: "Local LLM Platform")
- `APP_VERSION`: Version number (default: "1.0.0")
- `DEBUG`: Enable debug mode and auto-reload (default: False)
- `LOG_LEVEL`: Logging level - DEBUG, INFO, WARNING, ERROR (default: INFO)

**Server Configuration:**
- `HOST`: Backend server host (default: localhost, use 0.0.0.0 for external access)
- `PORT`: Backend server port (default: 8000)

**Performance Settings:**
- `MAX_CONCURRENT_REQUESTS`: Max simultaneous requests (default: 10)
- `REQUEST_TIMEOUT`: Request timeout in seconds (default: 300)
- `MAX_PROMPT_SIZE_MB`: Maximum prompt size in MB (default: 10)

**RAG Configuration:**
- `EMBEDDING_MODEL`: Model for embeddings (default: nomic-embed-text-v1.5)
- `CHUNK_SIZE`: Text chunk size in tokens (default: 512)
- `CHUNK_OVERLAP`: Overlap between chunks (default: 100)
- `VECTOR_STORE_PATH`: Vector database path (default: ./data/vector_store)
- `KEYWORD_INDEX_PATH`: Keyword index path (default: ./data/keyword_index)
- `SEMANTIC_WEIGHT`: Weight for semantic search (default: 0.65)
- `LEXICAL_WEIGHT`: Weight for keyword search (default: 0.35)

See `.env.example` for a complete list with all available options.

## Dependencies

### Python (Backend)
- FastAPI, Uvicorn - Web framework
- Pydantic - Data validation
- HTTPX - HTTP client for Ollama
- BeautifulSoup4, lxml - HTML/XML parsing
- PyPDF2, python-docx, python-pptx - Document processing
- NumPy, Pillow - Data processing
- Whoosh - Full-text search
- Structlog - Structured logging

### Node.js (Frontend)
- React, React DOM - UI framework
- React Router - Multi-page routing
- Vite - Build tool
- TypeScript - Type safety
- Axios - HTTP client
- Tailwind CSS - Modern styling with gradients
- React Markdown - Markdown rendering
- React Icons - Icon library
- React Syntax Highlighter - Code highlighting

## Project Structure

```
/
├── main.py                 # FastAPI application entry point
├── routes/                 # API route handlers
│   ├── models.py          # Model management endpoints
│   ├── generate.py        # Text generation endpoint
│   └── ingestion_routes.py # RAG/document endpoints
├── services/              # Business logic
│   ├── ollama_service.py # Ollama integration
│   └── context_handler.py # Context management
├── core/                  # RAG implementation
│   ├── doc_extractor.py  # Document extraction
│   ├── embedder.py       # Text embeddings
│   ├── vector_store.py   # Vector database
│   └── hybrid_search.py  # Search implementation
├── schemas/              # Pydantic models
├── utils/                # Utilities
│   ├── config.py        # Configuration management
│   └── logger.py        # Logging setup
└── frontend/            # React application
    ├── src/
    │   ├── components/  # React components (ChatInterface, DocumentManager, ModelManager)
    │   ├── pages/       # Page components (ChatPage, DocumentsPage, ModelsPage)
    │   ├── hooks/       # Custom React hooks
    │   ├── services/    # API client
    │   └── types/       # TypeScript types
    └── vite.config.ts   # Vite configuration
```

## Recent Changes

### 2025-10-22: Modern Multi-Page UI Update
- Implemented React Router for multi-page navigation
- Created modern sidebar navigation with gradient active states
- Separated interface into three distinct pages:
  - Chat: LLM interaction with advanced settings and RAG support
  - Documents (BYOD): Document upload and hybrid search
  - Models: Model download and management
- Modernized all components with:
  - Gradient backgrounds and buttons
  - Enhanced shadows and rounded corners
  - Improved empty states and loading indicators
  - Better color scheme with blue/indigo gradients
- Updated Layout component with sticky header and responsive sidebar
- Enhanced user experience with smooth transitions and hover effects

### 2025-10-22: Initial Replit Setup
- Installed Python 3.11 and Node.js 20
- Configured backend to run on port 8000 (localhost)
- Configured frontend to run on port 5000 (0.0.0.0 for Replit proxy)
- Updated Vite config to allow all hosts and proxy API requests
- Set up workflows for both frontend and backend
- Configured deployment settings for VM deployment
- Added .pythonlibs/ to .gitignore

## Usage Notes

### Ollama Integration

⚠️ **Important**: This application requires Ollama to be installed and running to use LLM features. 

In the Replit environment, Ollama is not pre-installed. The backend will show "degraded" status until Ollama is available. The application will still run but LLM features will not work without Ollama.

To use Ollama:
1. Install Ollama locally or on a server
2. Update `OLLAMA_BASE_URL` to point to your Ollama instance
3. Download models using the `/models/download` endpoint or Ollama CLI

### API Endpoints

- `GET /` - API information
- `GET /health` - Health check
- `GET /docs` - Interactive API documentation
- `GET /models` - List available models
- `POST /models/download` - Download a model
- `DELETE /models/{model_name}` - Delete a model
- `POST /generate` - Generate text
- `POST /rag/ingest-doc` - Upload document for RAG
- `GET /rag/search` - Search documents
- `GET /rag/indices` - List RAG indices

## Deployment

The project is configured for VM deployment on Replit, which:
- Keeps the server always running
- Maintains state in server memory
- Runs both frontend and backend processes

To deploy:
1. Click the "Publish" button in Replit
2. The deployment will run both the backend and frontend automatically
3. Access the app through the provided Replit URL

## Troubleshooting

### Backend shows "degraded" status
- This is expected when Ollama is not accessible
- The app still runs but LLM features require Ollama

### Frontend not loading
- Check that port 5000 is not blocked
- Verify the Frontend workflow is running
- Check browser console for errors

### API requests failing
- Ensure Backend workflow is running on port 8000
- Check `/health` endpoint to verify backend status
- Review backend logs for errors

## Development Tips

- Use the Swagger UI at `/docs` to test API endpoints
- Frontend hot-reloads automatically on file changes
- Backend auto-reloads when Python files change (DEBUG mode)
- Check workflow logs for detailed error messages
