"""
Enterprise-grade document extraction using Docling for structure-aware parsing.
Supports PDF, DOCX, TXT, PPTX, HTML with metadata preservation.
"""

import io
import logging
from pathlib import Path
from typing import Dict, List, Optional, BinaryIO
from dataclasses import dataclass

try:
    from docling.document_converter import DocumentConverter
    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import PdfPipelineOptions
    from docling.backend.pypdfium2_backend import PyPdfiumDocumentBackend
except ImportError:
    # Fallback to basic extraction if docling is not available
    DocumentConverter = None

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

    def __init__(self, use_ocr: bool = False):
        """
        Initialize document extractor.
        
        Args:
            use_ocr: Enable OCR for scanned PDFs (requires tesseract)
        """
        self.use_ocr = use_ocr
        self.converter = None
        
        if DocumentConverter:
            try:
                # Configure Docling pipeline
                pipeline_options = PdfPipelineOptions()
                pipeline_options.do_ocr = use_ocr
                
                self.converter = DocumentConverter(
                    allowed_formats=[
                        InputFormat.PDF,
                        InputFormat.DOCX,
                        InputFormat.HTML,
                        InputFormat.PPTX,
                    ],
                    pipeline_options=pipeline_options,
                )
                logger.info("Docling converter initialized successfully")
            except Exception as e:
                logger.warning(f"Docling initialization failed: {e}. Using fallback extractors.")
                self.converter = None

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
                return self._extract_with_docling(file_content, filename, doc_format)
            except Exception as e:
                logger.warning(f"Docling extraction failed for {filename}: {e}. Trying fallback.")
        
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
            
            # Extract structured content
            text = result.document.export_to_markdown()
            
            # Extract sections with hierarchy
            sections = []
            for element in result.document.body.elements:
                if hasattr(element, 'heading_level') and element.heading_level:
                    # This is a heading
                    sections.append({
                        'title': element.text,
                        'content': '',
                        'level': element.heading_level,
                        'page': getattr(element, 'page', None)
                    })
                elif sections and hasattr(element, 'text'):
                    # Add content to last section
                    sections[-1]['content'] += element.text + '\n'
            
            metadata = {
                'filename': filename,
                'format': doc_format,
                'num_pages': getattr(result.document, 'num_pages', None),
                'extractor': 'docling',
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
