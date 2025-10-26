"""
Image processing module for extracting and analyzing visual content from documents.
Uses PaddleOCR for text extraction and provides chart/diagram context description.

Processing Pipeline:
1. OCR Engine (PaddleOCR) → Extract text labels, titles, legends, axis labels
2. Chart Parser → Extract numerical data and chart context
3. Description Generation → Create comprehensive text description
4. Chunking → Prepare text for embedding
5. Embedding → Generate vectors for retrieval
"""

import logging
import io
from pathlib import Path
from typing import List, Dict, Optional, Tuple, Union, BinaryIO
from dataclasses import dataclass
from datetime import datetime
import json
import base64

try:
    from paddleocr import PaddleOCR
    PADDLEOCR_AVAILABLE = True
except ImportError:
    PADDLEOCR_AVAILABLE = False
    PaddleOCR = None

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    Image = None

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class ImageContent:
    """Structured image content extraction result"""
    image_id: str
    ocr_text: str  # All text extracted from image
    structured_data: Dict[str, any]  # Chart data, table data, etc.
    description: str  # Comprehensive natural language description
    image_type: str  # 'chart', 'diagram', 'table', 'text', 'photo', 'unknown'
    metadata: Dict[str, any]
    image_path: Optional[str] = None
    thumbnail_path: Optional[str] = None


@dataclass
class ChartData:
    """Extracted chart/graph data"""
    chart_type: str  # 'bar', 'line', 'pie', 'scatter', etc.
    title: Optional[str]
    axis_labels: Dict[str, str]  # {'x': 'Year', 'y': 'Revenue'}
    legend_items: List[str]
    data_points: List[Dict]  # Numerical data if extractable
    text_elements: List[str]  # All text found in chart


