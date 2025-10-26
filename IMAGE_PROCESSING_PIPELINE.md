# Image Processing Pipeline Documentation

## Overview

The image processing pipeline separates images from text during document extraction and processes them independently for optimal retrieval and context understanding.

## Architecture

```
Document Input
     │
     ├──► Text Extraction ──► Text Chunking ──► Text Embedding ──► Vector DB
     │
     └──► Image Extraction
            │
            ├──► OCR Engine (PaddleOCR)
            │      └──► Extract axis labels, titles, legends, text elements
            │
            ├──► Chart Parser
            │      └──► Extract numerical data, chart type, structure
            │
            ├──► Description Generator
            │      └──► Create comprehensive natural language description
            │
            ├──► Image Chunking
            │      └──► Split description into optimal chunks
            │
            └──► Image Embedding ──► Vector DB
                   (with image-specific metadata)
```

## Components

### 1. Document Extractor (`core/doc_extractor.py`)

**Enhanced Features:**
- Extracts images from PDFs, DOCX, PPTX using Docling
- Saves images separately in `data/docling_output/{document_name}/images/`
- Maintains metadata linking images to source documents
- Returns both text and images in `ExtractedDocument` object

**Image Metadata Schema:**
```python
{
    'image_id': str,           # Unique identifier
    'image_index': int,        # Position in document
    'source_document': str,    # Original filename
    'image_path': str,         # Saved image path
    'page': int or None,       # Page number (if applicable)
    'caption': str or None,    # Image caption or alt text
    'bbox': list or None       # Bounding box coordinates
}
```

### 2. Image Processor (`core/image_processor.py`)

**Core Capabilities:**

#### A. OCR Text Extraction
- **Engine:** PaddleOCR (supports 80+ languages)
- **Extracts:**
  - Axis labels (X, Y axes)
  - Chart titles
  - Legend items
  - Data point labels
  - Any text visible in image

#### B. Chart Parsing
- **Detects chart types:** bar, line, pie, scatter, etc.
- **Extracts structure:**
  - Title
  - Axis labels and values
  - Legend items
  - Numerical data points
  - Text elements

#### C. Image Classification
Automatically classifies images into:
- `chart` - Graphs, plots, visualizations
- `table` - Tables, grids
- `diagram` - Flowcharts, architecture diagrams
- `text` - Text-heavy images
- `photo` - Photographs
- `unknown` - Other types

#### D. Description Generation
Creates comprehensive natural language descriptions combining:
- Image type and context
- OCR text content
- Chart structure and data
- Visual characteristics
- Source document reference

**Example Description:**
```
This is a chart image from document 'Q4_Report.pdf' on page 5.

Text content extracted from image: Revenue Growth 2023 Q1 Q2 Q3 Q4 100 200 300 400

Chart titled 'Revenue Growth 2023' containing 4 data points. All text in chart: Revenue Growth 2023 Q1 Q2 Q3 Q4 100 200 300 400.

Key elements: Revenue, Growth, 2023, Q1, Q2, Q3, Q4, 100, 200, 300, 400

Image dimensions: 800x600 pixels
```

### 3. Chunking Strategy

**Image descriptions are chunked separately:**
- Chunk size: 500 characters (configurable)
- Overlap: 50 characters
- Preserves image context in each chunk
- Each chunk maintains reference to source image

**Chunk Metadata:**
```python
{
    'content_type': 'image_description',
    'image_id': str,
    'image_type': str,
    'image_path': str,
    'has_ocr_text': bool,
    'chunk_index': int,
    'source_document': str,
    'page_number': int or None,
    # ... additional document metadata
}
```

### 4. Embedding & Storage

**Process:**
1. Generate embeddings for image descriptions using same model as text
2. Store in same vector database with distinct metadata
3. Enable filtering by `content_type` to separate text/image results

**Benefits:**
- Images searchable by visual content
- OCR text enables text-based image search
- Chart data searchable by values/trends
- Maintains document context

## Installation

### Required Dependencies

```bash
pip install paddleocr paddlepaddle opencv-python shapely
```

For GPU acceleration:
```bash
pip install paddlepaddle-gpu
```

### Verify Installation

```python
from core.image_processor import get_image_processor

processor = get_image_processor()
print(processor.get_processor_info())
```

## Usage

### Basic Image Processing

```python
from core.image_processor import ImageProcessor

# Initialize processor
processor = ImageProcessor(
    use_gpu=False,
    lang='en',
    enable_chart_parsing=True
)

# Process an image
image_content = processor.process_image(
    image_source='path/to/image.png',
    image_id='sample_chart',
    metadata={'source_document': 'report.pdf', 'page_number': 5}
)

# Access results
print(f"OCR Text: {image_content.ocr_text}")
print(f"Type: {image_content.image_type}")
print(f"Description: {image_content.description}")
print(f"Structured Data: {image_content.structured_data}")

# Chunk for embedding
chunks = processor.chunk_image_description(image_content)
print(f"Created {len(chunks)} chunks")
```

### Document Ingestion with Images

```python
# Images are automatically processed during ingestion
# Upload document via API:
POST /rag/ingest-doc
Form Data:
  - file: document.pdf
  - index_name: my_index

# Response includes image processing stats:
{
    "success": true,
    "chunks_created": 45,
    "images_processed": 8,
    "image_chunks_created": 12
}
```

### Searching Image Content

```python
# Search works across both text and images
GET /rag/search?query=revenue chart 2023&index_name=my_index

# Results may include:
# - Text chunks mentioning "revenue" 
# - Image descriptions from charts about revenue
# - Both filtered by metadata.content_type if needed
```

## Advanced Features

### 1. Custom Image Processing

