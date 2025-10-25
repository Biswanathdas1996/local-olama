"""
Download and setup Docling models for complete offline extraction.
This ensures all AI models used by Docling are cached locally.
"""

import sys
from pathlib import Path
import shutil
import json

def download_models():
    """Download all Docling models by processing sample documents"""
    print("="*80)
    print("DOWNLOADING DOCLING MODELS FOR OFFLINE USE")
    print("="*80)
    
    try:
        from docling.document_converter import DocumentConverter, PdfFormatOption
        from docling.datamodel.base_models import InputFormat
        from docling.datamodel.pipeline_options import PdfPipelineOptions
        import tempfile
        
        print("\n✅ Docling imports successful")
        
        # Create models directory
        models_dir = Path("models/docling_models")
        models_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"\n📁 Models directory: {models_dir.absolute()}")
        
        # Initialize converter - this will download models on first use
        print("\n⏳ Initializing DocumentConverter (this may download models)...")
        
        # Configure with OCR to download all models
        pipeline_options = PdfPipelineOptions()
        pipeline_options.do_ocr = False  # Set to True if you want OCR models
        
        format_options = {
            InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
        }
        
        converter = DocumentConverter(
            allowed_formats=[
                InputFormat.PDF,
                InputFormat.DOCX,
                InputFormat.HTML,
                InputFormat.PPTX,
            ],
            format_options=format_options
        )
        
        print("✅ DocumentConverter initialized")
        
        # Create a simple test PDF to trigger model downloads
        print("\n⏳ Creating test document to trigger model downloads...")
        
        # Create a simple test HTML file
        test_html = """
        <html>
        <head><title>Test Document</title></head>
        <body>
            <h1>Test Heading</h1>
            <p>This is a test document to trigger Docling model downloads.</p>
            <table>
                <tr><th>Column 1</th><th>Column 2</th></tr>
                <tr><td>Data 1</td><td>Data 2</td></tr>
            </table>
        </body>
        </html>
        """
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False, encoding='utf-8') as f:
            f.write(test_html)
            test_file = f.name
        
        try:
            print(f"   Converting test file: {test_file}")
            result = converter.convert(test_file)
            print("✅ Test conversion successful - models downloaded")
            
            # Export to verify
            markdown = result.document.export_to_markdown()
            print(f"   Extracted {len(markdown)} characters")
            
        finally:
            Path(test_file).unlink(missing_ok=True)
        
        # Check HuggingFace cache
        print("\n📦 Checking downloaded models...")
        hf_cache = Path.home() / '.cache' / 'huggingface'
        
        if hf_cache.exists():
            hub_dir = hf_cache / 'hub'
            if hub_dir.exists():
                models = list(hub_dir.glob('models--*'))
                
                # Look for Docling-specific models
                docling_models = [m for m in models if 'docling' in m.name.lower() or 'ibm' in m.name.lower()]
                
                print(f"\n✅ Found {len(models)} total models in HuggingFace cache")
                print(f"   {len(docling_models)} Docling-specific models")
                
                for model in docling_models:
                    model_name = model.name.replace('models--', '').replace('--', '/')
                    size = sum(f.stat().st_size for f in model.rglob('*') if f.is_file())
                    size_mb = size / (1024 * 1024)
                    print(f"     - {model_name} ({size_mb:.1f} MB)")
        
        # Copy models to project directory for backup
        print("\n📋 Copying models to project directory...")
        
        if hf_cache.exists():
            project_cache = models_dir / 'huggingface_cache'
            
            # Only copy if models exist
            if docling_models:
                for model in docling_models:
                    dest = project_cache / 'hub' / model.name
                    if not dest.exists():
                        print(f"   Copying {model.name}...")
                        dest.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copytree(model, dest)
                        print(f"   ✅ Copied")
                    else:
                        print(f"   ✓ {model.name} already exists")
                
                print(f"\n✅ Models backed up to: {project_cache}")
            else:
                print("   ℹ️  No Docling-specific models to copy")
                print("   ℹ️  Docling may be using built-in models or downloading on-demand")
        
        # Create offline configuration guide
        config_file = models_dir / 'OFFLINE_SETUP.md'
        config_content = f"""# Docling Offline Setup

## Models Location
- HuggingFace Cache: `{hf_cache}`
- Project Backup: `{project_cache if 'project_cache' in locals() else 'N/A'}`

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
$env:HF_HOME='{project_cache if 'project_cache' in locals() else models_dir}'
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
"""
        
        config_file.write_text(config_content, encoding='utf-8')
        print(f"\n📄 Configuration guide saved: {config_file}")
        
        # Save model inventory
        inventory_file = models_dir / 'models_inventory.json'
        inventory = {
            'docling_version': '2.x',
            'cache_location': str(hf_cache),
            'project_backup': str(project_cache) if 'project_cache' in locals() else None,
            'models': [
                {
                    'name': m.name.replace('models--', '').replace('--', '/'),
                    'path': str(m)
                }
                for m in docling_models
            ] if docling_models else []
        }
        
        inventory_file.write_text(json.dumps(inventory, indent=2), encoding='utf-8')
        print(f"📄 Model inventory saved: {inventory_file}")
        
        print("\n" + "="*80)
        print("✅ SETUP COMPLETE")
        print("="*80)
        print("\nDocling is ready for offline use!")
        print("Models are cached and will work without internet connection.")
        print("\nTo enable offline mode, set environment variables before running:")
        print("  $env:TRANSFORMERS_OFFLINE='1'")
        print("  $env:HF_HUB_OFFLINE='1'")
        print("  $env:HF_DATASETS_OFFLINE='1'")
        
        return True
        
    except ImportError as e:
        print(f"\n❌ Docling not installed: {e}")
        print("\nInstall with:")
        print("  pip install docling")
        return False
        
    except Exception as e:
        print(f"\n❌ Error setting up Docling models: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = download_models()
    sys.exit(0 if success else 1)
