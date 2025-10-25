"""
Enterprise-grade document extraction using Docling for structure-aware parsing.
Supports PDF, DOCX, TXT, PPTX, HTML with metadata preservation.
"""

import io
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, BinaryIO
from dataclasses import dataclass
from datetime import datetime

try:
    from docling.document_converter import DocumentConverter, PdfFormatOption
    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import PdfPipelineOptions
    DOCLING_AVAILABLE = True
except ImportError as e:
    # Fallback to basic extraction if docling is not available
    print(f"⚠️  Docling import failed: {e}")
    import traceback
    traceback.print_exc()
    DocumentConverter = None
    PdfFormatOption = None
    InputFormat = None
    PdfPipelineOptions = None
    DOCLING_AVAILABLE = False
except Exception as e:
    # Catch any other exceptions during import
    print(f"❌ Unexpected error importing Docling: {e}")
    import traceback
    traceback.print_exc()
    DocumentConverter = None
    PdfFormatOption = None
    InputFormat = None
    PdfPipelineOptions = None
    DOCLING_AVAILABLE = False

from bs4 import BeautifulSoup
from PyPDF2 import PdfReader
from docx import Document as DocxDocument
from pptx import Presentation

logger = logging.getLogger(__name__)


@dataclass
class ExtractedDocument:
    """Structured document extraction result"""
    text: str
    metadata: Dict[str, any]
    sections: List[Dict[str, str]]  # [{title, content, page}]
    format: str


