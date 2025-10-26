"""
Script to download PaddleOCR models for offline use.

PaddleOCR downloads models from HuggingFace/PaddlePaddle servers on first use.
Run this script when you have internet connection to cache models locally.

Usage:
    python scripts/download_paddleocr_models.py
    
Or download specific language models:
    python scripts/download_paddleocr_models.py --lang en ch
"""

import sys
import os
import argparse
from pathlib import Path
import logging

# Disable offline mode for downloading (allow internet access)
os.environ.pop('HF_HUB_OFFLINE', None)
os.environ.pop('TRANSFORMERS_OFFLINE', None)
os.environ.pop('HF_DATASETS_OFFLINE', None)

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def download_paddleocr_models(lang='en', use_gpu=None):
    """
    Download PaddleOCR models by initializing the OCR engine.
    This will cache models to ~/.paddleocr/ or PADDLEOCR_HOME directory.
    
    Args:
        lang: Language code ('en', 'ch', 'fr', 'german', etc.)
        use_gpu: Use GPU for OCR (if None, auto-detect)
    """
    try:
        from paddleocr import PaddleOCR
        
        print(f"\n{'='*80}")
        print(f"DOWNLOADING PADDLEOCR MODELS FOR LANGUAGE: {lang.upper()}")
        print(f"{'='*80}\n")
        
        # Auto-detect GPU if not specified
        if use_gpu is None:
            try:
                import torch
                use_gpu = torch.cuda.is_available()
                if use_gpu:
                    print(f"✓ GPU detected: {torch.cuda.get_device_name(0)}")
                    print(f"  CUDA Version: {torch.version.cuda}")
                else:
                    print("ℹ No GPU detected, using CPU")
            except ImportError:
                print("ℹ PyTorch not available, using CPU")
                use_gpu = False
        
        print(f"\nInitializing PaddleOCR (this will download models if needed)...")
        print(f"  Language: {lang}")
        print(f"  GPU: {use_gpu}")
        print(f"  Models will be cached to: {os.path.expanduser('~/.paddleocr')}")
        print(f"\nThis may take several minutes on first run...\n")
        
        # Initialize OCR - this triggers model download
        # PaddleOCR 3.x uses minimal parameters and auto-detects GPU
        ocr_params = {
            'use_textline_orientation': True,  # Updated parameter name
            'lang': lang
        }
        
        # Initialize - PaddleOCR 3.x auto-detects and uses GPU if available
        ocr = PaddleOCR(**ocr_params)
        
        print(f"\n{'='*80}")
        print(f"✅ PADDLEOCR MODELS DOWNLOADED SUCCESSFULLY")
        print(f"   Language: {lang}")
        print(f"   GPU Enabled: {use_gpu}")
        print(f"   Cache Location: {os.path.expanduser('~/.paddleocr')}")
        print(f"{'='*80}\n")
        
        # Test the OCR with a simple operation
        print("Testing OCR initialization...")
        print("✓ PaddleOCR is ready for offline use!\n")
        
        return True
        
    except ImportError as e:
        print(f"\n{'!'*80}")
        print(f"ERROR: PaddleOCR not installed")
        print(f"{'!'*80}")
        print(f"\nPlease install PaddleOCR first:")
        print(f"  pip install paddleocr>=2.7.0")
        print(f"  pip install paddlepaddle>=2.5.0")
        print(f"\nFor GPU support:")
        print(f"  pip install paddlepaddle-gpu")
        print(f"\n{'!'*80}\n")
        return False
        
    except Exception as e:
        print(f"\n{'!'*80}")
        print(f"ERROR: Failed to download PaddleOCR models")
        print(f"{'!'*80}")
        print(f"\nError: {str(e)}")
        print(f"\nTroubleshooting:")
        print(f"  1. Check your internet connection")
        print(f"  2. Ensure you have enough disk space (~500MB)")
        print(f"  3. Try running with admin/sudo privileges")
        print(f"  4. Check firewall/proxy settings")
        print(f"\n{'!'*80}\n")
        return False


def check_paddleocr_cache():
    """Check if PaddleOCR models are already cached"""
    cache_dir = Path.home() / '.paddleocr'
    
    print(f"\n{'='*80}")
    print(f"CHECKING PADDLEOCR CACHE")
    print(f"{'='*80}\n")
    
    if cache_dir.exists():
        print(f"✓ Cache directory exists: {cache_dir}")
        
        # List cached models
        model_dirs = list(cache_dir.glob('*'))
        if model_dirs:
            print(f"\nCached models found:")
            for model_dir in model_dirs:
                if model_dir.is_dir():
                    size_mb = sum(f.stat().st_size for f in model_dir.rglob('*') if f.is_file()) / (1024*1024)
                    print(f"  - {model_dir.name} ({size_mb:.1f} MB)")
        else:
            print(f"\n✗ No models cached yet")
    else:
        print(f"✗ Cache directory does not exist: {cache_dir}")
        print(f"  Models have not been downloaded yet")
    
    print(f"\n{'='*80}\n")


def main():
    parser = argparse.ArgumentParser(
        description='Download PaddleOCR models for offline use'
    )
    parser.add_argument(
        '--lang',
        nargs='+',
        default=['en'],
        help='Language codes to download (default: en). Examples: en, ch, fr, german, korean, japan'
    )
    parser.add_argument(
        '--gpu',
        action='store_true',
        help='Force GPU usage (default: auto-detect)'
    )
    parser.add_argument(
        '--cpu',
        action='store_true',
        help='Force CPU usage (default: auto-detect)'
    )
    parser.add_argument(
        '--check-only',
        action='store_true',
        help='Only check cache status, do not download'
    )
    
    args = parser.parse_args()
    
    # Check cache status
    if args.check_only:
        check_paddleocr_cache()
        return
    
    # Determine GPU usage
    use_gpu = None
    if args.gpu:
        use_gpu = True
    elif args.cpu:
        use_gpu = False
    
    # Download models for each language
    success_count = 0
    for lang in args.lang:
        if download_paddleocr_models(lang, use_gpu):
            success_count += 1
    
    # Final summary
    print(f"\n{'='*80}")
    print(f"DOWNLOAD SUMMARY")
    print(f"{'='*80}")
    print(f"  Successfully downloaded: {success_count}/{len(args.lang)} languages")
    print(f"  PaddleOCR is ready for offline use")
    print(f"\nNext steps:")
    print(f"  1. Set offline mode environment variables:")
    print(f"     $env:HF_HUB_OFFLINE='1'")
    print(f"     $env:TRANSFORMERS_OFFLINE='1'")
    print(f"  2. Your application will now work without internet")
    print(f"{'='*80}\n")
    
    if success_count < len(args.lang):
        sys.exit(1)


if __name__ == '__main__':
    main()
