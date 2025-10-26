"""
Complete offline setup script - downloads all required models.

This script downloads:
1. Embedding models (sentence transformers)
2. Docling models (document processing)
3. PaddleOCR models (image text extraction)

Run this once with internet connection, then your app works offline.

Usage:
    python scripts/download_all_models.py
    
Or skip specific models:
    python scripts/download_all_models.py --skip-paddleocr
    python scripts/download_all_models.py --skip-embeddings
"""

import sys
import os
from pathlib import Path
import argparse

# Disable offline mode for downloading
os.environ.pop('HF_HUB_OFFLINE', None)
os.environ.pop('TRANSFORMERS_OFFLINE', None)
os.environ.pop('HF_DATASETS_OFFLINE', None)

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))


def download_all_models(skip_embeddings=False, skip_docling=False, skip_paddleocr=False):
    """Download all models required for offline operation"""
    
    print(f"\n{'='*80}")
    print(f"COMPLETE OFFLINE SETUP")
    print(f"{'='*80}")
    print(f"This will download all required models for offline operation.")
    print(f"Total download size: ~2-3 GB")
    print(f"This may take 10-30 minutes depending on your internet speed.")
    print(f"{'='*80}\n")
    
    failed_steps = []
    
    # Step 1: Download embedding models
    if not skip_embeddings:
        print(f"\n{'='*80}")
        print(f"STEP 1/3: DOWNLOADING EMBEDDING MODELS")
        print(f"{'='*80}\n")
        try:
            from download_embedding_models import download_models
            download_models(['minilm'])  # Default to reliable lightweight model
            print(f"\n✅ Embedding models downloaded successfully\n")
        except Exception as e:
            print(f"\n❌ Failed to download embedding models: {e}\n")
            failed_steps.append("Embedding models")
    else:
        print(f"\nℹ Skipping embedding models (--skip-embeddings)\n")
    
    # Step 2: Download Docling models
    if not skip_docling:
        print(f"\n{'='*80}")
        print(f"STEP 2/3: DOWNLOADING DOCLING MODELS")
        print(f"{'='*80}\n")
        try:
            from download_docling_models import download_docling_models
            download_docling_models()
            print(f"\n✅ Docling models downloaded successfully\n")
        except Exception as e:
            print(f"\n❌ Failed to download Docling models: {e}\n")
            failed_steps.append("Docling models")
    else:
        print(f"\nℹ Skipping Docling models (--skip-docling)\n")
    
    # Step 3: Download PaddleOCR models
    if not skip_paddleocr:
        print(f"\n{'='*80}")
        print(f"STEP 3/3: DOWNLOADING PADDLEOCR MODELS")
        print(f"{'='*80}\n")
        try:
            from download_paddleocr_models import download_paddleocr_models
            download_paddleocr_models(lang='en')
            print(f"\n✅ PaddleOCR models downloaded successfully\n")
        except Exception as e:
            print(f"\n❌ Failed to download PaddleOCR models: {e}\n")
            failed_steps.append("PaddleOCR models")
    else:
        print(f"\nℹ Skipping PaddleOCR models (--skip-paddleocr)\n")
    
    # Summary
    print(f"\n{'='*80}")
    print(f"SETUP SUMMARY")
    print(f"{'='*80}\n")
    
    if failed_steps:
        print(f"⚠️  Some models failed to download:")
        for step in failed_steps:
            print(f"   - {step}")
        print(f"\nPlease try downloading them individually:")
        if "Embedding models" in failed_steps:
            print(f"   python scripts/download_embedding_models.py")
        if "Docling models" in failed_steps:
            print(f"   python scripts/download_docling_models.py")
        if "PaddleOCR models" in failed_steps:
            print(f"   python scripts/download_paddleocr_models.py")
        print(f"\n{'='*80}\n")
        return False
    else:
        print(f"✅ ALL MODELS DOWNLOADED SUCCESSFULLY!")
        print(f"\nYour application is now ready for OFFLINE use.")
        print(f"\nTo verify, run:")
        print(f"   python scripts/verify_offline_setup.py")
        print(f"\nTo use offline mode, set these environment variables:")
        print(f"   $env:HF_HUB_OFFLINE='1'")
        print(f"   $env:TRANSFORMERS_OFFLINE='1'")
        print(f"\n{'='*80}\n")
        return True


def main():
    parser = argparse.ArgumentParser(
        description='Download all models for complete offline setup'
    )
    parser.add_argument(
        '--skip-embeddings',
        action='store_true',
        help='Skip downloading embedding models'
    )
    parser.add_argument(
        '--skip-docling',
        action='store_true',
        help='Skip downloading Docling models'
    )
    parser.add_argument(
        '--skip-paddleocr',
        action='store_true',
        help='Skip downloading PaddleOCR models'
    )
    
    args = parser.parse_args()
    
    success = download_all_models(
        skip_embeddings=args.skip_embeddings,
        skip_docling=args.skip_docling,
        skip_paddleocr=args.skip_paddleocr
    )
    
    if not success:
        sys.exit(1)


if __name__ == '__main__':
    main()
