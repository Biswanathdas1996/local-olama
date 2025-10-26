"""
Test script for image processing pipeline.
Run this to verify the image processing implementation is working correctly.
"""

import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

def test_imports():
    """Test that all required modules can be imported"""
    print("=" * 80)
    print("Testing Imports...")
    print("=" * 80)
    
    try:
        from core.image_processor import ImageProcessor, get_image_processor
        print("✓ ImageProcessor imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import ImageProcessor: {e}")
        return False
    
    try:
        from core.doc_extractor import DocumentExtractor, ExtractedDocument
        print("✓ DocumentExtractor imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import DocumentExtractor: {e}")
        return False
    
    try:
        from routes.ingestion_routes import ingest_document
        print("✓ Ingestion routes imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import ingestion routes: {e}")
        return False
    
    print("\n✓ All core modules imported successfully!\n")
    return True


def test_image_processor():
    """Test ImageProcessor initialization and basic functionality"""
    print("=" * 80)
    print("Testing ImageProcessor...")
    print("=" * 80)
    
    try:
        from core.image_processor import get_image_processor
        
        # Initialize processor
        processor = get_image_processor(
            use_gpu=False,
            lang='en',
            enable_chart_parsing=True
        )
        
        # Get info
        info = processor.get_processor_info()
        print(f"\nImageProcessor Info:")
        print(f"  OCR Available: {info['ocr_available']}")
        print(f"  OCR Engine: {info['ocr_engine']}")
        print(f"  GPU Enabled: {info['gpu_enabled']}")
        print(f"  Language: {info['language']}")
        print(f"  Chart Parsing: {info['chart_parsing_enabled']}")
        print(f"  Output Directory: {info['output_directory']}")
        
        if not info['ocr_available']:
            print("\n⚠ OCR not available. Image processing will be limited.")
            print("  Install with: pip install paddleocr paddlepaddle opencv-python")
            return False
        
        print("\n✓ ImageProcessor initialized successfully!\n")
        return True
        
    except Exception as e:
        print(f"\n✗ ImageProcessor test failed: {e}\n")
        import traceback
        traceback.print_exc()
        return False


def test_document_extractor():
    """Test that DocumentExtractor returns images field"""
    print("=" * 80)
    print("Testing DocumentExtractor with Images...")
    print("=" * 80)
    
    try:
        from core.doc_extractor import DocumentExtractor, ExtractedDocument
        from io import BytesIO
        
        # Create a simple test text file
        test_content = b"This is a test document."
        
        extractor = DocumentExtractor(use_ocr=False)
        
        result = extractor.extract(
            BytesIO(test_content),
            filename="test.txt"
        )
        
        # Check that result has images field
        if not hasattr(result, 'images'):
            print("✗ ExtractedDocument missing 'images' field")
            return False
        
        print(f"\nExtracted Document:")
        print(f"  Text Length: {len(result.text)}")
        print(f"  Sections: {len(result.sections)}")
        print(f"  Images: {len(result.images)}")
        print(f"  Format: {result.format}")
        
        print("\n✓ DocumentExtractor working with images field!\n")
        return True
        
    except Exception as e:
        print(f"\n✗ DocumentExtractor test failed: {e}\n")
        import traceback
        traceback.print_exc()
        return False


def test_chunking():
    """Test image description chunking"""
    print("=" * 80)
    print("Testing Image Description Chunking...")
    print("=" * 80)
    
    try:
        from core.image_processor import ImageProcessor, ImageContent
        
        processor = ImageProcessor(use_gpu=False)
        
        # Create a mock ImageContent
        image_content = ImageContent(
            image_id="test_image",
            ocr_text="Sample OCR text",
            structured_data={},
            description="This is a test image description. " * 50,  # Long description
            image_type="chart",
            metadata={
                'source_document': 'test.pdf',
                'page_number': 1
            },
            image_path=None,
            thumbnail_path=None
        )
        
        # Chunk the description
        chunks = processor.chunk_image_description(
            image_content,
            chunk_size=500,
            overlap=50
        )
        
        print(f"\nChunking Results:")
        print(f"  Description Length: {len(image_content.description)} chars")
        print(f"  Chunks Created: {len(chunks)}")
        
        if chunks:
            print(f"\n  Sample Chunk:")
            print(f"    ID: {chunks[0]['chunk_id']}")
            print(f"    Text Length: {len(chunks[0]['text'])} chars")
            print(f"    Metadata Keys: {list(chunks[0]['metadata'].keys())}")
            
            # Verify metadata
            if chunks[0]['metadata'].get('content_type') != 'image_description':
                print("✗ Incorrect metadata: content_type should be 'image_description'")
                return False
        
        print("\n✓ Image chunking working correctly!\n")
        return True
        
    except Exception as e:
        print(f"\n✗ Chunking test failed: {e}\n")
        import traceback
        traceback.print_exc()
        return False


def test_dependencies():
    """Test that all required dependencies are installed"""
    print("=" * 80)
    print("Testing Dependencies...")
    print("=" * 80)
    
    dependencies = {
        'paddleocr': 'PaddleOCR',
        'cv2': 'OpenCV',
        'PIL': 'Pillow',
        'shapely': 'Shapely'
    }
    
    all_installed = True
    
    for module, name in dependencies.items():
        try:
            __import__(module)
            print(f"✓ {name} installed")
        except ImportError:
            print(f"✗ {name} not installed")
            all_installed = False
    
    print()
    
    if all_installed:
        print("✓ All dependencies installed!\n")
        return True
    else:
        print("⚠ Some dependencies missing. Run: .\\scripts\\install-image-processing.ps1\n")
        return False


def main():
    """Run all tests"""
    print("\n")
    print("*" * 80)
    print("IMAGE PROCESSING PIPELINE TEST SUITE")
    print("*" * 80)
    print("\n")
    
    tests = [
        ("Imports", test_imports),
        ("Dependencies", test_dependencies),
        ("ImageProcessor", test_image_processor),
        ("DocumentExtractor", test_document_extractor),
        ("Chunking", test_chunking),
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"\n✗ {test_name} test crashed: {e}\n")
            import traceback
            traceback.print_exc()
            results[test_name] = False
    
    # Summary
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print()
    
    passed = sum(1 for r in results.values() if r)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {test_name}")
    
    print()
    print(f"Results: {passed}/{total} tests passed")
    print()
    
    if passed == total:
        print("=" * 80)
        print("✓ ALL TESTS PASSED - Image Processing Pipeline Ready!")
        print("=" * 80)
        print()
        print("Next Steps:")
        print("  1. Upload a document with images via API")
        print("  2. Check logs for image processing details")
        print("  3. Verify images in data/docling_output/")
        print("  4. Search for image content")
        print()
        return 0
    else:
        print("=" * 80)
        print("✗ SOME TESTS FAILED - Please review errors above")
        print("=" * 80)
        print()
        print("Common fixes:")
        print("  1. Install missing dependencies: .\\scripts\\install-image-processing.ps1")
        print("  2. Check Python version (3.8+ required)")
        print("  3. Verify virtual environment is activated")
        print()
        return 1


if __name__ == "__main__":
    sys.exit(main())
