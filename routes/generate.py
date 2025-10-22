"""
API routes for text generation.
Provides endpoint for generating text using local LLM models.
"""
from fastapi import APIRouter, HTTPException, status
from typing import List

from schemas import GenerateRequest, GenerateResponse, ErrorResponse
from services import (
    get_ollama_service,
    get_context_handler,
    OllamaConnectionError,
    ModelNotFoundError,
    OllamaServiceError
)
from utils.logger import get_logger

# Import RAG components
try:
    from core.embedder import get_embedder
    from core.hybrid_search import get_hybrid_search
    from core.vector_store import get_vector_store
    from utils.config import get_settings
    RAG_AVAILABLE = True
except ImportError:
    RAG_AVAILABLE = False

logger = get_logger(__name__)
router = APIRouter(prefix="/generate", tags=["Generation"])


async def fetch_relevant_context(
    query: str,
    indices: List[str],
    top_k: int = 5
) -> str:
    """
    Fetch relevant context from specified indices using RAG.
    
    Args:
        query: User's query/prompt
        indices: List of index names to search
        top_k: Number of top results to retrieve per index
        
    Returns:
        Formatted context string
    """
    if not RAG_AVAILABLE:
        logger.warning("RAG components not available. Skipping context retrieval.")
        return ""
    
    try:
        settings = get_settings()
        embedder = get_embedder(model_name=settings.embedding_model)
        vector_store = get_vector_store(persist_directory=settings.vector_store_path)
        hybrid_search = get_hybrid_search(vector_store)
        
        # Generate query embedding
        query_embedding = embedder.embed_query(query)
        
        # Search all specified indices
        all_results = []
        available_indices = vector_store.list_collections()
        
        for index_name in indices:
            if index_name not in available_indices:
                logger.warning(f"Index '{index_name}' not found. Skipping.")
                continue
            
            try:
                results = hybrid_search.search(
                    collection_name=index_name,
                    query_text=query,
                    query_embedding=query_embedding,
                    top_k=top_k,
                    search_type='hybrid'
                )
                
                for result in results:
                    all_results.append({
                        'text': result.get('text', ''),
                        'score': result.get('hybrid_score', 0),
                        'source': index_name,
                        'metadata': result.get('metadata', {})
                    })
                    
            except Exception as e:
                logger.error(f"Failed to search index '{index_name}': {e}")
                continue
        
        if not all_results:
            logger.info("No relevant context found in specified indices")
            return ""
        
        # Sort by score and take top results
        all_results.sort(key=lambda x: x['score'], reverse=True)
        top_results = all_results[:top_k * len(indices)]
        
        # Format context
        context_parts = ["Here is relevant context from your documents:\n"]
        for i, result in enumerate(top_results, 1):
            source = result.get('source', 'unknown')
            text = result.get('text', '').strip()
            score = result.get('score', 0)
            
            context_parts.append(f"\n[Context {i} from {source} (relevance: {score:.2f})]")
            context_parts.append(text)
        
        context_parts.append("\n\nBased on the above context, please answer the following question:")
        
        return "\n".join(context_parts)
        
    except Exception as e:
        logger.error(f"Failed to fetch relevant context: {e}", exc_info=True)
        return ""


@router.post(
    "",
    response_model=GenerateResponse,
    summary="Generate text completion",
    description="Generate text using a specified local LLM model. Supports large context sizes, RAG-enhanced generation, and customizable generation parameters.",
    responses={
        200: {"description": "Text generated successfully"},
        400: {
            "model": ErrorResponse,
            "description": "Invalid request (e.g., prompt too large)"
        },
        404: {
            "model": ErrorResponse,
            "description": "Model not found"
        },
        503: {
            "model": ErrorResponse,
            "description": "Ollama service unavailable"
        }
    }
)
async def generate_text(request: GenerateRequest) -> GenerateResponse:
    """
    Generate text completion using specified model.
    
    This endpoint supports:
    - Large context sizes (configurable via settings)
    - Multiple generation parameters (temperature, top_p, etc.)
    - Multi-turn conversations via context parameter
    - RAG-enhanced generation via indices parameter (optional)
    - Non-streaming responses only
    
    Args:
        request: Generation request with model, prompt, and parameters
        
    Returns:
        GenerateResponse with generated text and metadata
    """
    try:
        # Validate and analyze prompt
        context_handler = get_context_handler()
        
        # Check if RAG is requested
        augmented_prompt = request.prompt
        if request.indices and len(request.indices) > 0:
            logger.info(f"RAG enabled with indices: {request.indices}")
            
            # Fetch relevant context from indices
            relevant_context = await fetch_relevant_context(
                query=request.prompt,
                indices=request.indices,
                top_k=5  # Configurable
            )
            
            if relevant_context:
                # Augment the prompt with context
                augmented_prompt = f"{relevant_context}\n\n{request.prompt}"
                logger.info(f"Prompt augmented with context from {len(request.indices)} indices")
            else:
                logger.warning("No relevant context found, using original prompt")
        
        # Log prompt statistics
        prompt_stats = context_handler.get_prompt_stats(augmented_prompt)
        logger.info(
            "generation_request_received",
            model=request.model,
            rag_enabled=bool(request.indices),
            indices_count=len(request.indices) if request.indices else 0,
            **prompt_stats
        )
        
        # Validate prompt size
        if not context_handler.validate_prompt_size(augmented_prompt):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Prompt size ({prompt_stats['size_mb']} MB) exceeds maximum allowed size"
            )
        
        # Create modified request with augmented prompt
        modified_request = request.model_copy()
        modified_request.prompt = augmented_prompt
        
        # Generate text
        ollama_service = get_ollama_service()
        result = await ollama_service.generate(modified_request)
        
        # Build response
        return GenerateResponse(
            response=result.get("response", ""),
            model=result.get("model", request.model),
            context=result.get("context"),
            total_duration=result.get("total_duration"),
            load_duration=result.get("load_duration"),
            prompt_eval_count=result.get("prompt_eval_count"),
            eval_count=result.get("eval_count")
        )
        
    except ModelNotFoundError as e:
        logger.error("generation_model_not_found", model=request.model, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except OllamaConnectionError as e:
        logger.error("generation_connection_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except OllamaServiceError as e:
        logger.error("generation_service_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except ValueError as e:
        # Catch validation errors from Pydantic
        logger.error("generation_validation_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error("generation_unexpected_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate text: {str(e)}"
        )
