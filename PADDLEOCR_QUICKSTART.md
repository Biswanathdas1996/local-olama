# 🚀 Quick Start: PaddleOCR Offline Setup

## Problem Solved

Your PDF processing was failing in offline mode because PaddleOCR was trying to download models from the internet.

**Error you were seeing:**
```
Cannot find an appropriate cached snapshot folder for the specified revision 
on the local disk and outgoing traffic has been disabled.
```

## Solution (3 Steps)

### Step 1: Download PaddleOCR Models (One-Time)

Open PowerShell and run:

```powershell
python scripts/download_paddleocr_models.py
```

This downloads ~500MB of models to your computer. **You only need to do this once.**

### Step 2: Verify Setup

```powershell
python scripts/verify_offline_setup.py
```

Look for:
```
✅ PASS  PaddleOCR Models
✅ PASS  Offline Initialization
```

### Step 3: Use Your Application

Now your application will work offline:

```powershell
$env:HF_HUB_OFFLINE='1'
$env:TRANSFORMERS_OFFLINE='1'
python main.py
```

**That's it!** Your PDFs with images will now process successfully without internet.

## What Changed?

1. ✅ **PaddleOCR models downloaded** - cached locally in `~/.paddlex/`
2. ✅ **Image processor updated** - uses modern PaddleOCR 3.x API
3. ✅ **Works offline** - no more download errors

## Test It

Process your PDF again:

```powershell
# Set offline mode
$env:HF_HUB_OFFLINE='1'
$env:TRANSFORMERS_OFFLINE='1'

# Run backend
python main.py
```

Upload your `annual-report-2024-2025.pdf` - it should now process images without errors!

## Troubleshooting

### "Models keep downloading"
```powershell
# Re-run the download script
python scripts/download_paddleocr_models.py
```

### "Still getting download errors"
```powershell
# Check if models are cached
python scripts/download_paddleocr_models.py --check-only

# You should see:
# ✅ PaddleOCR models cached
```

## More Information

- **Detailed docs**: [PADDLEOCR_OFFLINE_COMPLETE.md](PADDLEOCR_OFFLINE_COMPLETE.md)
- **Configuration**: [PADDLEOCR_SETUP.md](PADDLEOCR_SETUP.md)
- **Full offline setup**: [OFFLINE_SETUP.md](OFFLINE_SETUP.md)

---

**Status**: ✅ Ready to use offline!
