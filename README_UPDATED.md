# 🧠 Local LLM Platform with Ollama + Enterprise RAG System

A production-ready, backend-only FastAPI platform for running Large Language Models (LLMs) completely offline using Ollama, now with **enterprise-grade document ingestion and hybrid retrieval (RAG)** capabilities.

## ✨ Features

### Core LLM Platform
- **🔒 Fully Offline**: Works completely without internet access after initial setup
- **🚀 Multiple Models**: Manage and run multiple local LLM models concurrently
- **📊 Large Context Support**: Handle prompts up to 10MB (configurable)
- **⚡ Async & Concurrent**: Efficient async processing for multiple simultaneous requests
- **📝 REST API Only**: Non-streaming responses with comprehensive Swagger documentation
- **🛡️ Production Ready**: Structured logging, error handling, and request validation

### 🆕 Enterprise RAG System
- **📚 Multi-Format Documents**: PDF, DOCX, TXT, PPTX, HTML with structure preservation
- **🧠 State-of-the-Art Embeddings**: nomic-embed-text-v1.5, BGE models (768-1024 dimensions)
- **🔍 Hybrid Search**: Combines semantic similarity + BM25 keyword matching
- **💾 Local Vector Storage**: ChromaDB with persistent indices
- **✂️ Intelligent Chunking**: Token-aware splitting with boundary awareness
- **🔑 Keyword Extraction**: KeyBERT for semantic keywords + named entities
- **⚡ High Performance**: Batch processing, GPU acceleration, efficient indexing

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

- **RAM**: Minimum 8GB (16GB+ recommended for RAG + large models)
- **Storage**: 10GB+ free (models + embeddings + document indices)
- **OS**: Windows, macOS, or Linux
- **Optional**: NVIDIA GPU with CUDA for faster embeddings

## 🚀 Quick Start

### 1. Installation

#### Clone or Download the Project
```powershell
cd "c:\Users\daspa\Desktop\Olama"
```

#### Create Virtual Environment
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

#### Install All Dependencies
```powershell
# Upgrade pip
python -m pip install --upgrade pip

# Install all packages (including new RAG dependencies)
pip install -r requirements.txt

# Download SpaCy model for keyword extraction
python -m spacy download en_core_web_sm
```

### 2. Start Ollama

```powershell
# Start Ollama service (if not running)
ollama serve

# In another terminal, download a model
ollama pull llama3
```

### 3. Start the Application

```powershell
# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Start the server
python main.py
```

The API will be available at:
- **API**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 📡 API Overview

### LLM Endpoints

#### Generate Text
```bash
POST /generate
```

Generate text using a local model.

#### List Models
```bash
GET /models
```

Get all available local models.

#### Download Model
```bash
POST /models/download
```

Download a new model from Ollama registry.

### 🆕 RAG Endpoints

#### Ingest Document
```bash
POST /rag/ingest-doc
```

Upload and index documents for semantic search.

#### Search Documents
```bash
GET /rag/search
```

Hybrid search across indexed documents.

#### List Indices
```bash
GET /rag/indices
```

Get all available document collections.

#### Statistics
```bash
GET /rag/stats
```

System statistics and configuration.

See **[RAG_SYSTEM_GUIDE.md](RAG_SYSTEM_GUIDE.md)** for complete RAG documentation.

## 🎯 Usage Examples

### LLM Generation

#### PowerShell
```powershell
$body = @{
    model = "llama3"
    prompt = "Explain quantum computing in simple terms"
    stream = $false
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/generate" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

#### Python
```python
import requests

response = requests.post('http://localhost:8000/generate', json={
    'model': 'llama3',
    'prompt': 'Explain quantum computing in simple terms',
    'stream': False
})
print(response.json()['response'])
```

### RAG Document Search

#### PowerShell
```powershell
# Ingest document
$form = @{
    file = Get-Item "document.pdf"
    index_name = "my_docs"
}
Invoke-RestMethod -Uri "http://localhost:8000/rag/ingest-doc" `
    -Method Post -Form $form

# Search
Invoke-RestMethod -Uri "http://localhost:8000/rag/search" `
    -Body @{
        query = "important information"
        index_name = "my_docs"
        top_k = 5
    }
```

#### Python
```python
import requests

# Ingest
with open('document.pdf', 'rb') as f:
    files = {'file': f}
    data = {'index_name': 'my_docs'}
    requests.post('http://localhost:8000/rag/ingest-doc', files=files, data=data)

# Search
response = requests.get('http://localhost:8000/rag/search', params={
    'query': 'important information',
    'index_name': 'my_docs',
    'top_k': 5
})
print(response.json())
```

See **[example_rag_usage.py](example_rag_usage.py)** for more examples.

## ⚙️ Configuration

### Main Configuration (`utils/config.py`)

#### Ollama Settings
```python
ollama_base_url = "http://localhost:11434"
ollama_timeout = 300
```

#### RAG Settings
```python
# Embedding model (nomic-embed-text-v1.5, bge-large, bge-base, mpnet, minilm)
embedding_model = "nomic-embed-text-v1.5"

# Chunking parameters
chunk_size = 1000        # tokens per chunk
chunk_overlap = 150      # overlap for context

# Hybrid search weights
semantic_weight = 0.7    # vector similarity weight
lexical_weight = 0.3     # keyword matching weight

