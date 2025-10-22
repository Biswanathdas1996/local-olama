# 🚀 Enterprise RAG System - Installation & Setup

## Quick Install

### 1. Install All Dependencies

```powershell
# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Upgrade pip
python -m pip install --upgrade pip

# Install all dependencies (including new RAG packages)
pip install -r requirements.txt

# Download SpaCy language model (for keyword extraction)
python -m spacy download en_core_web_sm
```

### 2. Install PyTorch (Optional - for GPU acceleration)

**CPU-only (default):**
```powershell
pip install torch torchvision torchaudio
```

**GPU-enabled (NVIDIA CUDA):**
```powershell
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### 3. Verify Installation

```powershell
python -c "import chromadb; import sentence_transformers; import keybert; print('✅ All RAG dependencies installed!')"
```

---

## First-Time Model Download

The embedding models will download automatically on first use (~300MB-1GB depending on model):

- **nomic-embed-text-v1.5** (default): ~1GB
- **bge-large**: ~1.3GB
- **bge-base**: ~430MB
- **minilm** (lightweight): ~90MB

Models are cached in `~/.cache/huggingface/` for reuse.

---

## Configuration

### Environment Variables (Optional)

Create a `.env` file or set these in `utils/config.py`:

```bash
# Embedding model selection
EMBEDDING_MODEL=nomic-embed-text-v1.5

# Chunking parameters
CHUNK_SIZE=1000
CHUNK_OVERLAP=150

# Search weights
SEMANTIC_WEIGHT=0.7
LEXICAL_WEIGHT=0.3

# Paths
VECTOR_STORE_PATH=./data/vector_store
KEYWORD_INDEX_PATH=./data/keyword_index

# Features
USE_OCR=false
RESPECT_DOC_STRUCTURE=true
EXTRACT_KEYWORDS=true
```

---

## 🎯 Quick Test

### Start the Server

```powershell
python main.py
```

### Run Example Script

```powershell
python example_rag_usage.py
```

### Test via API

```powershell
# Check health
Invoke-RestMethod http://localhost:8000/rag/health

# Get statistics
Invoke-RestMethod http://localhost:8000/rag/stats
```

---

## 📦 New Python Packages

The following packages were added to `requirements.txt`:

### Document Processing
- **docling==1.16.2**: Structure-aware document extraction
- **docling-core==1.8.1**: Core Docling functionality
- **pypdf2==3.0.1**: PDF parsing fallback
- **python-docx==1.1.0**: DOCX extraction
- **python-pptx==0.6.23**: PowerPoint extraction
- **beautifulsoup4==4.12.3**: HTML parsing
- **lxml==5.1.0**: XML/HTML processing

### Embeddings & ML
- **sentence-transformers==2.3.1**: State-of-the-art embedding models
- **chromadb==0.4.22**: Vector database with persistence
- **keybert==0.8.4**: Semantic keyword extraction
- **spacy==3.7.2**: NLP toolkit for text processing
- **nltk==3.8.1**: Natural language processing

### Text Processing
- **langchain==0.1.4**: LangChain framework
- **langchain-text-splitters==0.0.1**: Smart text chunking

### Search
- **whoosh==2.7.4**: Full-text search and BM25 ranking

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Module Not Found Errors

```powershell
# Reinstall all dependencies
pip install --force-reinstall -r requirements.txt
```

#### 2. SpaCy Model Missing

```powershell
python -m spacy download en_core_web_sm
```

#### 3. ChromaDB Permission Issues

```powershell
# Delete and recreate data directory
Remove-Item -Recurse -Force ./data/vector_store
mkdir ./data/vector_store
```

#### 4. Out of Memory with Large Models

Switch to a lighter embedding model in `utils/config.py`:

```python
embedding_model = "minilm"  # Smallest, fastest option
```

#### 5. Slow First Ingestion

The first document ingestion downloads the embedding model. Subsequent ingestions are much faster.

#### 6. Import Errors for Docling

Docling has fallback parsers. If it fails to import, the system uses PyPDF2, python-docx, etc.

---

## 📊 System Requirements

### Minimum
- **RAM**: 4GB (8GB recommended)
- **Disk**: 5GB free (for models and data)
- **CPU**: Multi-core processor

### Recommended
- **RAM**: 16GB+ (for large documents and bge-large model)
- **GPU**: NVIDIA GPU with CUDA (optional, for faster embeddings)
- **Disk**: SSD for better performance

---

## 🔄 Updating

To update the RAG system:

```powershell
# Pull latest code
git pull

# Update dependencies
pip install --upgrade -r requirements.txt

# Restart server
python main.py
```

---

## 🎓 Next Steps

1. **Read the complete guide**: `RAG_SYSTEM_GUIDE.md`
2. **Run the example**: `python example_rag_usage.py`
3. **Explore API docs**: http://localhost:8000/docs
4. **Ingest your first document**: See guide for examples

---

## 📞 Support

For issues or questions:
1. Check `RAG_SYSTEM_GUIDE.md` for detailed documentation
2. Review troubleshooting section above
3. Check logs for error details

---

## ✅ Installation Complete!

Your enterprise RAG system is ready to use. Start the server and visit the API docs:

```powershell
python main.py
# Open: http://localhost:8000/docs
```
