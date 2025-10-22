# 📚 Enterprise RAG System - Complete Guide

## Overview

You now have a **production-grade document ingestion and hybrid retrieval system** integrated into your FastAPI backend. This system provides:

- ✅ **Multi-format document extraction** (PDF, DOCX, TXT, PPTX, HTML) with structure preservation
- ✅ **Intelligent semantic chunking** with boundary awareness
- ✅ **State-of-the-art local embeddings** (nomic-embed-text-v1.5 / BGE models)
- ✅ **Hybrid search** combining semantic similarity + BM25 keyword matching
- ✅ **Persistent local storage** with ChromaDB + Whoosh
- ✅ **RESTful API** with comprehensive endpoints

---

## 🚀 Quick Start

### 1. Install Dependencies

```powershell
# Activate your virtual environment
.\.venv\Scripts\Activate.ps1

# Install new dependencies
pip install -r requirements.txt

# Download SpaCy model (for keyword extraction)
python -m spacy download en_core_web_sm
```

### 2. Start the Server

```powershell
# Standard start
python main.py

# Or use the start script
.\start.ps1
```

The API will be available at: `http://localhost:8000`

---

## 📡 API Endpoints

### Health Check
```bash
GET /rag/health
```

Check if RAG system components are loaded.

**Response:**
```json
{
  "status": "healthy",
  "components": {
    "vector_store": "ok",
    "embedder": "ok",
    "model": "nomic-embed-text-v1.5"
  }
}
```

---

### Ingest Document
```bash
POST /rag/ingest-doc
```

Upload and process a document into the RAG system.

**Parameters:**
- `file` (form-data): Document file
- `index_name` (form-data): Index name to store in

**Example (PowerShell):**
```powershell
$form = @{
    file = Get-Item "C:\path\to\document.pdf"
    index_name = "company_policies"
}
Invoke-RestMethod -Uri "http://localhost:8000/rag/ingest-doc" `
    -Method Post -Form $form
```

**Example (cURL):**
```bash
curl -X POST "http://localhost:8000/rag/ingest-doc" \
     -F "file=@policy.pdf" \
     -F "index_name=company_policies"
```

**Response:**
```json
{
  "success": true,
  "message": "Document ingested successfully",
  "index_name": "company_policies",
  "chunks_created": 42,
  "filename": "policy.pdf"
}
```

---

### Search Documents
```bash
GET /rag/search
```

Search across ingested documents using hybrid retrieval.

**Parameters:**
- `query` (required): Search query text
- `index_name` (required): Index to search
- `top_k` (optional): Number of results (default: 10)
- `search_type` (optional): `hybrid` (default), `semantic`, or `lexical`

**Example:**
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/rag/search" `
    -Method Get `
    -Body @{
        query = "employee reimbursement policy"
        index_name = "company_policies"
        top_k = 5
    }
```

**Response:**
```json
{
  "query": "employee reimbursement policy",
  "results": [
    {
      "text": "Employees can claim reimbursement for travel expenses...",
      "score": 0.8756,
      "metadata": {
        "filename": "policy.pdf",
        "section": "Financial Policies",
        "page": 4
      },
      "chunk_id": "policy.pdf_3_1"
    }
  ],
  "total_results": 5,
  "search_type": "hybrid"
}
```

---

### List Indices
```bash
GET /rag/indices
```

Get all available document indices.

**Response:**
```json
{
  "indices": [
    {
      "name": "company_policies",
      "document_count": 42,
      "metadata": {
        "source": "ingestion_api"
      }
    }
  ],
  "total_indices": 1
}
```

---

### Delete Index
```bash
DELETE /rag/indices/{index_name}
```

Delete an index and all its documents.

**Example:**
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/rag/indices/company_policies" `
    -Method Delete