class ImageProcessor:
    """
    Enterprise-grade image processor for document analysis.
    
    Features:
    - OCR text extraction (PaddleOCR)
    - Chart/diagram understanding
    - Automatic image type classification
    - Descriptive context generation for embeddings
    """

    IMAGE_TYPES = {
        'chart': ['bar', 'line', 'pie', 'graph', 'plot', 'chart'],
        'table': ['table', 'grid', 'spreadsheet'],
        'diagram': ['diagram', 'flowchart', 'architecture', 'schema'],
        'text': ['document', 'page', 'text'],
        'photo': ['photo', 'image', 'picture'],
    }

    def __init__(
        self,
        use_gpu: Optional[bool] = None,
        lang: str = 'en',
        output_dir: Optional[str] = None,
        enable_chart_parsing: bool = True
    ):
        """
        Initialize image processor.
        
        Args:
            use_gpu: Use GPU acceleration for OCR (requires CUDA). 
                    If None, auto-detect GPU availability
            lang: Language for OCR ('en', 'ch', etc.)
            output_dir: Directory to save processed images and data
            enable_chart_parsing: Enable advanced chart data extraction
        """
        # Auto-detect GPU if not specified
        if use_gpu is None:
            try:
                import torch
                use_gpu = torch.cuda.is_available()
                if use_gpu:
                    logger.info(f"🎮 GPU detected: {torch.cuda.get_device_name(0)}")
                    print(f"\n{'='*80}")
                    print(f"🎮 GPU AUTO-DETECTED")
                    print(f"   Device: {torch.cuda.get_device_name(0)}")
                    print(f"   CUDA Version: {torch.version.cuda}")
                    print(f"   Enabling GPU acceleration for PaddleOCR")
                    print(f"{'='*80}\n")
                else:
                    logger.info("No GPU detected, using CPU for PaddleOCR")
            except ImportError:
                logger.info("PyTorch not available, using CPU for PaddleOCR")
                use_gpu = False
        
        self.use_gpu = use_gpu
        self.lang = lang
        self.enable_chart_parsing = enable_chart_parsing
        
        # Setup output directory
        if output_dir:
            self.output_dir = Path(output_dir)
        else:
            self.output_dir = Path("data/processed_images")
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize OCR
        self.ocr = None
        if PADDLEOCR_AVAILABLE:
            try:
                # PaddleOCR 3.x auto-detects and uses GPU if available
                # Use minimal parameters for compatibility
                ocr_params = {
                    'use_textline_orientation': True,  # Updated from deprecated use_angle_cls
                    'lang': lang
                }
                
                # Initialize - PaddleOCR 3.x auto-detects and uses GPU if available
                self.ocr = PaddleOCR(**ocr_params)
                
                logger.info(f"✅ PaddleOCR initialized (GPU: {use_gpu}, Lang: {lang})")
                print(f"\n{'='*80}")
                print(f"✅ IMAGE PROCESSOR INITIALIZED")
                print(f"   OCR Engine: PaddleOCR")
                print(f"   GPU Auto-detect: Enabled")
                print(f"   Language: {lang}")
                print(f"   Chart Parsing: {enable_chart_parsing}")
                print(f"   Output Directory: {self.output_dir}")
                print(f"{'='*80}\n")
            except Exception as e:
                logger.error(f"Failed to initialize PaddleOCR: {e}")
                self.ocr = None
                print(f"\n{'!'*80}")
                print(f"⚠️  PADDLEOCR INITIALIZATION FAILED")
                print(f"   Error: {str(e)[:100]}")
                print(f"   Image processing will be limited")
                print(f"{'!'*80}\n")
        else:
            logger.warning("PaddleOCR not available. Image processing will be limited.")
            print(f"\n{'!'*80}")
            print(f"⚠️  PADDLEOCR NOT INSTALLED")
            print(f"   Install with: pip install paddleocr")
            print(f"   Image processing will be limited")
            print(f"{'!'*80}\n")
        
        if not PIL_AVAILABLE:
            logger.warning("PIL not available. Cannot process images.")
            raise ImportError("Pillow is required. Install with: pip install Pillow")

    def process_image(
        self,
        image_source: Union[str, Path, BinaryIO, Image.Image],
        image_id: Optional[str] = None,
        metadata: Optional[Dict] = None,
        save_output: bool = True
    ) -> ImageContent:
        """
        Process an image and extract all relevant information.
        
        Args:
            image_source: Path, bytes, or PIL Image
            image_id: Unique identifier for this image
            metadata: Additional metadata (source document, page, etc.)
            save_output: Save processed image and extracted data
            
        Returns:
            ImageContent with OCR text, structured data, and description
        """
        # Load image
        if isinstance(image_source, (str, Path)):
            img = Image.open(image_source)
            if image_id is None:
                image_id = Path(image_source).stem
        elif isinstance(image_source, Image.Image):
            img = image_source
        else:
            # Assume bytes-like object
            img = Image.open(image_source)
        
        # Generate ID if not provided
        if image_id is None:
            image_id = f"img_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
        
        metadata = metadata or {}
        
        logger.info(f"Processing image: {image_id}")
        
        # Convert to RGB if needed
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Step 1: OCR text extraction
        ocr_text, text_elements = self._extract_ocr_text(img)
        logger.info(f"Extracted {len(text_elements)} text elements via OCR")
        
        # Step 2: Classify image type
        image_type = self._classify_image_type(ocr_text, text_elements, metadata)
        logger.info(f"Image classified as: {image_type}")
        
        # Step 3: Extract structured data (charts, tables)
        structured_data = {}
        if self.enable_chart_parsing and image_type in ['chart', 'table']:
            structured_data = self._extract_structured_data(
                img, ocr_text, text_elements, image_type
            )
        
        # Step 4: Generate comprehensive description
        description = self._generate_description(
            ocr_text, structured_data, image_type, text_elements, metadata
        )
        logger.info(f"Generated description ({len(description)} chars)")
        
        # Step 5: Save outputs if requested
        image_path = None
        thumbnail_path = None
        if save_output:
            image_path, thumbnail_path = self._save_image_outputs(
                img, image_id, ocr_text, structured_data, description, metadata
            )
        
        return ImageContent(
            image_id=image_id,
            ocr_text=ocr_text,
            structured_data=structured_data,
            description=description,
            image_type=image_type,
            metadata={
                **metadata,
                'ocr_elements_count': len(text_elements),
                'has_structured_data': bool(structured_data),
                'image_width': img.size[0],
                'image_height': img.size[1],
                'processing_timestamp': datetime.now().isoformat()
            },
            image_path=str(image_path) if image_path else None,
            thumbnail_path=str(thumbnail_path) if thumbnail_path else None
        )

    def _extract_ocr_text(self, img: Image.Image) -> Tuple[str, List[Dict]]:
        """Extract text using PaddleOCR"""
        if not self.ocr:
            logger.warning("OCR not available, returning empty text")
            return "", []
        
        try:
            # Convert PIL Image to numpy array
            img_array = np.array(img)
            
            # Run OCR (removed cls parameter for compatibility)
            result = self.ocr.ocr(img_array)
            
            # Debug: Log result structure
            logger.info(f"🔍 OCR result type: {type(result)}")
            if result:
                logger.info(f"🔍 OCR result length: {len(result)}")
                if result[0]:
                    logger.info(f"🔍 First page type: {type(result[0])}")
                    if result[0] and len(result[0]) > 0:
                        logger.info(f"🔍 First line structure: {result[0][0]}")
                        logger.info(f"🔍 First line type: {type(result[0][0])}")
                        logger.info(f"🔍 First line length: {len(result[0][0])}")
            
            # Extract text elements
            text_elements = []
            all_text = []
            
            if result and result[0]:
                for line in result[0]:
                    if line:
                        try:
                            # PaddleOCR format: [bbox, (text, confidence)]
                            # But might also be: [bbox, text, confidence] in some versions
                            if len(line) == 2:
                                bbox, text_info = line
                                if isinstance(text_info, (list, tuple)) and len(text_info) == 2:
                                    text, confidence = text_info
                                else:
                                    # text_info is just the text
                                    text = str(text_info)
                                    confidence = 1.0
                            elif len(line) == 3:
                                # Alternative format: [bbox, text, confidence]
                                bbox, text, confidence = line
                            else:
                                logger.warning(f"Unexpected OCR line format: {line}")
                                continue
                            
                            text_elements.append({
                                'text': text,
                                'confidence': confidence,
                                'bbox': bbox,
                                'position': self._calculate_position(bbox, img.size)
                            })
                            all_text.append(text)
                        except Exception as parse_err:
                            logger.warning(f"Failed to parse OCR line: {parse_err}, line={line}")
                            continue
            
            # Combine all text with spacing
            ocr_text = ' '.join(all_text)
            
            return ocr_text, text_elements
            
        except Exception as e:
            logger.error(f"OCR extraction failed: {e}")
            return "", []

    def _calculate_position(self, bbox: List, image_size: Tuple[int, int]) -> str:
        """Calculate relative position of text in image (top, center, bottom, etc.)"""
        # bbox is [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
        center_y = sum([p[1] for p in bbox]) / 4
        img_height = image_size[1]
        
        if center_y < img_height * 0.2:
            return 'top'
        elif center_y < img_height * 0.4:
            return 'upper'
        elif center_y < img_height * 0.6:
            return 'center'
        elif center_y < img_height * 0.8:
            return 'lower'
        else:
            return 'bottom'

    def _classify_image_type(
        self,
        ocr_text: str,
        text_elements: List[Dict],
        metadata: Dict
    ) -> str:
        """Classify image type based on OCR text and metadata"""
        ocr_lower = ocr_text.lower()
        
        # Check for keywords
        for img_type, keywords in self.IMAGE_TYPES.items():
            if any(keyword in ocr_lower for keyword in keywords):
                return img_type
        
        # Check for numeric patterns (likely chart)
        if self._has_numeric_pattern(text_elements):
            return 'chart'
        
        # Default
        return 'unknown'

    def _has_numeric_pattern(self, text_elements: List[Dict]) -> bool:
        """Check if text elements contain numeric patterns suggesting a chart"""
        numeric_count = 0
        for elem in text_elements:
            text = elem['text']
            # Check for numbers, percentages, currency
            if any(char.isdigit() for char in text) or '%' in text or '$' in text:
                numeric_count += 1
        
        # If >30% of elements are numeric, likely a chart
        return numeric_count > len(text_elements) * 0.3 if text_elements else False

    def _extract_structured_data(
        self,
        img: Image.Image,
        ocr_text: str,
        text_elements: List[Dict],
        image_type: str
    ) -> Dict:
        """Extract structured data from charts/tables"""
        if image_type == 'chart':
            return self._parse_chart_data(text_elements)
        elif image_type == 'table':
            return self._parse_table_data(text_elements)
        return {}

    def _parse_chart_data(self, text_elements: List[Dict]) -> Dict:
        """Parse chart elements to extract structured data"""
        chart_data = {
            'chart_type': 'unknown',
            'title': None,
            'axis_labels': {},
            'legend_items': [],
            'data_points': [],
            'text_elements': []
        }
        
        # Group elements by position
        top_elements = [e for e in text_elements if e['position'] == 'top']
        center_elements = [e for e in text_elements if e['position'] == 'center']
        bottom_elements = [e for e in text_elements if e['position'] == 'bottom']
        
        # Title is usually at the top
        if top_elements:
            chart_data['title'] = top_elements[0]['text']
        
        # Collect all text
        chart_data['text_elements'] = [e['text'] for e in text_elements]
        
        # Extract numeric values as data points
        for elem in text_elements:
            text = elem['text']
            if any(char.isdigit() for char in text):
                chart_data['data_points'].append({
                    'value': text,
                    'position': elem['position']
                })
        
        return chart_data

    def _parse_table_data(self, text_elements: List[Dict]) -> Dict:
        """Parse table structure from text elements"""
        return {
            'table_type': 'unknown',
            'rows': len(text_elements),  # Simplified
            'cells': [e['text'] for e in text_elements]
        }

    def _generate_description(
        self,
        ocr_text: str,
        structured_data: Dict,
        image_type: str,
        text_elements: List[Dict],
        metadata: Dict
    ) -> str:
        """
        Generate comprehensive natural language description for embedding.
        
        This description will be chunked and embedded for retrieval.
        """
        description_parts = []
        
        # 1. Image type and context
        description_parts.append(f"This is a {image_type} image")
        
        # 2. Source information
        if metadata.get('source_document'):
            description_parts.append(f"from document '{metadata['source_document']}'")
        if metadata.get('page_number'):
            description_parts.append(f"on page {metadata['page_number']}")
        
        # 3. OCR text content
        if ocr_text:
            description_parts.append(f"\n\nText content extracted from image: {ocr_text}")
        
        # 4. Structured data description
        if structured_data:
            if image_type == 'chart':
                chart_desc = self._describe_chart(structured_data)
                description_parts.append(f"\n\n{chart_desc}")
            elif image_type == 'table':
                table_desc = self._describe_table(structured_data)
                description_parts.append(f"\n\n{table_desc}")
        
        # 5. Key elements summary
        if text_elements:
            key_elements = [e['text'] for e in text_elements[:10]]  # Top 10
            description_parts.append(
                f"\n\nKey elements: {', '.join(key_elements)}"
            )
        
        # 6. Visual characteristics (if metadata provided)
        if metadata.get('image_size'):
            description_parts.append(
                f"\n\nImage dimensions: {metadata['image_size'][0]}x{metadata['image_size'][1]} pixels"
            )
        
        return ' '.join(description_parts)

    def _describe_chart(self, chart_data: Dict) -> str:
        """Generate natural language description of chart"""
        parts = []
        
        if chart_data.get('title'):
            parts.append(f"Chart titled '{chart_data['title']}'")
        
        if chart_data.get('chart_type') != 'unknown':
            parts.append(f"of type {chart_data['chart_type']}")
        
        if chart_data.get('axis_labels'):
            axes = ', '.join([f"{k}: {v}" for k, v in chart_data['axis_labels'].items()])
            parts.append(f"with axes {axes}")
        
        if chart_data.get('legend_items'):
            parts.append(f"showing data series: {', '.join(chart_data['legend_items'])}")
        
        if chart_data.get('data_points'):
            data_count = len(chart_data['data_points'])
            parts.append(f"containing {data_count} data points")
        
        if chart_data.get('text_elements'):
            parts.append(f"All text in chart: {' '.join(chart_data['text_elements'])}")
        
        return '. '.join(parts) + '.' if parts else "Chart with extracted data."

    def _describe_table(self, table_data: Dict) -> str:
        """Generate natural language description of table"""
        parts = []
        
        if table_data.get('rows'):
            parts.append(f"Table with approximately {table_data['rows']} rows")
        
        if table_data.get('cells'):
            parts.append(f"containing data: {' | '.join(table_data['cells'][:20])}")  # First 20 cells
        
        return '. '.join(parts) + '.' if parts else "Table with extracted data."

    def _save_image_outputs(
        self,
        img: Image.Image,
        image_id: str,
        ocr_text: str,
        structured_data: Dict,
        description: str,
        metadata: Dict
    ) -> Tuple[Path, Path]:
        """Save image and extracted data to disk"""
        # Create subdirectory for this image
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        image_dir = self.output_dir / f"{image_id}_{timestamp}"
        image_dir.mkdir(parents=True, exist_ok=True)
        
        # Save original image
        image_path = image_dir / f"{image_id}.png"
        img.save(image_path, 'PNG')
        
        # Save thumbnail
        thumbnail_path = image_dir / f"{image_id}_thumb.png"
        thumbnail = img.copy()
        thumbnail.thumbnail((300, 300))
        thumbnail.save(thumbnail_path, 'PNG')
        
        # Save extracted data as JSON
        data_path = image_dir / f"{image_id}_data.json"
        data = {
            'image_id': image_id,
            'ocr_text': ocr_text,
            'structured_data': structured_data,
            'description': description,
            'metadata': metadata,
            'paths': {
                'image': str(image_path),
                'thumbnail': str(thumbnail_path)
            }
        }
        data_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
        
        logger.info(f"Saved image outputs to: {image_dir}")
        
        return image_path, thumbnail_path

    def chunk_image_description(
        self,
        image_content: ImageContent,
        chunk_size: int = 500,
        overlap: int = 50
    ) -> List[Dict]:
        """
        Chunk image description for embedding.
        
        Each chunk maintains reference to the source image.
        
        Returns:
            List of chunk dictionaries ready for embedding
        """
        description = image_content.description
        
        # Simple sentence-based chunking
        sentences = description.split('. ')
        
        chunks = []
        current_chunk = []
        current_length = 0
        
        for sentence in sentences:
            sentence_length = len(sentence)
            
            if current_length + sentence_length > chunk_size and current_chunk:
                # Finalize chunk
                chunk_text = '. '.join(current_chunk) + '.'
                chunks.append({
                    'text': chunk_text,
                    'chunk_id': f"{image_content.image_id}_chunk_{len(chunks)}",
                    'metadata': {
                        **image_content.metadata,
                        'content_type': 'image_description',
                        'image_id': image_content.image_id,
                        'image_type': image_content.image_type,
                        'image_path': image_content.image_path,
                        'has_ocr_text': bool(image_content.ocr_text),
                        'chunk_index': len(chunks)
                    }
                })
                
                # Keep overlap
                current_chunk = current_chunk[-2:] if len(current_chunk) > 2 else []
                current_length = sum(len(s) for s in current_chunk)
            
            current_chunk.append(sentence)
            current_length += sentence_length
        
        # Add final chunk
        if current_chunk:
            chunk_text = '. '.join(current_chunk) + '.'
            chunks.append({
                'text': chunk_text,
                'chunk_id': f"{image_content.image_id}_chunk_{len(chunks)}",
                'metadata': {
                    **image_content.metadata,
                    'content_type': 'image_description',
                    'image_id': image_content.image_id,
                    'image_type': image_content.image_type,
                    'image_path': image_content.image_path,
                    'has_ocr_text': bool(image_content.ocr_text),
                    'chunk_index': len(chunks)
                }
            })
        
        return chunks

    def get_processor_info(self) -> Dict:
        """Get information about image processor configuration"""
        return {
            'ocr_available': self.ocr is not None,
            'ocr_engine': 'PaddleOCR' if self.ocr else None,
            'gpu_enabled': self.use_gpu,
            'language': self.lang,
            'chart_parsing_enabled': self.enable_chart_parsing,
            'output_directory': str(self.output_dir),
        }


# Global instance for memory efficiency
_global_image_processor: Optional[ImageProcessor] = None


def get_image_processor(**kwargs) -> ImageProcessor:
    """Get or create global image processor instance (singleton pattern)"""
    global _global_image_processor
    
    if _global_image_processor is None:
        _global_image_processor = ImageProcessor(**kwargs)
    
    return _global_image_processor