class DocumentExtractor:
    """
    High-fidelity document extractor using Docling for structure-aware parsing.
    Falls back to format-specific parsers when needed.
    """

    SUPPORTED_FORMATS = {
        '.pdf': 'pdf',
        '.docx': 'docx',
        '.txt': 'text',
        '.pptx': 'pptx',
        '.html': 'html',
        '.htm': 'html',
    }

    def __init__(self, use_ocr: bool = False, output_dir: Optional[str] = None):
        """
        Initialize document extractor.
        
        Args:
            use_ocr: Enable OCR for scanned PDFs (requires tesseract)
            output_dir: Directory to save Docling extraction outputs (default: data/docling_output)
        """
        self.use_ocr = use_ocr
        self.converter = None
        
        # Setup output directory for Docling results
        if output_dir:
            self.output_dir = Path(output_dir)
        else:
            self.output_dir = Path("data/docling_output")
        
        self.output_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Docling output directory: {self.output_dir}")
        logger.info(f"Docling availability check: DOCLING_AVAILABLE={DOCLING_AVAILABLE}, DocumentConverter={DocumentConverter is not None}")
        
        if DOCLING_AVAILABLE:
            try:
                # Configure Docling with the new API (v2.x)
                # Create format options for PDF with OCR settings
                format_options = {}
                
                if PdfFormatOption and PdfPipelineOptions:
                    pipeline_options = PdfPipelineOptions()
                    pipeline_options.do_ocr = use_ocr
                    format_options[InputFormat.PDF] = PdfFormatOption(
                        pipeline_options=pipeline_options
                    )
                
                self.converter = DocumentConverter(
                    allowed_formats=[
                        InputFormat.PDF,
                        InputFormat.DOCX,
                        InputFormat.HTML,
                        InputFormat.PPTX,
                    ],
                    format_options=format_options if format_options else None,
                )
                logger.info("✅ Docling converter initialized successfully")
                print("\n" + "="*80)
                print("✅ DOCLING INITIALIZED")
                print(f"   OCR Enabled: {use_ocr}")
                print(f"   Output Directory: {self.output_dir}")
                print(f"   Supported Formats: PDF, DOCX, HTML, PPTX")
                print("="*80 + "\n")
            except Exception as e:
                logger.warning(f"❌ Docling initialization failed: {e}. Using fallback extractors.")
                print("\n" + "!"*80)
                print("⚠️  DOCLING INITIALIZATION FAILED")
                print(f"   Error: {str(e)[:100]}")
                print("   Falling back to basic extractors")
                print("!"*80 + "\n")
                self.converter = None
        else:
            logger.warning("❌ Docling not available. Using fallback extractors.")
            print("\n" + "!"*80)
            print("⚠️  DOCLING NOT INSTALLED")
            print("   Install with: pip install docling")
            print("   Falling back to basic extractors")
            print("!"*80 + "\n")

    def extract(
        self, 
        file_content: BinaryIO, 
        filename: str,
        **kwargs
    ) -> ExtractedDocument:
        """
        Extract structured content from document.
        
        Args:
            file_content: Binary file content
            filename: Original filename
            **kwargs: Additional extraction parameters
            
        Returns:
            ExtractedDocument with text, metadata, and sections
        """
        file_ext = Path(filename).suffix.lower()
        
        if file_ext not in self.SUPPORTED_FORMATS:
            raise ValueError(f"Unsupported format: {file_ext}. Supported: {list(self.SUPPORTED_FORMATS.keys())}")
        
        doc_format = self.SUPPORTED_FORMATS[file_ext]
        
        # Try Docling first for supported formats
        if self.converter and doc_format in ['pdf', 'docx', 'html', 'pptx']:
            try:
                logger.warning(f"⚡ DOCLING EXTRACTION: Processing '{filename}' with Docling for high-fidelity extraction...")
                print(f"\n{'='*80}")
                print(f"⚡ DOCLING EXTRACTION ACTIVE")
                print(f"   File: {filename}")
                print(f"   Format: {doc_format.upper()}")
                print(f"   Output will be saved to: {self.output_dir}")
                print(f"{'='*80}\n")
                return self._extract_with_docling(file_content, filename, doc_format)
            except Exception as e:
                logger.warning(f"Docling extraction failed for {filename}: {e}. Trying fallback.")
                print(f"\n{'!'*80}")
                print(f"⚠️  DOCLING EXTRACTION FAILED - USING FALLBACK")
                print(f"   File: {filename}")
                print(f"   Error: {str(e)[:100]}")
                print(f"   Switching to basic {doc_format.upper()} extractor...")
                print(f"{'!'*80}\n")
        else:
            # Log when Docling is not available or format not supported
            if not self.converter:
                logger.warning(f"⚠️  FALLBACK EXTRACTION: Docling not available. Using basic extractor for '{filename}'")
                print(f"\n{'!'*80}")
                print(f"⚠️  FALLBACK EXTRACTION (Docling Not Available)")
                print(f"   File: {filename}")
                print(f"   Format: {doc_format.upper()}")
                print(f"   Using basic extractor - limited structure preservation")
                print(f"{'!'*80}\n")
            else:
                logger.warning(f"⚠️  FALLBACK EXTRACTION: Format '{doc_format}' not supported by Docling. Using basic extractor for '{filename}'")
                print(f"\n{'!'*80}")
                print(f"⚠️  FALLBACK EXTRACTION (Format Not Supported)")
                print(f"   File: {filename}")
                print(f"   Format: {doc_format.upper()}")
                print(f"   Using basic extractor - limited structure preservation")
                print(f"{'!'*80}\n")
        
        # Fallback to format-specific extractors
        extractors = {
            'pdf': self._extract_pdf,
            'docx': self._extract_docx,
            'text': self._extract_text,
            'pptx': self._extract_pptx,
            'html': self._extract_html,
        }
        
        extractor = extractors.get(doc_format)
        if not extractor:
            raise ValueError(f"No extractor available for format: {doc_format}")
        
        return extractor(file_content, filename)

    def _extract_with_docling(
        self, 
        file_content: BinaryIO, 
        filename: str,
        doc_format: str
    ) -> ExtractedDocument:
        """Extract using Docling for maximum structure preservation"""
        
        # Save to temporary file for Docling
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(filename).suffix) as tmp:
            tmp.write(file_content.read())
            tmp_path = tmp.name
        
        try:
            # Convert document
            result = self.converter.convert(tmp_path)
            
            # Create output subdirectory for this document
            doc_name = Path(filename).stem
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            doc_output_dir = self.output_dir / f"{doc_name}_{timestamp}"
            doc_output_dir.mkdir(parents=True, exist_ok=True)
            
            # Save Docling outputs in multiple formats
            try:
                # 1. Save as Markdown
                markdown_content = result.document.export_to_markdown()
                markdown_path = doc_output_dir / f"{doc_name}.md"
                markdown_path.write_text(markdown_content, encoding='utf-8')
                logger.info(f"Saved Markdown: {markdown_path}")
                
                # 2. Save as JSON (structured data)
                try:
                    json_content = result.document.export_to_dict()
                    json_path = doc_output_dir / f"{doc_name}.json"
                    json_path.write_text(json.dumps(json_content, indent=2, ensure_ascii=False, default=str), encoding='utf-8')
                    logger.info(f"Saved JSON: {json_path}")
                except Exception as json_err:
                    logger.warning(f"Could not save JSON export: {json_err}")
                
                # 3. Save as plain text
                text_content = result.document.export_to_text()
                text_path = doc_output_dir / f"{doc_name}.txt"
                text_path.write_text(text_content, encoding='utf-8')
                logger.info(f"Saved Text: {text_path}")
                
                # 4. Save metadata (simplified to avoid serialization issues)
                metadata_info = {
                    'filename': filename,
                    'format': doc_format,
                    'extractor': 'docling',
                    'extraction_timestamp': timestamp,
                    'output_directory': str(doc_output_dir),
                    'exports': {
                        'markdown': str(markdown_path),
                        'json': str(json_path),
                        'text': str(text_path)
                    }
                }
                metadata_path = doc_output_dir / f"{doc_name}_metadata.json"
                metadata_path.write_text(json.dumps(metadata_info, indent=2), encoding='utf-8')
                logger.info(f"Saved Metadata: {metadata_path}")
                
                # Success message
                print(f"\n{'='*80}")
                print(f"✅ DOCLING EXTRACTION SUCCESSFUL")
                print(f"   File: {filename}")
                print(f"   Pages: {getattr(result.document, 'num_pages', 'N/A')}")
                print(f"   Output Directory: {doc_output_dir}")
                print(f"   Saved Formats:")
                print(f"      ├── Markdown: {doc_name}.md")
                print(f"      ├── JSON: {doc_name}.json")
                print(f"      ├── Text: {doc_name}.txt")
                print(f"      └── Metadata: {doc_name}_metadata.json")
                print(f"{'='*80}\n")
                
            except Exception as e:
                logger.error(f"Error saving Docling outputs: {e}")
                print(f"\n{'!'*80}")
                print(f"⚠️  WARNING: Docling extracted content but failed to save outputs")
                print(f"   Error: {str(e)[:100]}")
                print(f"   Extraction will continue with in-memory content")
                print(f"{'!'*80}\n")
            
            # Extract structured content
            text = markdown_content
            
            # Extract sections with hierarchy (with error handling for API changes)
            sections = []
            try:
                # Try to iterate through document elements
                if hasattr(result.document, 'body') and hasattr(result.document.body, 'children'):
                    # Docling 2.x API
                    for element in result.document.body.children:
                        if hasattr(element, 'label') and element.label and 'heading' in str(element.label).lower():
                            sections.append({
                                'title': getattr(element, 'text', str(element))[:100],
                                'content': '',
                                'level': getattr(element, 'level', 1)
                            })
                        elif sections and hasattr(element, 'text'):
                            sections[-1]['content'] += getattr(element, 'text', '') + '\n'
                elif hasattr(result.document, 'body') and hasattr(result.document.body, 'elements'):
                    # Older API
                    for element in result.document.body.elements:
                        if hasattr(element, 'heading_level') and element.heading_level:
                            sections.append({
                                'title': element.text,
                                'content': '',
                                'level': element.heading_level,
                                'page': getattr(element, 'page', None)
                            })
                        elif sections and hasattr(element, 'text'):
                            sections[-1]['content'] += element.text + '\n'
            except Exception as section_err:
                logger.warning(f"Could not extract sections: {section_err}")
                # Create a simple section from the whole text
                sections = [{'title': filename, 'content': text}]
            
            metadata = {
                'filename': filename,
                'format': doc_format,
                'extractor': 'docling',
                'output_directory': str(doc_output_dir),
            }
            
            return ExtractedDocument(
                text=text,
                metadata=metadata,
                sections=sections,
                format=doc_format
            )
            
        finally:
            # Cleanup
            Path(tmp_path).unlink(missing_ok=True)

    def _extract_pdf(self, file_content: BinaryIO, filename: str) -> ExtractedDocument:
        """Fallback PDF extraction using PyPDF2"""
        reader = PdfReader(file_content)
        
        text = ""
        sections = []
        
        for page_num, page in enumerate(reader.pages, 1):
            page_text = page.extract_text()
            text += page_text + "\n\n"
            
            sections.append({
                'title': f'Page {page_num}',
                'content': page_text,
                'page': page_num
            })
        
        metadata = {
            'filename': filename,
            'format': 'pdf',
            'num_pages': len(reader.pages),
            'extractor': 'pypdf2',
        }
        
        return ExtractedDocument(text=text, metadata=metadata, sections=sections, format='pdf')

    def _extract_docx(self, file_content: BinaryIO, filename: str) -> ExtractedDocument:
        """Extract from DOCX with paragraph structure"""
        doc = DocxDocument(file_content)
        
        text = ""
        sections = []
        current_section = None
        
        for para in doc.paragraphs:
            para_text = para.text.strip()
            if not para_text:
                continue
            
            # Detect headings
            if para.style.name.startswith('Heading'):
                if current_section:
                    sections.append(current_section)
                current_section = {
                    'title': para_text,
                    'content': '',
                    'level': int(para.style.name[-1]) if para.style.name[-1].isdigit() else 1
                }
            elif current_section:
                current_section['content'] += para_text + '\n'
            
            text += para_text + '\n'
        
        if current_section:
            sections.append(current_section)
        
        metadata = {
            'filename': filename,
            'format': 'docx',
            'extractor': 'python-docx',
        }
        
        return ExtractedDocument(text=text, metadata=metadata, sections=sections, format='docx')

    def _extract_text(self, file_content: BinaryIO, filename: str) -> ExtractedDocument:
        """Extract plain text"""
        text = file_content.read().decode('utf-8', errors='ignore')
        
        metadata = {
            'filename': filename,
            'format': 'text',
            'extractor': 'plain',
        }
        
        sections = [{'title': filename, 'content': text}]
        
        return ExtractedDocument(text=text, metadata=metadata, sections=sections, format='text')

    def _extract_pptx(self, file_content: BinaryIO, filename: str) -> ExtractedDocument:
        """Extract from PowerPoint with slide structure"""
        prs = Presentation(file_content)
        
        text = ""
        sections = []
        
        for slide_num, slide in enumerate(prs.slides, 1):
            slide_text = ""
            slide_title = f"Slide {slide_num}"
            
            for shape in slide.shapes:
                if hasattr(shape, "text"):
                    shape_text = shape.text.strip()
                    if shape_text:
                        slide_text += shape_text + '\n'
                        # First text is usually title
                        if not slide_title.startswith("Slide"):
                            slide_title = shape_text[:50]
            
            text += slide_text + "\n\n"
            sections.append({
                'title': slide_title,
                'content': slide_text,
                'slide': slide_num
            })
        
        metadata = {
            'filename': filename,
            'format': 'pptx',
            'num_slides': len(prs.slides),
            'extractor': 'python-pptx',
        }
        
        return ExtractedDocument(text=text, metadata=metadata, sections=sections, format='pptx')

    def _extract_html(self, file_content: BinaryIO, filename: str) -> ExtractedDocument:
        """Extract from HTML with structure preservation"""
        html = file_content.read()
        soup = BeautifulSoup(html, 'lxml')
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
        
        text = soup.get_text(separator='\n', strip=True)
        
        # Extract sections from headings
        sections = []
        for heading in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
            level = int(heading.name[1])
            content = []
            
            # Get content until next heading
            for sibling in heading.find_next_siblings():
                if sibling.name and sibling.name.startswith('h') and sibling.name[1].isdigit():
                    break
                if sibling.get_text(strip=True):
                    content.append(sibling.get_text(strip=True))
            
            sections.append({
                'title': heading.get_text(strip=True),
                'content': '\n'.join(content),
                'level': level
            })
        
        metadata = {
            'filename': filename,
            'format': 'html',
            'extractor': 'beautifulsoup4',
        }
        
        return ExtractedDocument(text=text, metadata=metadata, sections=sections, format='html')
