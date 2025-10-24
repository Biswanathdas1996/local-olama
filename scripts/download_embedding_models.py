"""
Script to download embedding models for offline use.

Run this script when you have internet connection to cache models locally.
After running this, your application will work without internet.

Usage:
    python scripts/download_embedding_models.py
    
Or download specific models:
    python scripts/download_embedding_models.py --models minilm nomic-embed-text-v1.5
"""

import sys
import os
import argparse
from pathlib import Path

# Disable offline mode for downloading (allow internet access)
os.environ.pop('HF_HUB_OFFLINE', None)
os.environ.pop('TRANSFORMERS_OFFLINE', None)
os.environ.pop('HF_DATASETS_OFFLINE', None)

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.embedder import download_models, check_model_cache, LocalEmbedder


def main():
    parser = argparse.ArgumentParser(
        description='Download embedding models for offline use'
    )
    parser.add_argument(
        '--models',
        nargs='+',
        default=['minilm'],  # Default to lightweight, reliable model
        help='Model identifiers to download (default: minilm for offline reliability)'
    )
    parser.add_argument(
        '--cache-folder',
        type=str,
        default=None,
        help='Custom cache folder path (default: models/embeddings/)'
    )
    parser.add_argument(
        '--check-only',
        action='store_true',
        help='Only check which models are cached, do not download'
    )
    parser.add_argument(
        '--list-available',
        action='store_true',
        help='List all available model identifiers'
    )
    
    args = parser.parse_args()
    
    # List available models
    if args.list_available:
        print("Available model identifiers:")
        for model_id in LocalEmbedder.list_available_models():
            config = LocalEmbedder.MODEL_CONFIGS[model_id]
            print(f"  - {model_id}")
            print(f"    Name: {config['name']}")
            print(f"    Dimension: {config['dimension']}")
            print(f"    Batch size: {config['batch_size']}")
            print()
        return
    
    # Check cache status
    if args.check_only:
        print("Checking model cache...\n")
        status = check_model_cache(args.cache_folder)
        print(f"Cache folder: {status['cache_folder']}")
        print(f"Cache exists: {status['cache_exists']}\n")
        
        if status['models']:
            print("Model status:")
            for model_id, info in status['models'].items():
                cached_status = "✓ CACHED" if info['cached'] else "✗ NOT CACHED"
                print(f"  {model_id}: {cached_status}")
                print(f"    Name: {info['name']}")
                if info['cached']:
                    print(f"    Path: {info['path']}")
                print()
        return
    
    # Download models
    print("=" * 70)
    print("EMBEDDING MODEL DOWNLOADER")
    print("=" * 70)
    print()
    
    # First check what's already cached
    print("Checking current cache status...")
    status = check_model_cache(args.cache_folder)
    print(f"Cache folder: {status['cache_folder']}\n")
    
    if status['models']:
        print("Currently cached models:")
        for model_id, info in status['models'].items():
            if info['cached']:
                print(f"  ✓ {model_id} ({info['name']})")
        print()
    
    # Download models
    try:
        download_models(args.models, args.cache_folder)
        print("\n" + "=" * 70)
        print("SUCCESS! Models are ready for offline use.")
        print("=" * 70)
    except Exception as e:
        print(f"\nERROR: {e}")
        print("\nMake sure you have internet connection and try again.")
        sys.exit(1)


if __name__ == '__main__':
    main()
