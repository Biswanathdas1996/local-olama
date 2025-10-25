# Docling Offline Setup

## Models Location
- HuggingFace Cache: `C:\Users\daspa\.cache\huggingface`
- Project Backup: `models\docling_models\huggingface_cache`

## To Use Offline

### Option 1: Use HuggingFace Cache (Recommended)
Set these environment variables:
```powershell
$env:TRANSFORMERS_OFFLINE='1'
$env:HF_HUB_OFFLINE='1'
$env:HF_DATASETS_OFFLINE='1'
```

### Option 2: Use Project Backup
Set these environment variables:
```powershell
$env:HF_HOME='models\docling_models\huggingface_cache'
$env:TRANSFORMERS_OFFLINE='1'
$env:HF_HUB_OFFLINE='1'
$env:HF_DATASETS_OFFLINE='1'
```

## Testing Offline Mode
```bash
python -c "from core.doc_extractor import DocumentExtractor; extractor = DocumentExtractor(); print('Offline mode working!' if extractor.converter else 'Failed')"
```

## Model Information
Docling uses the following models:
- Layout detection models (for PDF structure analysis)
- Table extraction models (TableFormer)
- OCR models (if enabled)

These models are downloaded on first use and cached in HuggingFace cache directory.