# Paths
vector_store_path = "./data/vector_store"
keyword_index_path = "./data/keyword_index"
```

### Environment Variables (`.env`)

Create a `.env` file:
```bash
OLLAMA_BASE_URL=http://localhost:11434
EMBEDDING_MODEL=nomic-embed-text-v1.5
CHUNK_SIZE=1000
SEMANTIC_WEIGHT=0.7
```

## 📂 Project Structure

```
/
├── main.py                      # FastAPI application entry point
├── requirements.txt             # Python dependencies (updated)
├── .env                         # Environment variables (optional)
│
├── routes/                      # API route handlers
│   ├── models.py               # Model management endpoints
│   ├── generate.py             # Text generation endpoints
│   └── ingestion_routes.py     # 🆕 RAG endpoints
│
├── core/                        # 🆕 RAG core modules
│   ├── doc_extractor.py        # Document parsing
│   ├── text_chunker.py         # Semantic chunking
│   ├── embedder.py             # Local embeddings
│   ├── keyword_extractor.py    # Keyword extraction
│   ├── vector_store.py         # ChromaDB management
│   └── hybrid_search.py        # Hybrid retrieval
│
├── services/                    # Business logic services
│   ├── ollama_service.py       # Ollama API client
│   └── context_handler.py      # Context management
│
├── schemas/                     # Pydantic models
│   ├── request_schemas.py      # Request validation
│   └── response_schemas.py     # Response models
│
├── utils/                       # Utility modules
│   ├── config.py               # Configuration (updated)
│   └── logger.py               # Structured logging
│
├── data/                        # 🆕 Persistent data storage
│   ├── vector_store/           # ChromaDB collections
│   └── keyword_index/          # Whoosh indices
│
└── docs/                        # 🆕 Documentation
    ├── RAG_SYSTEM_GUIDE.md     # Complete RAG guide
    ├── RAG_INSTALLATION.md     # Setup instructions
    ├── RAG_SUMMARY.md          # Implementation summary
    ├── RAG_QUICK_REFERENCE.md  # Quick reference card
    └── example_rag_usage.py    # Working examples
```

## 🆕 What's New: Enterprise RAG System

This release adds a **complete enterprise-grade RAG (Retrieval-Augmented Generation) system**:

### Key Capabilities
✅ **Multi-format document ingestion** (PDF, DOCX, TXT, PPTX, HTML)  
✅ **Structure-aware extraction** with Docling  
✅ **State-of-the-art embeddings** (nomic-embed-text-v1.5, BGE models)  
✅ **Intelligent semantic chunking** with boundary respect  
✅ **Hybrid search** (semantic + BM25 keyword matching)  
✅ **Local vector storage** with ChromaDB  
✅ **Keyword extraction** with KeyBERT  
✅ **GPU acceleration** support  

### New Dependencies
- docling, sentence-transformers, chromadb
- keybert, whoosh, langchain
- pypdf2, python-docx, python-pptx
- beautifulsoup4, spacy, nltk

See **[RAG_INSTALLATION.md](RAG_INSTALLATION.md)** for detailed setup.

## 📚 Documentation

### Core Platform
- **[QUICKSTART.md](QUICKSTART.md)** - Fast setup guide
- **[FULLSTACK_GUIDE.md](FULLSTACK_GUIDE.md)** - Comprehensive guide
- **[EXAMPLES.md](EXAMPLES.md)** - Usage examples
- **[WINDOWS.md](WINDOWS.md)** - Windows-specific instructions

### 🆕 RAG System
- **[RAG_SYSTEM_GUIDE.md](RAG_SYSTEM_GUIDE.md)** - Complete usage guide
- **[RAG_INSTALLATION.md](RAG_INSTALLATION.md)** - Setup & troubleshooting
- **[RAG_SUMMARY.md](RAG_SUMMARY.md)** - Implementation overview
- **[RAG_QUICK_REFERENCE.md](RAG_QUICK_REFERENCE.md)** - Quick commands
- **[example_rag_usage.py](example_rag_usage.py)** - Working examples

### API Documentation
- **Interactive Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🧪 Testing

### Test LLM Generation
```powershell
python -m pytest test_main.py
```

### Test RAG System
```powershell
python example_rag_usage.py
```

### Manual Testing
Visit http://localhost:8000/docs for interactive API testing.

## 🔧 Troubleshooting

### Common Issues

#### RAG Dependencies
```powershell
pip install --force-reinstall -r requirements.txt
python -m spacy download en_core_web_sm
```

#### Ollama Connection
```powershell
# Check Ollama is running
ollama list

# Restart Ollama
ollama serve
```

#### Memory Issues (RAG)
Switch to lighter embedding model:
```python
embedding_model = "minilm"  # 384d, very light
```

See documentation for more troubleshooting steps.

## 🚀 Performance Optimization

### GPU Acceleration (RAG)
```powershell
pip install torch --index-url https://download.pytorch.org/whl/cu118
```

### Model Selection
- **Speed**: Use `minilm` embeddings
- **Balance**: Use `nomic-embed-text-v1.5` (default)
- **Accuracy**: Use `bge-large`

## 🤝 Contributing

Contributions are welcome! Areas for enhancement:
- Additional document formats
- Advanced chunking strategies
- Multi-index federated search
- Question-answering endpoint
- Document summarization

## 📄 License

This project is open source. See LICENSE file for details.

## 🙏 Acknowledgments

- **Ollama** - Local LLM runtime
- **FastAPI** - Web framework
- **Docling** - Document extraction
- **Sentence Transformers** - Embeddings
- **ChromaDB** - Vector database
- **KeyBERT** - Keyword extraction
- **Whoosh** - Full-text search

## 📞 Support

- **Issues**: Check documentation first
- **RAG Questions**: See [RAG_SYSTEM_GUIDE.md](RAG_SYSTEM_GUIDE.md)
- **API Docs**: http://localhost:8000/docs

---

**Built with ❤️ for local-first AI applications**

🆕 **Now with enterprise-grade RAG capabilities!**