```python
from PIL import Image
from core.image_processor import ImageProcessor

processor = ImageProcessor()

# Load image
img = Image.open('chart.png')

# Process with custom metadata
content = processor.process_image(
    image_source=img,
    image_id='custom_chart',
    metadata={
        'author': 'John Doe',
        'department': 'Finance',
        'quarter': 'Q4'
    },
    save_output=True  # Save to disk
)

# Access saved files
print(f"Image saved to: {content.image_path}")
print(f"Thumbnail: {content.thumbnail_path}")
```

### 2. Filtering Search Results

```python
# Search only images
results = hybrid_search.search(
    collection_name='my_index',
    query_text='sales performance',
    where={'content_type': 'image_description'}
)

# Search only text
results = hybrid_search.search(
    collection_name='my_index',
    query_text='sales performance',
    where={'content_type': {'$ne': 'image_description'}}
)

# Search specific image types
results = hybrid_search.search(
    collection_name='my_index',
    query_text='bar chart',
    where={'image_type': 'chart'}
)
```

### 3. OCR Language Configuration

```python
# Support for multiple languages
processor = ImageProcessor(lang='ch')  # Chinese
processor = ImageProcessor(lang='fr')  # French
processor = ImageProcessor(lang='es')  # Spanish
# ... and 80+ more languages
```

## Performance Optimization

### GPU Acceleration

```python
# Enable GPU for faster processing
processor = ImageProcessor(use_gpu=True)

# Check GPU availability
import paddle
print(f"GPU available: {paddle.is_compiled_with_cuda()}")
```

### Batch Processing

```python
# Process multiple images efficiently
images = ['img1.png', 'img2.png', 'img3.png']
results = []

processor = ImageProcessor()

for img_path in images:
    content = processor.process_image(
        image_source=img_path,
        save_output=True
    )
    results.append(content)

print(f"Processed {len(results)} images")
```

## Output Structure

### Saved Files

When processing a document with images:

```
data/
├── docling_output/
│   └── document_name_20251025_120000/
│       ├── document_name.md
│       ├── document_name.json
│       ├── document_name.txt
│       ├── document_name_metadata.json
│       └── images/
│           ├── document_name_img_0.png
│           ├── document_name_img_1.png
│           └── ...
└── processed_images/
    ├── document_name_img_0_20251025_120100/
    │   ├── document_name_img_0.png
    │   ├── document_name_img_0_thumb.png
    │   └── document_name_img_0_data.json
    └── ...
```

### Data JSON Schema

```json
{
  "image_id": "document_name_img_0",
  "ocr_text": "Revenue Chart Q1-Q4 2023...",
  "structured_data": {
    "chart_type": "bar",
    "title": "Revenue Chart",
    "axis_labels": {"x": "Quarter", "y": "Revenue ($M)"},
    "legend_items": ["2023", "2024"],
    "data_points": [
      {"value": "100", "position": "center"},
      {"value": "150", "position": "center"}
    ],
    "text_elements": ["Revenue", "Chart", "Q1", "Q2", "100", "150"]
  },
  "description": "This is a chart image...",
  "metadata": {
    "source_document": "report.pdf",
    "page_number": 5,
    "ocr_elements_count": 12,
    "has_structured_data": true,
    "image_size": [800, 600],
    "processing_timestamp": "2025-10-25T12:01:00"
  },
  "paths": {
    "image": "path/to/image.png",
    "thumbnail": "path/to/thumbnail.png"
  }
}
```

## Troubleshooting

### Common Issues

**1. PaddleOCR Not Installed**
```
Error: paddleocr could not be imported
Solution: pip install paddleocr paddlepaddle opencv-python
```

**2. No Images Extracted**
```
Check:
- Document format supports images (PDF, DOCX, PPTX)
- Images are embedded (not just linked)
- Docling is properly initialized
```

**3. Poor OCR Accuracy**
```
Solutions:
- Use GPU acceleration: ImageProcessor(use_gpu=True)
- Adjust image quality/resolution
- Select correct language: ImageProcessor(lang='en')
```

**4. Memory Issues with Large Documents**
```
Solutions:
- Process images in batches
- Reduce image resolution before processing
- Enable save_output=True to disk instead of memory
```

## Configuration

### Environment Variables

```bash
# Optional: Configure image processing
export IMAGE_PROCESSOR_GPU=false
export IMAGE_PROCESSOR_LANG=en
export IMAGE_OUTPUT_DIR=data/processed_images
```

### Settings in `utils/config.py`

Add to your settings:
```python
class Settings(BaseSettings):
    # ... existing settings ...
    
    # Image processing
    enable_image_processing: bool = True
    image_processor_gpu: bool = False
    image_processor_lang: str = 'en'
    image_output_dir: str = 'data/processed_images'
```

## Best Practices

1. **Always enable chart parsing** for documents with visualizations
2. **Use GPU acceleration** for bulk processing
3. **Save outputs** to preserve processed data
4. **Include source metadata** for better context
5. **Filter by content_type** when searching for specific content
6. **Monitor memory usage** with large image batches
7. **Use appropriate chunk sizes** based on image complexity

## Future Enhancements

Planned improvements:
- [ ] Advanced chart type detection (ML-based)
- [ ] Table structure extraction and parsing
- [ ] Image similarity search
- [ ] Multi-modal embeddings (CLIP, etc.)
- [ ] Automatic image quality enhancement
- [ ] Support for more image formats (SVG, WebP)
- [ ] Real-time image processing API
- [ ] Image comparison and diff detection

## Support

For issues or questions:
1. Check logs in `data/` directories
2. Verify dependencies are installed
3. Test with sample images first
4. Review image metadata JSON files
5. Check vector DB for proper storage

---

**Last Updated:** October 25, 2025  
**Version:** 1.0.0
