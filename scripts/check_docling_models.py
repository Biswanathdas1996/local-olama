"""
Check Docling models and download them locally for offline use
"""

import os
from pathlib import Path
import shutil

def check_huggingface_cache():
    """Check what models are in HuggingFace cache"""
    cache_dir = Path.home() / '.cache' / 'huggingface'
    
    if not cache_dir.exists():
        print(f"❌ HuggingFace cache directory not found: {cache_dir}")
        return []
    
    print(f"📁 HuggingFace cache: {cache_dir}")
    
    hub_dir = cache_dir / 'hub'
    if not hub_dir.exists():
        print("❌ No hub directory found")
        return []
    
    models = list(hub_dir.glob('models--*'))
    print(f"\n✅ Found {len(models)} models in cache:")
    
    docling_models = []
    for model in models:
        model_name = model.name.replace('models--', '').replace('--', '/')
        size = sum(f.stat().st_size for f in model.rglob('*') if f.is_file())
        size_mb = size / (1024 * 1024)
        
        print(f"  - {model_name} ({size_mb:.1f} MB)")
        
        if 'docling' in model_name.lower() or 'ibm' in model_name.lower():
            docling_models.append({
                'name': model_name,
                'path': model,
                'size_mb': size_mb
            })
    
    return docling_models

def test_docling_extraction():
    """Test if Docling can extract a sample document"""
    print("\n" + "="*80)
    print("Testing Docling Extraction...")
    print("="*80)
    
    try:
        from docling.document_converter import DocumentConverter
        from docling.datamodel.base_models import InputFormat
        
        print("✅ Docling imports successful")
        
        # Initialize converter
        print("\nInitializing DocumentConverter...")
        converter = DocumentConverter(
            allowed_formats=[
                InputFormat.PDF,
                InputFormat.DOCX,
                InputFormat.HTML,
                InputFormat.PPTX,
            ]
        )
        print("✅ DocumentConverter initialized")
        
        # Check if we can access the converter's components
        print("\n📦 Checking Docling components...")
        print(f"  - Allowed formats: {converter.allowed_formats}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing Docling: {e}")
        import traceback
        traceback.print_exc()
        return False

def find_docling_models():
    """Find which models Docling needs"""
    print("\n" + "="*80)
    print("Finding Docling Model Requirements...")
    print("="*80)
    
    try:
        # Check docling-ibm-models package
        import importlib.util
        spec = importlib.util.find_spec('docling_ibm_models')
        if spec:
            print(f"✅ docling-ibm-models found at: {spec.origin}")
            
            # Try to import and check models
            try:
                from docling_ibm_models.layoutmodel.layout_model import LayoutModel
                print("  - Layout model available")
            except Exception as e:
                print(f"  - Layout model error: {e}")
                
            try:
                from docling_ibm_models.tableformer.tableformer_model import TableFormerModel
                print("  - TableFormer model available")
            except Exception as e:
                print(f"  - TableFormer model error: {e}")
        
        # Check accelerate for model loading
        try:
            import accelerate
            print(f"✅ accelerate library installed (version: {accelerate.__version__})")
        except ImportError:
            print("❌ accelerate library not installed")
            
    except Exception as e:
        print(f"❌ Error checking models: {e}")

def download_docling_models_offline():
    """Download and setup Docling models for offline use"""
    print("\n" + "="*80)
    print("Setting up Docling Models for Offline Use...")
    print("="*80)
    
    # Create local models directory
    models_dir = Path("models/docling_models")
    models_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"\n📁 Local models directory: {models_dir.absolute()}")
    
    # Copy models from HuggingFace cache to local directory
    cache_dir = Path.home() / '.cache' / 'huggingface' / 'hub'
    
    if not cache_dir.exists():
        print("❌ No HuggingFace cache found. Models need to be downloaded first.")
        print("\nTo download models, run:")
        print("  python -c \"from docling.document_converter import DocumentConverter; DocumentConverter()\"")
        return
    
    # Find all docling/IBM models
    docling_models = list(cache_dir.glob('models--*docling*')) + list(cache_dir.glob('models--*ibm*'))
    
    if not docling_models:
        print("⚠️  No Docling models found in cache yet.")
        print("\nInitializing Docling to download models...")
        
        try:
            from docling.document_converter import DocumentConverter
            converter = DocumentConverter()
            print("✅ Docling initialized - models should now be downloaded")
            
            # Re-check cache
            docling_models = list(cache_dir.glob('models--*docling*')) + list(cache_dir.glob('models--*ibm*'))
        except Exception as e:
            print(f"❌ Error initializing Docling: {e}")
            return
    
    print(f"\n✅ Found {len(docling_models)} Docling-related models:")
    
    for model in docling_models:
        model_name = model.name.replace('models--', '').replace('--', '/')
        print(f"\n  📦 {model_name}")
        
        # Copy to local directory
        dest = models_dir / model.name
        if dest.exists():
            print(f"     ✓ Already in local directory")
        else:
            print(f"     Copying to {dest}...")
            try:
                shutil.copytree(model, dest)
                print(f"     ✅ Copied successfully")
            except Exception as e:
                print(f"     ❌ Error copying: {e}")
    
    # Create offline configuration
    env_file = Path(".env.docling")
    env_content = f"""# Docling Offline Configuration
HF_HOME={models_dir.absolute()}
TRANSFORMERS_OFFLINE=1
HF_HUB_OFFLINE=1
HF_DATASETS_OFFLINE=1
"""
    
    env_file.write_text(env_content)
    print(f"\n✅ Created offline config: {env_file}")
    print("\nTo use offline mode, run:")
    print(f"  $env:HF_HOME='{models_dir.absolute()}'; $env:TRANSFORMERS_OFFLINE='1'; $env:HF_HUB_OFFLINE='1'")

if __name__ == "__main__":
    print("="*80)
    print("DOCLING MODELS CHECKER & DOWNLOADER")
    print("="*80)
    
    # Step 1: Check current cache
    docling_models = check_huggingface_cache()
    
    # Step 2: Test Docling
    docling_works = test_docling_extraction()
    
    # Step 3: Find model requirements
    find_docling_models()
    
    # Step 4: Setup offline models
    if docling_works:
        download_docling_models_offline()
    
    print("\n" + "="*80)
    print("COMPLETE")
    print("="*80)
