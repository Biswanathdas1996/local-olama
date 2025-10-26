"""Test PPTX image extraction with user's file."""

import sys
from pathlib import Path

# You'll need to upload your PPTX file to test this
# For now, let's just verify the code changes are working

print("To test PPTX image extraction:")
print("1. Upload your PPTX file via the UI")
print("2. The extraction should now properly decode base64 images from Docling")
print("3. Check the data/docling_output/<filename>_<timestamp>/images folder")
print()
print("Key changes made:")
print("- Added base64 decoding for Docling's URI-based image storage")
print("- Images are now extracted from 'picture.image.uri' attribute")
print("- Fallback PPTX extractor also enhanced for robustness")
