# Image Processing - Quick Reference Guide

## Installation

```bash
# Install dependencies
.\scripts\install-image-processing.ps1

# Or manually
pip install paddleocr paddlepaddle opencv-python shapely
```

## Testing

```bash
# Run test suite
python scripts/test_image_processing.py

# Quick test
python -c "from core.image_processor import get_image_processor; print(get_image_processor().get_processor_info())"
```

## API Usage

### Upload Document with Images

```bash
POST http://localhost:8000/rag/ingest-doc
Content-Type: multipart/form-data

file: document.pdf
index_name: my_index
```

**Response:**
```json
{
  "success": true,
  "message": "Document ingested successfully",
  "index_name": "my_index",
  "chunks_created": 45,
  "filename": "document.pdf",
  "images_processed": 8,
  "image_chunks_created": 12
}
```

### Search (Text + Images)

```bash
GET http://localhost:8000/rag/search?query=revenue chart&index_name=my_index&top_k=10
```

**Response includes both:**
- Text chunks with matching content
- Image description chunks from charts/diagrams

## Python Usage

### Process Single Image

```python
from core.image_processor import ImageProcessor

processor = ImageProcessor(
    use_gpu=False,
    lang='en',
    enable_chart_parsing=True
)

# Process image
content = processor.process_image(
    image_source='chart.png',
    image_id='sales_chart',
    metadata={'source': 'report.pdf', 'page': 5}
)

# Results
print(f"OCR Text: {content.ocr_text}")
print(f"Type: {content.image_type}")
print(f"Description: {content.description}")
print(f"Chart Data: {content.structured_data}")

# Chunk for embedding
chunks = processor.chunk_image_description(content)
print(f"Created {len(chunks)} chunks")
```

### Process Document Images

```python
from core.doc_extractor import DocumentExtractor
from core.image_processor import get_image_processor

# Extract document
extractor = DocumentExtractor()
doc = extractor.extract(open('document.pdf', 'rb'), 'document.pdf')

print(f"Extracted {len(doc.images)} images")

# Process each image
processor = get_image_processor()
for img_meta in doc.images:
    content = processor.process_image(
        image_source=img_meta['image_path'],
        image_id=img_meta['image_id'],
        metadata=img_meta
    )
    print(f"Processed: {content.image_id}")
```

## Search Filtering

### Search Only Images

```python
from core.vector_store import get_vector_store

vs = get_vector_store()
results = vs.query(
    collection_name='my_index',
    query_embedding=embedding,
    where={'content_type': 'image_description'}
)
```

### Search Only Text

```python
results = vs.query(
    collection_name='my_index',
    query_embedding=embedding,
    where={'content_type': {'$ne': 'image_description'}}
)
```

### Search Specific Image Types

```python
# Charts only
results = vs.query(
    collection_name='my_index',
    query_embedding=embedding,
    where={
        'content_type': 'image_description',
        'image_type': 'chart'
    }
)

# Tables only
results = vs.query(
    collection_name='my_index',
    query_embedding=embedding,
    where={
        'content_type': 'image_description',
        'image_type': 'table'
    }
)
```

## Configuration

### Environment Variables

```bash
export IMAGE_PROCESSOR_GPU=false
export IMAGE_PROCESSOR_LANG=en
export IMAGE_OUTPUT_DIR=data/processed_images
```

### In Code

```python
processor = ImageProcessor(
    use_gpu=False,          # True for GPU acceleration
    lang='en',              # Language code (en, ch, fr, etc.)
    enable_chart_parsing=True,  # Extract structured chart data
    output_dir='custom/path'    # Custom output directory
)
```

## Data Locations

### Extracted Images
```
data/docling_output/{document_name}_{timestamp}/images/
  ├── document_img_0.png
  ├── document_img_1.png
  └── ...
```

