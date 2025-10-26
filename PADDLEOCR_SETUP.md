# PaddleOCR Setup for Offline Use

## Overview

PaddleOCR is used for extracting text from images in documents. The models must be downloaded before using the application in offline mode.

## Setup Steps

### 1. Download PaddleOCR Models (One-time setup)

Run this script when you have internet connection:

```powershell
python scripts/download_paddleocr_models.py
```

This will download and cache models (~500MB) to:
- Windows: `C:\Users\<USERNAME>\.paddlex\official_models\`
- Linux/Mac: `~/.paddlex/official_models/`

### 2. Downloaded Models

The following models will be cached:
- **PP-LCNet_x1_0_doc_ori** - Document orientation classifier
- **UVDoc** - Document unwarping model
- **PP-LCNet_x1_0_textline_ori** - Text line orientation
- **PP-OCRv5_server_det** - Text detection model
- **en_PP-OCRv5_mobile_rec** - English text recognition model

### 3. Verify Installation

Check if models are cached:

```powershell
python scripts/download_paddleocr_models.py --check-only
```

### 4. Download Additional Languages (Optional)

To download models for other languages:

```powershell
# Chinese
python scripts/download_paddleocr_models.py --lang ch

# Multiple languages
python scripts/download_paddleocr_models.py --lang en ch fr
```

Available languages:
- `en` - English
- `ch` - Chinese
- `fr` - French
- `german` - German
- `korean` - Korean
- `japan` - Japanese
- And more...

## Offline Mode

After downloading, the application will work offline when these environment variables are set:

```powershell
$env:HF_HUB_OFFLINE='1'
$env:TRANSFORMERS_OFFLINE='1'
```

## Troubleshooting

### Models Keep Re-downloading

If models keep downloading on each run:
1. Check cache directory exists: `~/.paddlex/official_models/`
2. Ensure you have write permissions
3. Verify models were fully downloaded (check file sizes)

### Offline Mode Fails

If you get errors about missing models in offline mode:
1. Ensure you ran the download script with internet first
2. Check the cache directory contains model files
3. Try re-downloading: delete cache and run download script again

### GPU Not Detected

PaddleOCR 3.x auto-detects GPU. To verify:
- Check PyTorch CUDA is installed: `python -c "import torch; print(torch.cuda.is_available())"`
- If False, PaddleOCR will use CPU (still works, just slower)

## Technical Details

### API Changes (PaddleOCR 3.x)

Recent versions use updated parameters:
- ✅ `use_textline_orientation` (new)
- ❌ `use_angle_cls` (deprecated)
- ❌ `use_gpu` (removed - auto-detects)

### Model Storage

Models are stored in:
```
~/.paddlex/official_models/
├── PP-LCNet_x1_0_doc_ori/
├── UVDoc/
├── PP-LCNet_x1_0_textline_ori/
├── PP-OCRv5_server_det/
└── en_PP-OCRv5_mobile_rec/
```

Each model directory contains:
- `inference.pdmodel` - Model structure
- `inference.pdiparams` - Model weights
- Configuration files

## Quick Start Checklist

- [ ] Install PaddleOCR: `pip install paddleocr>=2.7.0`
- [ ] Install PaddlePaddle: `pip install paddlepaddle>=2.5.0`
- [ ] Download models: `python scripts/download_paddleocr_models.py`
- [ ] Verify cache: `python scripts/download_paddleocr_models.py --check-only`
- [ ] Test offline: Set `HF_HUB_OFFLINE=1` and run your application

## See Also

- [PaddleOCR Documentation](https://github.com/PaddlePaddle/PaddleOCR)
- [Image Processing Implementation](IMAGE_PROCESSING_IMPLEMENTATION.md)
- [Offline Setup Guide](OFFLINE_SETUP.md)
