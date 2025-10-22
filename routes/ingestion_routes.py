"""
Document ingestion and hybrid search API routes.
Endpoints for uploading documents, searching, and managing indices.
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Form
from pydantic import BaseModel, Field

from core import (
    DocumentExtractor,
    SemanticChunker,
    LocalEmbedder,
    KeywordExtractor,
    VectorStoreManager,
    HybridSearchEngine,
)
from core.embedder import get_embedder
from core.vector_store import get_vector_store
from core.hybrid_search import get_hybrid_search
from core.keyword_extractor import get_keyword_extractor
from utils.config import get_settings
from utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/rag", tags=["Document Ingestion & Search"])


def clean_metadata(metadata: dict) -> dict:
    """Remove None values from metadata to prevent ChromaDB errors"""
    return {k: v for k, v in metadata.items() if v is not None}

# Get settings
settings = get_settings()

# Initialize components (lazy loading)
_doc_extractor = None
_text_chunker = None
_embedder = None
_keyword_extractor = None
_vector_store = None
_hybrid_search = None


def get_doc_extractor() -> DocumentExtractor:
    """Get or create document extractor"""
    global _doc_extractor
    if _doc_extractor is None:
        _doc_extractor = DocumentExtractor(use_ocr=settings.use_ocr)
    return _doc_extractor


def get_text_chunker() -> SemanticChunker:
    """Get or create text chunker"""
    global _text_chunker
    if _text_chunker is None:
        _text_chunker = SemanticChunker(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
            respect_structure=settings.respect_doc_structure,
            model_name=settings.embedding_model
        )
    return _text_chunker


def get_local_embedder() -> LocalEmbedder:
    """Get or create embedder"""
    global _embedder
    if _embedder is None:
        _embedder = get_embedder(model_name=settings.embedding_model)
    return _embedder


def get_kw_extractor() -> KeywordExtractor:
    """Get or create keyword extractor"""
    global _keyword_extractor
    if _keyword_extractor is None and settings.extract_keywords:
        _keyword_extractor = get_keyword_extractor()
    return _keyword_extractor


def get_vs() -> VectorStoreManager:
    """Get or create vector store"""
    global _vector_store
    if _vector_store is None:
        _vector_store = get_vector_store(persist_directory=settings.vector_store_path)
    return _vector_store


def get_hs() -> HybridSearchEngine:
    """Get or create hybrid search"""
    global _hybrid_search
    if _hybrid_search is None:
        vs = get_vs()
        _hybrid_search = HybridSearchEngine(
            vector_store=vs,
            keyword_index_dir=settings.keyword_index_path,
            semantic_weight=settings.semantic_weight,
            lexical_weight=settings.lexical_weight
        )
    return _hybrid_search


# Response Models
class IngestionResponse(BaseModel):
    """Response for document ingestion"""
    success: bool
    message: str
    index_name: str
    chunks_created: int
    filename: str


class SearchResult(BaseModel):
    """Single search result"""
    text: str
    score: float
    metadata: dict
    chunk_id: str


class SearchResponse(BaseModel):
    """Response for search queries"""
    query: str
    results: List[SearchResult]
    total_results: int
    search_type: str


class IndexInfo(BaseModel):
    """Information about an index"""
    name: str
    document_count: int
    metadata: dict


class IndicesResponse(BaseModel):
    """Response listing all indices"""
    indices: List[IndexInfo]
    total_indices: int


# API Endpoints

@router.post("/ingest-doc", response_model=IngestionResponse)
async def ingest_document(
    file: UploadFile = File(..., description="Document file (PDF, DOCX, TXT, PPTX, HTML)"),
    index_name: str = Form(..., description="Index name to store document"),
):
    """
    Ingest a document into the RAG system.
    
    Process:
    1. Extract text with structure preservation (Docling)
    2. Chunk intelligently respecting boundaries
    3. Generate embeddings (state-of-the-art local model)
    4. Extract keywords for hybrid search
    5. Store in vector + keyword indices
    
    Supported formats: PDF, DOCX, TXT, PPTX, HTML
    """
    try:
        logger.info(f"Starting ingestion: {file.filename} -> {index_name}")
        
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        # Read file content
        file_content = await file.read()
        
        # Step 1: Extract document
        extractor = get_doc_extractor()
        from io import BytesIO
        extracted_doc = extractor.extract(
            BytesIO(file_content),
            filename=file.filename
        )
        
        logger.info(f"Extracted {len(extracted_doc.sections)} sections from {file.filename}")
        
        # Step 2: Chunk text
        chunker = get_text_chunker()
        chunks = chunker.chunk_text(
            text=extracted_doc.text,
            metadata=extracted_doc.metadata,
            sections=extracted_doc.sections
        )
        
        logger.info(f"Created {len(chunks)} chunks")
        
        if not chunks:
            raise HTTPException(status_code=400, detail="No content extracted from document")
        
        # Step 3: Generate embeddings
        embedder = get_local_embedder()
        chunk_texts = [chunk.text for chunk in chunks]
        embeddings = embedder.embed_documents(chunk_texts, show_progress=False)
        
        logger.info(f"Generated {len(embeddings)} embeddings")
        
        # Step 4: Extract keywords (if enabled)
        keyword_docs = []
        if settings.extract_keywords:
            try:
                kw_extractor = get_kw_extractor()
                if kw_extractor:
                    logger.info("Extracting keywords from chunks...")
                    for chunk in chunks:
                        try:
                            keywords = kw_extractor.extract_keywords(
                                chunk.text,
                                top_n=settings.keywords_per_chunk
                            )
                            if keywords:  # Only add if keywords were extracted
                                keyword_docs.append({
                                    'id': chunk.chunk_id,
                                    'content': chunk.text,
                                    'keywords': ' '.join(keywords),
                                    'metadata': chunk.metadata
                                })
                        except Exception as e:
                            logger.warning(f"Failed to extract keywords for chunk {chunk.chunk_id}: {e}")
                            # Still add document without keywords for content search
                            keyword_docs.append({
                                'id': chunk.chunk_id,
                                'content': chunk.text,
                                'keywords': '',
                                'metadata': chunk.metadata
                            })
                    logger.info(f"Extracted keywords for {len(keyword_docs)} chunks")
                else:
                    logger.warning("Keyword extractor not available. Skipping keyword extraction.")
            except Exception as e:
                logger.error(f"Keyword extraction failed: {e}. Continuing without keywords.")
                # Create keyword docs with just content for basic lexical search
                keyword_docs = [{
                    'id': chunk.chunk_id,
                    'content': chunk.text,
                    'keywords': '',
                    'metadata': chunk.metadata
                } for chunk in chunks]
        
        # Step 5: Store in vector store
        vs = get_vs()
        
        # Create collection if doesn't exist
        if index_name not in vs.list_collections():
            vs.create_collection(
                name=index_name,
                metadata={'source': 'ingestion_api'},
                embedding_dimension=embedder.dimension
            )
        
        # Add documents with cleaned metadata (remove None values)
        cleaned_metadatas = [clean_metadata(chunk.metadata) for chunk in chunks]
        
        success = vs.add_documents(
            collection_name=index_name,
            texts=chunk_texts,
            embeddings=embeddings,
            metadatas=cleaned_metadatas,
            ids=[chunk.chunk_id for chunk in chunks]
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to store in vector database")
        
        # Step 6: Store in keyword index (if keywords extracted)
        if keyword_docs:
            hs = get_hs()
            hs.add_to_keyword_index(index_name, keyword_docs)
        
        logger.info(f"Successfully ingested {file.filename} into {index_name}")
        
        return IngestionResponse(
            success=True,
            message=f"Document ingested successfully",
            index_name=index_name,
            chunks_created=len(chunks),
            filename=file.filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ingestion failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")


@router.get("/search", response_model=SearchResponse)
async def search_documents(
    query: str = Query(..., description="Natural language search query"),
    index_name: str = Query(..., description="Index to search"),
    top_k: int = Query(default=None, description="Number of results (default from config)"),
    search_type: str = Query(default='hybrid', description="Search type: 'hybrid', 'semantic', or 'lexical'")
):
    """
    Search documents using hybrid retrieval (semantic + lexical).
    
    Combines:
    - Semantic similarity via vector search
    - Keyword matching via BM25
    - Weighted score fusion
    
    Returns top-k most relevant chunks with metadata.
    """
    try:
        top_k = top_k or settings.default_top_k
        
        logger.info(f"Searching '{query}' in {index_name} (type: {search_type}, top_k: {top_k})")
        
        # Verify index exists
        vs = get_vs()
        available_indices = vs.list_collections()
        logger.info(f"Available indices: {available_indices}")
        
        if index_name not in available_indices:
            raise HTTPException(
                status_code=404, 
                detail=f"Index '{index_name}' not found. Available indices: {', '.join(available_indices) if available_indices else 'none'}"
            )
        
        # Generate query embedding
        logger.info(f"Generating query embedding for: '{query}'")
        embedder = get_local_embedder()
        query_embedding = embedder.embed_query(query)
        logger.info(f"Query embedding generated: shape {query_embedding.shape if hasattr(query_embedding, 'shape') else len(query_embedding)}")
        
        # Perform search
        logger.info(f"Performing {search_type} search...")
        hs = get_hs()
        results = hs.search(
            collection_name=index_name,
            query_text=query,
            query_embedding=query_embedding,
            top_k=top_k,
            search_type=search_type
        )
        
        logger.info(f"Search returned {len(results)} raw results")
        
        # Format results
        search_results = []
        if not results:
            logger.warning(f"No results found for query: '{query}' in index: '{index_name}'")
        else:
            logger.info(f"Processing {len(results)} results")
            
        for result in results:
            # Determine score based on search type
            if search_type == 'hybrid':
                score = result.get('hybrid_score', 0)
            elif search_type == 'semantic':
                score = result.get('semantic_score', 0)
            else:  # lexical
                score = result.get('lexical_score', 0)
            
            logger.debug(f"Result {result.get('id')}: score={score}, source={result.get('source')}")
            
            search_results.append(SearchResult(
                text=result.get('text', ''),
                score=round(score, 4),
                metadata=result.get('metadata', {}),
                chunk_id=result.get('id', 'unknown')
            ))
        
        logger.info(f"Returning {len(search_results)} formatted results")
        
        return SearchResponse(
            query=query,
            results=search_results,
            total_results=len(search_results),
            search_type=search_type
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Search failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.get("/indices", response_model=IndicesResponse)
async def list_indices():
    """
    List all available document indices.
    
    Returns collection names with document counts and metadata.
    """
    try:
        vs = get_vs()
        collection_names = vs.list_collections()
        
        indices = []
        for name in collection_names:
            info = vs.get_collection_info(name)
            if info:
                indices.append(IndexInfo(
                    name=info['name'],
                    document_count=info['count'],
                    metadata=info.get('metadata', {})
                ))
        
        return IndicesResponse(
            indices=indices,
            total_indices=len(indices)
        )
        
    except Exception as e:
        logger.error(f"Failed to list indices: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to list indices: {str(e)}")


@router.delete("/indices/{index_name}")
async def delete_index(index_name: str):
    """
    Delete an index and all its documents.
    
    Removes both vector store collection and keyword index.
    """
    try:
        vs = get_vs()
        hs = get_hs()
        
        # Delete vector collection
        vs_success = vs.delete_collection(index_name)
        
        # Delete keyword index
        kw_success = hs.delete_keyword_index(index_name)
        
        if vs_success:
            return {
                "success": True,
                "message": f"Index '{index_name}' deleted successfully",
                "vector_store_deleted": vs_success,
                "keyword_index_deleted": kw_success
            }
        else:
            raise HTTPException(status_code=404, detail=f"Index '{index_name}' not found")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete index: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")


@router.get("/stats")
async def get_statistics():
    """
    Get system statistics.
    
    Returns information about all indices, model info, and configuration.
    """
    try:
        vs = get_vs()
        embedder = get_local_embedder()
        
        stats = vs.get_statistics()
        model_info = embedder.get_model_info()
        
        return {
            "vector_store": stats,
            "embedding_model": model_info,
            "configuration": {
                "chunk_size": settings.chunk_size,
                "chunk_overlap": settings.chunk_overlap,
                "semantic_weight": settings.semantic_weight,
                "lexical_weight": settings.lexical_weight,
                "default_top_k": settings.default_top_k,
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get statistics: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Stats failed: {str(e)}")


@router.get("/health")
async def health_check():
    """Check if RAG system is healthy"""
    try:
        vs = get_vs()
        embedder = get_local_embedder()
        
        return {
            "status": "healthy",
            "components": {
                "vector_store": "ok",
                "embedder": "ok",
                "model": embedder.model_name
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