### Processed Images
```
data/processed_images/{image_id}_{timestamp}/
  ├── {image_id}.png           # Full image
  ├── {image_id}_thumb.png     # Thumbnail
  └── {image_id}_data.json     # Extracted data
```

## Metadata Structure

### In Vector DB

```python
{
    'content_type': 'image_description',  # Identifies as image chunk
    'image_id': 'doc_img_0',
    'image_type': 'chart',                # chart, table, diagram, etc.
    'image_path': 'path/to/image.png',
    'has_ocr_text': True,
    'source_document': 'report.pdf',
    'page_number': 5,
    'chunk_index': 0,
    # ... additional metadata
}
```

### In JSON File

```json
{
  "image_id": "doc_img_0",
  "ocr_text": "Revenue Growth Q1-Q4...",
  "structured_data": {
    "chart_type": "bar",
    "title": "Revenue Growth",
    "axis_labels": {"x": "Quarter", "y": "Revenue"},
    "data_points": [...]
  },
  "description": "Full natural language description...",
  "metadata": {
    "source_document": "report.pdf",
    "page_number": 5,
    "ocr_elements_count": 15
  }
}
```

## GPU Acceleration

### Install GPU Version

```bash
pip uninstall paddlepaddle
pip install paddlepaddle-gpu
```

### Enable in Code

```python
processor = ImageProcessor(use_gpu=True)
```

### Check GPU Status

```python
import paddle
print(f"GPU Available: {paddle.is_compiled_with_cuda()}")
```

## Troubleshooting

### PaddleOCR Not Found
```bash
pip install paddleocr paddlepaddle opencv-python
```

### No Images Extracted
- Check document format (PDF, DOCX, PPTX)
- Verify images are embedded (not linked)
- Check Docling initialization

### Poor OCR Accuracy
- Enable GPU: `ImageProcessor(use_gpu=True)`
- Adjust language: `ImageProcessor(lang='en')`
- Improve image quality/resolution

### Memory Issues
- Process images in batches
- Enable `save_output=True` to disk
- Reduce image resolution

## Performance Tips

1. **Use GPU** for bulk processing (~4x faster)
2. **Batch operations** when processing multiple images
3. **Save outputs** to reduce memory usage
4. **Adjust chunk size** based on image complexity
5. **Monitor disk space** for large document sets

## Common Patterns

### Batch Process Documents

```python
from pathlib import Path
from core.doc_extractor import DocumentExtractor
from core.image_processor import get_image_processor

extractor = DocumentExtractor()
processor = get_image_processor()

for pdf in Path('documents/').glob('*.pdf'):
    # Extract
    doc = extractor.extract(open(pdf, 'rb'), pdf.name)
    
    # Process images
    for img in doc.images:
        content = processor.process_image(
            image_source=img['image_path'],
            image_id=img['image_id'],
            metadata=img
        )
        print(f"Processed: {content.image_id}")
```

### Extract Chart Data Only

```python
content = processor.process_image('chart.png', enable_chart_parsing=True)

if content.image_type == 'chart':
    chart_data = content.structured_data
    print(f"Title: {chart_data.get('title')}")
    print(f"Data Points: {chart_data.get('data_points')}")
```

### Get OCR Text Only

```python
content = processor.process_image('image.png', save_output=False)
print(f"OCR Text: {content.ocr_text}")
```

## Support

- **Full Documentation:** `IMAGE_PROCESSING_PIPELINE.md`
- **Implementation Details:** `IMAGE_PROCESSING_IMPLEMENTATION.md`
- **Test Suite:** `python scripts/test_image_processing.py`
- **Install Script:** `.\scripts\install-image-processing.ps1`

---

**Quick Links:**
- [PaddleOCR Docs](https://github.com/PaddlePaddle/PaddleOCR)
- [Supported Languages](https://github.com/PaddlePaddle/PaddleOCR/blob/release/2.7/doc/doc_en/multi_languages_en.md)
- [GPU Setup Guide](https://www.paddlepaddle.org.cn/install/quick)
