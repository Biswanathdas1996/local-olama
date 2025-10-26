# PPTX Image Extraction Fix

## Problem Identified
When uploading PPTX files, the system reported "Extracted 0 sections and 0 images" even though Docling was successfully processing the files.

## Root Cause
Investigation revealed that:
1. Docling **was** extracting images from PPTX files
2. Images were stored as **base64-encoded data URIs** in the JSON output
3. Our code was checking for `picture.image.save()` method (PIL Image object)
4. But Docling stores images as: `picture.image.uri = "data:image/png;base64,iVBORw0KG..."`

## Solution Implemented

### Updated `_extract_with_docling()` in `core/doc_extractor.py`

Added base64 decoding capability:

```python
# Get image data - different APIs might use different attributes
import base64
import io
from PIL import Image

saved = False

# Try different image attribute patterns
if hasattr(picture, 'image') and picture.image is not None:
    # Check if it's a URI (base64 data)
    if hasattr(picture.image, 'uri') and picture.image.uri:
        uri = picture.image.uri
        if uri.startswith('data:image'):
            # Extract base64 data from URI
            base64_data = uri.split(',')[1] if ',' in uri else uri
            img_bytes = base64.b64decode(base64_data)
            img = Image.open(io.BytesIO(img_bytes))
            img.save(image_path, 'PNG')
            saved = True
    # PIL image object
    elif hasattr(picture.image, 'save'):
        picture.image.save(image_path, 'PNG')
        saved = True
```

### Enhanced Section Extraction

Also improved section extraction for PPTX to create sections from pages/slides when standard extraction fails:

```python
# If no sections found, create sections from pages/slides
if not sections and doc_format == 'pptx':
    logger.info("No sections found via standard extraction, trying page-based extraction for PPTX")
    if hasattr(result.document, 'pages'):
        for page_num, page in enumerate(result.document.pages, 1):
            # Extract text from each page/slide
            page_text = ""
            if hasattr(page, 'text'):
                page_text = page.text
            elif hasattr(page, 'export_to_text'):
                page_text = page.export_to_text()
            
            if page_text.strip():
                sections.append({
                    'title': f'Slide {page_num}',
                    'content': page_text,
                    'slide': page_num
                })
```

## Testing Instructions

1. **Upload a PPTX file** through the UI ingestion endpoint
2. **Check the logs** - you should now see:
   - "Found X images in document"
   - "Saved image 0 to data/docling_output/.../images/..."
3. **Verify images folder** at: `data/docling_output/<filename>_<timestamp>/images/`
4. **Check API response** - should show:
   ```json
   {
     "sections_extracted": 12,  // number of slides
     "images_extracted": 3      // number of images found
   }
   ```

## Files Modified

- `core/doc_extractor.py` - Added base64 URI decoding and enhanced PPTX section extraction
- Created `test_pptx_images.py` - Test information script
- Created `PPTX_IMAGE_FIX.md` - This documentation

## Next Steps

When you upload your PPTX file next time:
- Sections should be extracted (one per slide)
- Images should be properly decoded and saved to the images folder
- You can then process the images through the ImageProcessor for OCR and chart parsing