```

---

### Get Statistics
```bash
GET /rag/stats
```

Get system statistics and configuration.

**Response:**
```json
{
  "vector_store": {
    "total_collections": 2,
    "total_documents": 158,
    "collections": { ... }
  },
  "embedding_model": {
    "model_name": "nomic-ai/nomic-embed-text-v1.5",
    "dimension": 768,
    "device": "cpu",
    "batch_size": 128
  },
  "configuration": {
    "chunk_size": 1000,
    "chunk_overlap": 150,
    "semantic_weight": 0.7,
    "lexical_weight": 0.3
  }
}
```

---

## ⚙️ Configuration

Edit `.env` or `utils/config.py` to customize:

### Embedding Model
```python
embedding_model = "nomic-embed-text-v1.5"
# Options: 'nomic-embed-text-v1.5', 'bge-large', 'bge-base', 'mpnet', 'minilm'
```

**Model Comparison:**
| Model | Dimensions | Speed | Accuracy | Use Case |
|-------|-----------|-------|----------|----------|
| `nomic-embed-text-v1.5` | 768 | Fast | High | **Recommended** balanced choice |
| `bge-large` | 1024 | Medium | Highest | Maximum accuracy |
| `bge-base` | 768 | Fast | Good | Speed-focused |
| `mpnet` | 768 | Fast | Good | Fallback |
| `minilm` | 384 | Fastest | Medium | Resource-constrained |

### Chunking
```python
chunk_size = 1000           # tokens per chunk (800-1200 recommended)
chunk_overlap = 150         # overlap for context preservation
respect_doc_structure = True  # preserve section boundaries
```

### Hybrid Search Weights
```python
semantic_weight = 0.7  # weight for vector similarity
lexical_weight = 0.3   # weight for BM25 keyword matching
```

**Tuning Guide:**
- **Technical docs**: Increase `lexical_weight` to 0.4-0.5
- **Narrative content**: Increase `semantic_weight` to 0.8+
- **Mixed content**: Keep default 0.7/0.3

---

## 🏗️ Architecture

### Document Ingestion Pipeline

```
📄 Document Upload
    ↓
🔍 Extraction (Docling)
    ├─ Structure-aware parsing
    ├─ Section detection
    └─ Metadata extraction
    ↓
✂️ Semantic Chunking
    ├─ Respects boundaries
    ├─ Token-aware splitting
    └─ Overlap for context
    ↓
🧠 Embedding Generation
    ├─ Local transformer model
    ├─ Batch processing
    └─ 768-1024 dimensions
    ↓
🔑 Keyword Extraction (KeyBERT)
    ├─ Semantic keywords
    ├─ Named entities
    └─ BM25 indexing
    ↓
💾 Persistent Storage
    ├─ ChromaDB (vectors)
    └─ Whoosh (keywords)
```

### Search Pipeline

```
🔍 User Query
    ↓
    ├─────────────────┬─────────────────┐
    ↓                 ↓                 ↓
📊 Vector Search   🔤 Keyword Search  (parallel)
    ├─ Embed query    ├─ Parse query
    ├─ Cosine sim     ├─ BM25 scoring
    └─ Top-K          └─ Top-K
    ↓                 ↓
    └─────────────────┴─────────────────┘
                      ↓
              🔀 Score Fusion
                ├─ Weighted merge
                ├─ Deduplication
                └─ Ranking
                      ↓
              📤 Results
```

---

## 📂 File Structure

```
/core                          # Core RAG modules
  ├── doc_extractor.py         # Document parsing (Docling)
  ├── text_chunker.py          # Semantic chunking
  ├── embedder.py              # Local embedding models
  ├── keyword_extractor.py     # KeyBERT keyword extraction
  ├── vector_store.py          # ChromaDB management
  └── hybrid_search.py         # Hybrid retrieval engine

/routes
  └── ingestion_routes.py      # RAG API endpoints

/data
  ├── vector_store/            # ChromaDB persistent storage
  └── keyword_index/           # Whoosh keyword indices

/utils
  └── config.py                # Configuration (updated)

