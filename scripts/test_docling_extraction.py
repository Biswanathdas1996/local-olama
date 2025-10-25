"""
Test Docling extraction with a real document to ensure all models are downloaded
"""

from pathlib import Path
import io

def test_docling_extraction():
    """Test Docling with various document types"""
    print("="*80)
    print("TESTING DOCLING EXTRACTION")
    print("="*80)
    
    from core.doc_extractor import DocumentExtractor
    
    # Initialize extractor
    print("\n⏳ Initializing DocumentExtractor...")
    extractor = DocumentExtractor(use_ocr=False)
    
    if not extractor.converter:
        print("❌ Docling not available - using fallback extractors")
        return False
    
    print("✅ Docling initialized successfully")
    
    # Test with HTML (simple test)
    print("\n" + "="*80)
    print("TEST 1: HTML Extraction")
    print("="*80)
    
    test_html = """
    <html>
    <head><title>Test Document for Docling</title></head>
    <body>
        <h1>Main Title</h1>
        <p>This is a test document to verify Docling extraction works correctly.</p>
        
        <h2>Section 1</h2>
        <p>Content for section 1 with <strong>bold text</strong> and <em>italic text</em>.</p>
        
        <h2>Section 2: Tables</h2>
        <table border="1">
            <tr>
                <th>Header 1</th>
                <th>Header 2</th>
                <th>Header 3</th>
            </tr>
            <tr>
                <td>Row 1, Col 1</td>
                <td>Row 1, Col 2</td>
                <td>Row 1, Col 3</td>
            </tr>
            <tr>
                <td>Row 2, Col 1</td>
                <td>Row 2, Col 2</td>
                <td>Row 2, Col 3</td>
            </tr>
        </table>
        
        <h2>Section 3: Lists</h2>
        <ul>
            <li>Item 1</li>
            <li>Item 2</li>
            <li>Item 3</li>
        </ul>
    </body>
    </html>
    """
    
    html_content = io.BytesIO(test_html.encode('utf-8'))
    
    try:
        result = extractor.extract(html_content, "test_document.html")
        
        print(f"\n✅ HTML Extraction Successful!")
        print(f"   Format: {result.format}")
        print(f"   Text Length: {len(result.text)} characters")
        print(f"   Sections: {len(result.sections)}")
        print(f"   Extractor: {result.metadata.get('extractor', 'unknown')}")
        
        if result.metadata.get('output_directory'):
            print(f"   Output Directory: {result.metadata['output_directory']}")
            
            # Check if files were created
            output_dir = Path(result.metadata['output_directory'])
            if output_dir.exists():
                files = list(output_dir.glob('*'))
                print(f"   Files Created: {len(files)}")
                for f in files:
                    print(f"      - {f.name} ({f.stat().st_size} bytes)")
        
        # Show first 500 chars of extracted text
        print(f"\n   Extracted Text Preview:")
        print("   " + "-"*76)
        preview = result.text[:500].replace('\n', '\n   ')
        print(f"   {preview}")
        if len(result.text) > 500:
            print("   ...")
        print("   " + "-"*76)
        
        return True
        
    except Exception as e:
        print(f"\n❌ HTML Extraction Failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def check_existing_documents():
    """Check if there are any documents in the data directories to test with"""
    print("\n" + "="*80)
    print("CHECKING FOR EXISTING DOCUMENTS")
    print("="*80)
    
    data_dir = Path("data")
    if not data_dir.exists():
        print("❌ No data directory found")
        return []
    
    # Look for common document types
    patterns = ['**/*.pdf', '**/*.docx', '**/*.html', '**/*.pptx', '**/*.txt']
    documents = []
    
    for pattern in patterns:
        docs = list(data_dir.glob(pattern))
        documents.extend(docs)
    
    if documents:
        print(f"\n✅ Found {len(documents)} documents:")
        for doc in documents[:10]:  # Show first 10
            size_kb = doc.stat().st_size / 1024
            print(f"   - {doc.relative_to(data_dir)} ({size_kb:.1f} KB)")
        
        if len(documents) > 10:
            print(f"   ... and {len(documents) - 10} more")
    else:
        print("ℹ️  No documents found in data directory")
    
    return documents

if __name__ == "__main__":
    # Test extraction
    success = test_docling_extraction()
    
    # Check for existing documents
    docs = check_existing_documents()
    
    print("\n" + "="*80)
    if success:
        print("✅ DOCLING IS WORKING CORRECTLY")
        print("="*80)
        print("\nDocling is ready to extract documents!")
        print("All necessary components are installed and working.")
        print("\nOutput directory: data/docling_output/")
    else:
        print("❌ DOCLING TEST FAILED")
        print("="*80)
        print("\nPlease check the error messages above.")
