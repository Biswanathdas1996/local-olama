"""
Verify offline setup - checks if all required models are cached.

This script verifies that your system is ready for offline operation by checking:
1. Embedding models cache
2. Docling models cache
3. PaddleOCR models cache
4. Can initialize all components in offline mode

Usage:
    python scripts/verify_offline_setup.py
"""

import sys
import os
from pathlib import Path

# Force offline mode for verification
os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'
os.environ['HF_DATASETS_OFFLINE'] = '1'

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))


def check_embedding_models():
    """Check if embedding models are cached"""
    print(f"\n{'='*80}")
    print(f"CHECKING EMBEDDING MODELS")
    print(f"{'='*80}\n")
    
    try:
        from core.embedder import check_model_cache
        status = check_model_cache()
        
        print(f"Cache folder: {status['cache_folder']}")
        print(f"Cache exists: {status['cache_exists']}\n")
        
        if status['models']:
            cached_models = [m for m, info in status['models'].items() if info['cached']]
            if cached_models:
                print(f"✅ Cached embedding models:")
                for model_id in cached_models:
                    print(f"   - {model_id}")
                return True
            else:
                print(f"❌ No embedding models cached")
                print(f"\n   Run: python scripts/download_embedding_models.py")
                return False
        else:
            print(f"❌ No models found")
            return False
            
    except Exception as e:
        print(f"❌ Error checking embedding models: {e}")
        return False


def check_docling_models():
    """Check if Docling models are cached"""
    print(f"\n{'='*80}")
    print(f"CHECKING DOCLING MODELS")
    print(f"{'='*80}\n")
    
    try:
        # Check HuggingFace cache for docling models
        cache_dir = Path.home() / '.cache' / 'huggingface' / 'hub'
        
        if not cache_dir.exists():
            print(f"❌ HuggingFace cache directory not found: {cache_dir}")
            print(f"\n   Run: python scripts/download_docling_models.py")
            return False
        
        # Find docling/IBM models
        docling_models = list(cache_dir.glob('models--*docling*')) + list(cache_dir.glob('models--*ibm*'))
        
        if docling_models:
            print(f"✅ Docling models cached:")
            for model in docling_models:
                model_name = model.name.replace('models--', '').replace('--', '/')
                print(f"   - {model_name}")
            print(f"\n   Cache location: {cache_dir}")
            return True
        else:
            print(f"❌ No Docling models found in cache")
            print(f"   Cache location: {cache_dir}")
            print(f"\n   Run: python scripts/download_docling_models.py")
            return False
            
    except Exception as e:
        print(f"❌ Error checking Docling models: {e}")
        return False


def check_paddleocr_models():
    """Check if PaddleOCR models are cached"""
    print(f"\n{'='*80}")
    print(f"CHECKING PADDLEOCR MODELS")
    print(f"{'='*80}\n")
    
    cache_dir = Path.home() / '.paddlex' / 'official_models'
    
    if cache_dir.exists():
        model_dirs = list(cache_dir.glob('*'))
        if model_dirs:
            print(f"✅ PaddleOCR models cached:")
            for model_dir in model_dirs:
                if model_dir.is_dir():
                    print(f"   - {model_dir.name}")
            print(f"\n   Cache location: {cache_dir}")
            return True
        else:
            print(f"❌ No PaddleOCR models found")
            print(f"\n   Run: python scripts/download_paddleocr_models.py")
            return False
    else:
        print(f"❌ PaddleOCR cache directory does not exist")
        print(f"   Expected: {cache_dir}")
        print(f"\n   Run: python scripts/download_paddleocr_models.py")
        return False


def test_offline_initialization():
    """Test if all components can initialize in offline mode"""
    print(f"\n{'='*80}")
    print(f"TESTING OFFLINE INITIALIZATION")
    print(f"{'='*80}\n")
    
    results = {}
    
    # Test embedder
    print("Testing embedder...")
    try:
        from core.embedder import get_embedder
        embedder = get_embedder()
        print(f"✅ Embedder initialized successfully")
        results['embedder'] = True
    except Exception as e:
        print(f"❌ Embedder failed: {e}")
        results['embedder'] = False
    
    # Test document extractor
    print("\nTesting document extractor...")
    try:
        from core.doc_extractor import DocumentExtractor
        extractor = DocumentExtractor()
        print(f"✅ Document extractor initialized successfully")
        results['doc_extractor'] = True
    except Exception as e:
        print(f"❌ Document extractor failed: {e}")
        results['doc_extractor'] = False
    
    # Test image processor
    print("\nTesting image processor...")
    try:
        from core.image_processor import get_image_processor
        processor = get_image_processor()
        print(f"✅ Image processor initialized successfully")
        results['image_processor'] = True
    except Exception as e:
        print(f"❌ Image processor failed: {e}")
        results['image_processor'] = False
    
    return all(results.values())


def main():
    print(f"\n{'='*80}")
    print(f"OFFLINE SETUP VERIFICATION")
    print(f"{'='*80}")
    print(f"Verifying all components work in OFFLINE mode...")
    print(f"Environment: HF_HUB_OFFLINE={os.environ.get('HF_HUB_OFFLINE')}")
    print(f"{'='*80}\n")
    
    checks = {
        'Embedding Models': check_embedding_models(),
        'Docling Models': check_docling_models(),
        'PaddleOCR Models': check_paddleocr_models(),
    }
    
    # Test initialization
    init_success = test_offline_initialization()
    checks['Offline Initialization'] = init_success
    
    # Summary
    print(f"\n{'='*80}")
    print(f"VERIFICATION SUMMARY")
    print(f"{'='*80}\n")
    
    for check_name, success in checks.items():
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}  {check_name}")
    
    all_passed = all(checks.values())
    
    print(f"\n{'='*80}")
    if all_passed:
        print(f"✅ ALL CHECKS PASSED - OFFLINE SETUP COMPLETE!")
        print(f"\nYour application is ready for offline use.")
        print(f"\nTo use offline mode, set:")
        print(f"   $env:HF_HUB_OFFLINE='1'")
        print(f"   $env:TRANSFORMERS_OFFLINE='1'")
    else:
        print(f"❌ SOME CHECKS FAILED")
        print(f"\nPlease download missing models:")
        if not checks.get('Embedding Models'):
            print(f"   python scripts/download_embedding_models.py")
        if not checks.get('Docling Models'):
            print(f"   python scripts/download_docling_models.py")
        if not checks.get('PaddleOCR Models'):
            print(f"   python scripts/download_paddleocr_models.py")
        print(f"\nOr download all at once:")
        print(f"   python scripts/download_all_models.py")
    print(f"{'='*80}\n")
    
    sys.exit(0 if all_passed else 1)


if __name__ == '__main__':
    main()