requirements.txt               # Updated with RAG dependencies
main.py                        # Updated with RAG routes
```

---

## 🧪 Testing

### Test Document Ingestion

```python
import requests

# Upload a document
files = {'file': open('test.pdf', 'rb')}
data = {'index_name': 'test_index'}
response = requests.post(
    'http://localhost:8000/rag/ingest-doc',
    files=files,
    data=data
)
print(response.json())
```

### Test Search

```python
response = requests.get(
    'http://localhost:8000/rag/search',
    params={
        'query': 'test query',
        'index_name': 'test_index',
        'top_k': 5
    }
)
print(response.json())
```

---

## 🔧 Troubleshooting

### Import Errors

If you see import errors for new dependencies:
```powershell
pip install --upgrade -r requirements.txt
```

### Docling Not Available

The system falls back to format-specific parsers (PyPDF2, python-docx, etc.) if Docling fails to load.

### SpaCy Model Missing

```powershell
python -m spacy download en_core_web_sm
```

### ChromaDB Errors

Delete and recreate indices:
```powershell
Remove-Item -Recurse -Force ./data/vector_store/*
```

### Memory Issues with Large Models

Switch to a smaller embedding model:
```python
# In .env or config.py
embedding_model = "minilm"  # 384d, very light
```

---

## 🚀 Performance Optimization

### Batch Processing

Ingest multiple documents programmatically:
```python
import asyncio
from pathlib import Path

async def batch_ingest(directory: Path, index_name: str):
    files = list(directory.glob("*.pdf"))
    for file in files:
        # POST to /rag/ingest-doc
        pass
```

### GPU Acceleration

For faster embedding generation, install PyTorch with CUDA:
```powershell
pip install torch --index-url https://download.pytorch.org/whl/cu118
```

The embedder will automatically use GPU if available.

### Caching

Embeddings are cached in ChromaDB. Re-ingesting the same content is fast.

---

## 📊 Use Cases

### 1. Internal Knowledge Base
- Ingest company documentation
- Search policies and procedures
- Answer employee questions

### 2. Research Assistant
- Index academic papers
- Semantic search across literature
- Find relevant citations

### 3. Legal Document Search
- Store contracts and regulations
- Hybrid search for clauses
- Compliance verification

### 4. Technical Documentation
- API docs, manuals, guides
- Code documentation
- Quick reference lookup

---

## 🔐 Security Notes

- **Local-only**: All data stays on your machine
- **No external API calls** after model download
- **Secure file uploads**: Validate file types in production
- **Access control**: Add authentication for production use

---

## 📈 Next Steps

### Integrate with LLM Generation

Combine RAG search with your existing Ollama generation:

```python
# 1. Search for relevant context
search_response = requests.get('/rag/search', params={...})
context = "\n\n".join([r['text'] for r in search_response['results']])

# 2. Generate answer with context
generate_response = requests.post('/generate', json={
    'model': 'llama3',
    'prompt': f"Context:\n{context}\n\nQuestion: {query}\n\nAnswer:",
    'stream': False
})
```

### Add Advanced Features

- **Question answering** endpoint combining search + generation
- **Document summarization** per index
- **Multi-index search** across all collections
- **Relevance feedback** to improve results
- **Incremental updates** without full re-indexing

---

## 📚 Additional Resources

- **Docling**: https://github.com/DS4SD/docling
- **Sentence Transformers**: https://www.sbert.net/
- **ChromaDB**: https://docs.trychroma.com/
- **KeyBERT**: https://maartengr.github.io/KeyBERT/
- **Whoosh**: https://whoosh.readthedocs.io/

---

## ✅ System Complete

Your enterprise-grade RAG system is now fully operational! 🎉

**Test it:**
```powershell
# 1. Start server
python main.py

# 2. Check health
Invoke-RestMethod http://localhost:8000/rag/health

# 3. Visit docs
# Open browser: http://localhost:8000/docs
```
