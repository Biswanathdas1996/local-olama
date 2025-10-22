# 🎯 RAG System Quick Reference

## Installation
```powershell
pip install -r requirements.txt
python -m spacy download en_core_web_sm
python main.py
```

## API Endpoints

### Health Check
```bash
GET /rag/health
```

### Ingest Document
```bash
POST /rag/ingest-doc
Form Data: file, index_name
```

### Search
```bash
GET /rag/search?query=...&index_name=...&top_k=5&search_type=hybrid
```

### List Indices
```bash
GET /rag/indices
```

### Statistics
```bash
GET /rag/stats
```

### Delete Index
```bash
DELETE /rag/indices/{index_name}
```

---

## PowerShell Examples

### Health Check
```powershell
Invoke-RestMethod http://localhost:8000/rag/health
```

### Ingest
```powershell
$form = @{
    file = Get-Item "document.pdf"
    index_name = "my_docs"
}
Invoke-RestMethod -Uri http://localhost:8000/rag/ingest-doc -Method Post -Form $form
```

### Search
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/rag/search" -Body @{
    query = "search query"
    index_name = "my_docs"
    top_k = 5
}
```

---

## Python Examples

### Ingest
```python
import requests

with open('document.pdf', 'rb') as f:
    files = {'file': f}
    data = {'index_name': 'my_docs'}
    r = requests.post('http://localhost:8000/rag/ingest-doc', files=files, data=data)
    print(r.json())
```

### Search
```python
r = requests.get('http://localhost:8000/rag/search', params={
    'query': 'search query',
    'index_name': 'my_docs',
    'top_k': 5,
    'search_type': 'hybrid'
})
print(r.json())
```

---

## Configuration (utils/config.py)

### Embedding Models
- `nomic-embed-text-v1.5` (default, best balance)
- `bge-large` (highest accuracy, slower)
- `bge-base` (good balance)
- `minilm` (fastest, lightweight)

### Key Settings
```python
embedding_model = "nomic-embed-text-v1.5"
chunk_size = 1000              # tokens
chunk_overlap = 150            # tokens
semantic_weight = 0.7          # hybrid search
lexical_weight = 0.3           # hybrid search
default_top_k = 10             # results
```

---

## Supported Formats
- PDF (`.pdf`)
- Word Documents (`.docx`)
- PowerPoint (`.pptx`)
- Plain Text (`.txt`)
- HTML (`.html`, `.htm`)

---

## Search Types

### `hybrid` (default)
Combines semantic + lexical for best results

### `semantic`
Vector similarity only (deep understanding)

### `lexical`
Keyword matching only (BM25)

---

## Performance Tips

### Use GPU
```powershell
pip install torch --index-url https://download.pytorch.org/whl/cu118
```

### Lighter Model
```python
embedding_model = "minilm"  # Fast, 384d
```

### Batch Processing
Ingest multiple documents at once for efficiency

---

## Troubleshooting

### SpaCy Missing
```powershell
python -m spacy download en_core_web_sm
```

### ChromaDB Reset
```powershell
Remove-Item -Recurse -Force ./data/vector_store/*
```

### Memory Issues
Use lighter model: `embedding_model = "minilm"`

---

## Quick Start Checklist

- [ ] Install dependencies
- [ ] Download SpaCy model
- [ ] Start server (`python main.py`)
- [ ] Check health (`/rag/health`)
- [ ] Ingest first document
- [ ] Test search
- [ ] Review results

---

## Links

- Full Guide: `RAG_SYSTEM_GUIDE.md`
- Installation: `RAG_INSTALLATION.md`
- Examples: `example_rag_usage.py`
- API Docs: http://localhost:8000/docs
