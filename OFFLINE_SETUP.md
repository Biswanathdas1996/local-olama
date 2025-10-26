# Offline Setup Guide

This guide explains how to set up and use embedding models **without internet connection**.

## Prerequisites

1. **Install dependencies** (requires internet, one-time):
   ```powershell
   pip install -r requirements.txt
   ```

## Step 1: Download Models (Requires Internet - One Time Only)

When you have internet connection, download the embedding models and PaddleOCR models to cache them locally:

### A. Download Embedding Models

#### Option A: Download All Recommended Models
```powershell
python scripts/download_embedding_models.py
```

This downloads:
- `minilm` - Fast, lightweight (384d)
- `nomic-embed-text-v1.5` - Best balance (768d) 
- `bge-base` - Good accuracy (768d)

#### Option B: Download Specific Models
```powershell
# Download only lightweight model
python scripts/download_embedding_models.py --models minilm

# Download multiple specific models
python scripts/download_embedding_models.py --models minilm nomic-embed-text-v1.5
```

#### Option C: List Available Models
```powershell
python scripts/download_embedding_models.py --list-available
```

#### Option D: Check What's Already Cached
```powershell
python scripts/download_embedding_models.py --check-only
```

### B. Download PaddleOCR Models (For Image Processing)

Download PaddleOCR models for text extraction from images:

```powershell
# Download English models (default)
python scripts/download_paddleocr_models.py

# Download multiple languages
python scripts/download_paddleocr_models.py --lang en ch

# Check if models are cached
python scripts/download_paddleocr_models.py --check-only
```

**Note**: PaddleOCR models are ~500MB and required for processing images in PDFs/documents.

See [PADDLEOCR_SETUP.md](PADDLEOCR_SETUP.md) for detailed PaddleOCR configuration.

## Step 2: Use Offline Mode

Once models are downloaded, they will be used automatically in offline mode. The embedder now defaults to `local_files_only=True`.

### Python Code Example

```python
from core.embedder import get_embedder

# This will use locally cached models (no internet required)
embedder = get_embedder(model_name='nomic-embed-text-v1.5')

# Generate embeddings
text = "Hello, world!"
embedding = embedder.embed_text(text)
print(f"Embedding shape: {embedding.shape}")
```

### Force Online Mode (if needed)

If you want to allow internet downloads:

```python
from core.embedder import LocalEmbedder

embedder = LocalEmbedder(
    model_name='nomic-embed-text-v1.5',
    local_files_only=False  # Allow internet downloads
)
```

## Troubleshooting

### Error: Model not found in cache (Embedding Models)

If you get this error:
```
Failed to load model nomic-ai/nomic-embed-text-v1.5
Model not found in cache
```

**Solution**: Download the models first:
```powershell
python scripts/download_embedding_models.py
```

### Error: PaddleOCR models downloading in offline mode

If you see errors about downloading PaddleOCR models when offline:
```
Cannot find an appropriate cached snapshot folder for the specified revision
```

**Solution**: Download PaddleOCR models first:
```powershell
python scripts/download_paddleocr_models.py
```

**Verify cache**:
```powershell
python scripts/download_paddleocr_models.py --check-only
```

### Error: No module named 'einops'

**Solution**: Install einops dependency:
```powershell
pip install einops
```

Or reinstall all dependencies:
```powershell
pip install -r requirements.txt
```

### Check Cache Locations

**Embedding models** are cached in: `models/embeddings/`

To check what's cached:
```powershell
python scripts/download_embedding_models.py --check-only
```

**PaddleOCR models** are cached in: `~/.paddlex/official_models/` (Windows: `C:\Users\<USERNAME>\.paddlex\`)

To check what's cached:
```powershell
python scripts/download_paddleocr_models.py --check-only
```

### Custom Cache Location

To use a custom cache folder:

```python
from core.embedder import LocalEmbedder

embedder = LocalEmbedder(
    model_name='minilm',
    cache_folder='D:/my_models/'  # Custom location
)
```

Or when downloading:
```powershell
python scripts/download_embedding_models.py --cache-folder D:/my_models/
```

## Model Comparison

| Model ID | Name | Dimension | Speed | Accuracy | Size |
|----------|------|-----------|-------|----------|------|
| `minilm` | all-MiniLM-L6-v2 | 384 | ⚡⚡⚡ | ⭐⭐ | ~90 MB |
| `nomic-embed-text-v1.5` | nomic-ai/nomic-embed-text-v1.5 | 768 | ⚡⚡ | ⭐⭐⭐ | ~550 MB |
| `bge-base` | BAAI/bge-base-en-v1.5 | 768 | ⚡⚡ | ⭐⭐⭐ | ~440 MB |
| `bge-large` | BAAI/bge-large-en-v1.5 | 1024 | ⚡ | ⭐⭐⭐⭐ | ~1.3 GB |
| `mpnet` | all-mpnet-base-v2 | 768 | ⚡⚡ | ⭐⭐⭐ | ~420 MB |

**Recommended**: `nomic-embed-text-v1.5` for best balance of speed and accuracy.

## Using in Production (Offline)

Once models are cached, your application works completely offline:

1. ✅ No internet connection required
2. ✅ Fast loading from local cache
3. ✅ Consistent performance
4. ✅ No external API dependencies

## Transferring Models to Another Machine

To use models on a machine without internet:

1. **On machine with internet**:
   ```powershell
   python scripts/download_embedding_models.py
   ```

2. **Copy the cache folder**:
   Copy `models/embeddings/` directory to the offline machine

3. **On offline machine**:
   Place the copied folder in the same location: `models/embeddings/`

That's it! The offline machine can now use the models.
