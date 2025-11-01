#!/usr/bin/env python3
"""
Check Docling model cache status and offline mode configuration.
"""
import os
import sys
from pathlib import Path

def check_docling_status():
    """Check if Docling models are cached and what mode will be used"""
    
    print("\n" + "="*70)
    print("  Docling Model Cache Status Checker")
    print("="*70 + "\n")
    
    # 1. Check environment variables
    print("📋 Environment Variables:")
    hf_home = os.environ.get('HF_HOME', os.path.join(os.path.expanduser('~'), '.cache', 'huggingface'))
    hf_offline = os.environ.get('HF_HUB_OFFLINE', 'not set')
    transformers_offline = os.environ.get('TRANSFORMERS_OFFLINE', 'not set')
    
    print(f"   HF_HOME: {hf_home}")
    print(f"   HF_HUB_OFFLINE: {hf_offline}")
    print(f"   TRANSFORMERS_OFFLINE: {transformers_offline}\n")
    
    # 2. Check cache directory
    print("📁 Cache Directory:")
    hub_cache = Path(hf_home) / 'hub'
    print(f"   Path: {hub_cache}")
    print(f"   Exists: {'✅ Yes' if hub_cache.exists() else '❌ No'}\n")
    
    # 3. Check for models
    print("🤖 Cached Models:")
    if hub_cache.exists():
        models = list(hub_cache.glob('models--*'))
        if models:
            print(f"   Found {len(models)} model(s):")
            for model_dir in models[:10]:  # Show first 10
                size_mb = sum(f.stat().st_size for f in model_dir.rglob('*') if f.is_file()) / (1024 * 1024)
                print(f"   ✅ {model_dir.name} ({size_mb:.1f} MB)")
            if len(models) > 10:
                print(f"   ... and {len(models) - 10} more")
        else:
            print("   ❌ No models found in cache")
    else:
        print("   ❌ Cache directory does not exist")
    
    print()
    
    # 4. Calculate total cache size
    if hub_cache.exists():
        total_size = sum(f.stat().st_size for f in hub_cache.rglob('*') if f.is_file())
        total_size_mb = total_size / (1024 * 1024)
        total_size_gb = total_size / (1024 * 1024 * 1024)
        
        print(f"💾 Total Cache Size:")
        if total_size_gb > 1:
            print(f"   {total_size_gb:.2f} GB\n")
        else:
            print(f"   {total_size_mb:.1f} MB\n")
    
    # 5. Determine mode
    print("🎯 Predicted Mode:")
    models_cached = hub_cache.exists() and any(hub_cache.glob('models--*'))
    
    if models_cached:
        print("   ✅ OFFLINE MODE")
        print("   - Models are cached")
        print("   - No internet connection needed")
        print("   - Fast startup")
        print("   - Ready to use!\n")
    else:
        print("   📥 ONLINE MODE (First Run)")
        print("   - Models will be downloaded")
        print("   - Internet connection required")
        print("   - One-time download (~500MB-1GB)")
        print("   - Takes 5-15 minutes")
        print("   - After download, will switch to offline mode\n")
    
    # 6. Check Docling installation
    print("📦 Docling Installation:")
    try:
        import docling
        print(f"   ✅ Docling installed (version: {getattr(docling, '__version__', 'unknown')})")
        
        from docling.document_converter import DocumentConverter
        print("   ✅ DocumentConverter available")
        
    except ImportError as e:
        print(f"   ❌ Docling not installed: {e}")
        print("   💡 Install with: pip install docling>=2.58.0\n")
        return
    
    print()
    
    # 7. Recommendations
    print("💡 Recommendations:")
    if not models_cached:
        print("   1. Run the application - models will download automatically")
        print("   2. Or run: .\\scripts\\fix_docling_cache.bat")
        print("   3. Ensure stable internet connection for download")
        print("   4. Have at least 2GB free disk space")
    else:
        print("   ✅ Everything looks good!")
        print("   ✅ You can run the application offline")
    
    print("\n" + "="*70 + "\n")

if __name__ == "__main__":
    try:
        check_docling_status()
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
