# Embedding Model Setup

## Current Configuration

The application is now configured to use a **single local embedding model** for all embedding and retrieval operations in **complete offline mode**.

### Model Details
- **Model**: `all-MiniLM-L6-v2` (via `minilm` identifier)
- **Dimension**: 384
- **Advantages**: 
  - Lightweight and fast
  - Reliable offline operation
  - Good balance of speed and accuracy
  - Small download size (~91MB)
  - Works with sentence-transformers 2.3.1+

### Offline Mode Configuration

The application uses **three layers of offline enforcement** to ensure no internet access is required:

1. **Environment Variables** (Set in `.env` and enforced in `main.py`):
   ```
   HF_HUB_OFFLINE=1
   TRANSFORMERS_OFFLINE=1
   HF_DATASETS_OFFLINE=1
   ```

2. **Application Settings** (`.env` file):
   ```
   EMBEDDING_MODEL=minilm
   EMBEDDING_LOCAL_ONLY=True
   ```

3. **Startup Script**: `scripts/start.ps1` automatically sets offline mode environment variables.

### Why Environment Variables are Critical

The `sentence-transformers` library version 2.3.1 doesn't fully respect the `local_files_only` parameter. Setting these environment variables **before any imports** forces the Hugging Face libraries to use only cached models:

- `HF_HUB_OFFLINE=1` - Disables all HuggingFace Hub access
- `TRANSFORMERS_OFFLINE=1` - Forces transformers library offline
- `HF_DATASETS_OFFLINE=1` - Forces datasets library offline

### Configuration Files

1. **`.env`** - Environment variables:
   ```
   EMBEDDING_MODEL=minilm
   EMBEDDING_LOCAL_ONLY=True
   ```

2. **`utils/config.py`** - Default settings:
   ```python
   embedding_model: str = "minilm"
   embedding_local_only: bool = True
   ```

### Model Location
Models are cached in: `./models/embeddings/`

The model uses Hugging Face's cache format and is stored in:
```
./models/embeddings/models--sentence-transformers--all-MiniLM-L6-v2/
```

## Usage

### Starting the Application (Recommended)

**Use the provided startup script** which automatically sets offline mode:
```powershell
.\scripts\start.ps1
```

This script:
- ✅ Sets all offline environment variables
- ✅ Checks Python and Ollama installation
- ✅ Activates virtual environment
- ✅ Installs dependencies
- ✅ Starts the server

### Manual Start (Alternative)

If starting manually, **always set environment variables first**:
```powershell
$env:HF_HUB_OFFLINE = "1"
$env:TRANSFORMERS_OFFLINE = "1"
$env:HF_DATASETS_OFFLINE = "1"
python main.py
```

### Check Model Status
```bash
python scripts/download_embedding_models.py --check-only
```

### Download/Re-download Model
```bash
python scripts/download_embedding_models.py
```

### Download Different Models (Optional)
```bash
# Download specific models
python scripts/download_embedding_models.py --models minilm nomic-embed-text-v1.5

# List available models
python scripts/download_embedding_models.py --list-available
```

## How It Works

1. **Embedding Generation**: When documents are ingested, the `get_embedder()` function loads the MiniLM model from local cache and generates embeddings.

2. **Query Embedding**: When searching, the same model generates query embeddings for consistency.

3. **Offline Mode**: With `embedding_local_only=True`, the model only uses cached files and won't attempt to download anything.

4. **Singleton Pattern**: The embedder uses a singleton pattern, so the model is loaded once and reused across all requests for efficiency.

## Consistency Guarantee

✅ **Same model for embedding and retrieval**: The application uses `get_embedder()` everywhere, ensuring:
- Document ingestion uses MiniLM
- Query embedding uses MiniLM
- All vector operations use the same 384-dimensional embeddings
- No dimension mismatch errors

## Troubleshooting

### If model loading fails:
1. Check if model is downloaded:
   ```bash
   python scripts/download_embedding_models.py --check-only
   ```

2. Re-download if needed:
   ```bash
   python scripts/download_embedding_models.py
   ```

3. Check logs for specific errors

### To use a different model:
1. Edit `.env`:
   ```
   EMBEDDING_MODEL=mpnet  # or bge-base, nomic-embed-text-v1.5
   ```

2. Download the new model:
   ```bash
   python scripts/download_embedding_models.py --models mpnet
   ```

3. Restart the application

**Note**: Changing models requires re-ingesting all documents because different models produce different embedding dimensions and representations.

## Available Models

| Identifier | Model Name | Dimension | Best For |
|------------|-----------|-----------|----------|
| `minilm` (current) | all-MiniLM-L6-v2 | 384 | Speed, reliability, offline |
| `mpnet` | all-mpnet-base-v2 | 768 | Better accuracy |
| `nomic-embed-text-v1.5` | nomic-ai/nomic-embed-text-v1.5 | 768 | Best balance |
| `bge-base` | BAAI/bge-base-en-v1.5 | 768 | High accuracy |
| `bge-large` | BAAI/bge-large-en-v1.5 | 1024 | Highest accuracy |

## Version Compatibility

The code automatically detects the version of `sentence-transformers` and adjusts accordingly:
- **v2.3.1** (current): Works without `local_files_only` parameter
- **v2.4.0+**: Full offline mode support with `local_files_only` parameter

To upgrade for better offline support:
```bash
pip install --upgrade sentence-transformers
```
