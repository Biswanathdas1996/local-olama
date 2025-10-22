"""
Semantic text chunker with intelligent boundary detection.
Respects document structure and maintains semantic coherence.
"""

import logging
import re
from typing import List, Dict, Optional
from dataclasses import dataclass

try:
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    from langchain_text_splitters import SentenceTransformersTokenTextSplitter
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False

try:
    import nltk
    from nltk.tokenize import sent_tokenize
    NLTK_AVAILABLE = True
except ImportError:
    NLTK_AVAILABLE = False

logger = logging.getLogger(__name__)


@dataclass
class DocumentChunk:
    """Structured document chunk with metadata"""
    text: str
    chunk_id: str
    metadata: Dict[str, any]
    start_char: int
    end_char: int


class SemanticChunker:
    """
    Enterprise-grade text chunker that preserves semantic boundaries.
    
    Features:
    - Respects section boundaries from document structure
    - Token-aware chunking for embedding models
    - Configurable overlap for context preservation
    - Sentence boundary detection for coherence
    """

    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 150,
        respect_structure: bool = True,
        model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    ):
        """
        Initialize semantic chunker.
        
        Args:
            chunk_size: Target token count per chunk (800-1000 recommended)
            chunk_overlap: Overlap between chunks for context (100-150 recommended)
            respect_structure: Prefer splitting at section boundaries
            model_name: Tokenizer model for accurate token counting
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.respect_structure = respect_structure
        self.model_name = model_name
        
        # Initialize NLTK for sentence tokenization
        if NLTK_AVAILABLE:
            try:
                nltk.data.find('tokenizers/punkt')
            except LookupError:
                logger.info("Downloading NLTK punkt tokenizer...")
                try:
                    nltk.download('punkt', quiet=True)
                except:
                    logger.warning("Failed to download NLTK data")
        
        # Initialize chunker
        self._init_chunker()

    def _init_chunker(self):
        """Initialize the appropriate text splitter"""
        if LANGCHAIN_AVAILABLE:
            # Use token-aware splitter for accurate chunk sizing
            try:
                self.splitter = SentenceTransformersTokenTextSplitter(
                    model_name=self.model_name,
                    chunk_overlap=self.chunk_overlap,
                    tokens_per_chunk=self.chunk_size,
                )
                logger.info(f"Initialized token-aware chunker with model: {self.model_name}")
            except Exception as e:
                logger.warning(f"Token splitter failed: {e}. Using character splitter.")
                # Fallback to character-based splitter
                self.splitter = RecursiveCharacterTextSplitter(
                    chunk_size=self.chunk_size * 4,  # Approximate 4 chars per token
                    chunk_overlap=self.chunk_overlap * 4,
                    separators=["\n\n", "\n", ". ", " ", ""],
                    length_function=len,
                )
        else:
            # Manual implementation
            self.splitter = None
            logger.warning("LangChain not available. Using basic chunker.")

    def chunk_text(
        self,
        text: str,
        metadata: Optional[Dict] = None,
        sections: Optional[List[Dict]] = None
    ) -> List[DocumentChunk]:
        """
        Chunk text with semantic boundary awareness.
        
        Args:
            text: Text content to chunk
            metadata: Document metadata to attach to chunks
            sections: Optional section structure from document extractor
            
        Returns:
            List of DocumentChunk objects
        """
        if not text or not text.strip():
            return []
        
        metadata = metadata or {}
        chunks = []
        
        # If sections provided and structure respect enabled, chunk by section
        if self.respect_structure and sections:
            chunks = self._chunk_by_sections(text, sections, metadata)
        else:
            chunks = self._chunk_flat(text, metadata)
        
        return chunks

    def _chunk_by_sections(
        self,
        text: str,
        sections: List[Dict],
        metadata: Dict
    ) -> List[DocumentChunk]:
        """Chunk while respecting document section boundaries"""
        chunks = []
        
        for idx, section in enumerate(sections):
            section_title = section.get('title', f'Section {idx + 1}')
            section_content = section.get('content', '')
            
            if not section_content.strip():
                continue
            
            # Prepend section title for context
            full_section = f"## {section_title}\n\n{section_content}"
            
            # Chunk this section
            section_chunks = self._split_text(full_section)
            
            for chunk_idx, chunk_text in enumerate(section_chunks):
                chunk_metadata = {
                    **metadata,
                    'section': section_title,
                    'section_index': idx,
                    'chunk_in_section': chunk_idx,
                }
                
                # Only add page/slide if they exist and are not None
                if section.get('page') is not None:
                    chunk_metadata['page'] = section.get('page')
                if section.get('slide') is not None:
                    chunk_metadata['slide'] = section.get('slide')
                
                chunk_id = f"{metadata.get('filename', 'doc')}_{idx}_{chunk_idx}"
                
                chunks.append(DocumentChunk(
                    text=chunk_text,
                    chunk_id=chunk_id,
                    metadata=chunk_metadata,
                    start_char=0,  # Would need full document for accurate position
                    end_char=len(chunk_text)
                ))
        
        return chunks

    def _chunk_flat(self, text: str, metadata: Dict) -> List[DocumentChunk]:
        """Chunk text without section awareness"""
        chunk_texts = self._split_text(text)
        chunks = []
        
        for idx, chunk_text in enumerate(chunk_texts):
            chunk_metadata = {
                **metadata,
                'chunk_index': idx,
            }
            
            chunk_id = f"{metadata.get('filename', 'doc')}_{idx}"
            
            chunks.append(DocumentChunk(
                text=chunk_text,
                chunk_id=chunk_id,
                metadata=chunk_metadata,
                start_char=0,
                end_char=len(chunk_text)
            ))
        
        return chunks

    def _split_text(self, text: str) -> List[str]:
        """Split text using configured splitter or fallback"""
        if self.splitter:
            # Use LangChain splitter
            return self.splitter.split_text(text)
        else:
            # Fallback: manual sentence-based splitting
            return self._manual_split(text)

    def _manual_split(self, text: str) -> List[str]:
        """Manual sentence-aware splitting when LangChain unavailable"""
        # Split into sentences
        if NLTK_AVAILABLE:
            sentences = sent_tokenize(text)
        else:
            # Very basic sentence splitting
            sentences = re.split(r'[.!?]+\s+', text)
        
        chunks = []
        current_chunk = []
        current_length = 0
        approx_chunk_size = self.chunk_size * 4  # 4 chars ≈ 1 token
        approx_overlap = self.chunk_overlap * 4
        
        for sentence in sentences:
            sentence_length = len(sentence)
            
            if current_length + sentence_length > approx_chunk_size and current_chunk:
                # Finalize current chunk
                chunks.append(' '.join(current_chunk))
                
                # Keep overlap sentences
                overlap_text = ' '.join(current_chunk)
                while len(overlap_text) > approx_overlap and current_chunk:
                    current_chunk.pop(0)
                    overlap_text = ' '.join(current_chunk)
                
                current_length = len(overlap_text)
            
            current_chunk.append(sentence)
            current_length += sentence_length
        
        # Add final chunk
        if current_chunk:
            chunks.append(' '.join(current_chunk))
        
        return chunks

    def get_optimal_chunk_size(self, avg_doc_length: int) -> int:
        """
        Recommend optimal chunk size based on document characteristics.
        
        Args:
            avg_doc_length: Average document length in characters
            
        Returns:
            Recommended chunk size in tokens
        """
        # General heuristics
        if avg_doc_length < 5000:
            return 500  # Smaller chunks for short docs
        elif avg_doc_length < 20000:
            return 1000  # Standard size
        else:
            return 1200  # Larger chunks for long documents
