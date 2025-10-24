"""
API routes for text generation.
Provides endpoint for generating text using local LLM models.
"""
from fastapi import APIRouter, HTTPException, status
from typing import List

from schemas import GenerateRequest, GenerateResponse, SourceCitation, ErrorResponse
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
) -> tuple[str, List[SourceCitation]]:
    """
    Fetch relevant context from specified indices using RAG.
    
    Args:
        query: User's query/prompt
        indices: List of index names to search
        top_k: Number of top results to retrieve per index
        
    Returns:
        Tuple of (formatted context string, list of source citations)
    """
    if not RAG_AVAILABLE:
        logger.warning("RAG components not available. Skipping context retrieval.")
        return "", []
    
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
            return "", []
        
        # Sort by score and take top results
        all_results.sort(key=lambda x: x['score'], reverse=True)
        top_results = all_results[:top_k * len(indices)]
        
        # Build source citations
        sources = []
        for i, result in enumerate(top_results, 1):
            source_name = result.get('source', 'unknown')
            metadata = result.get('metadata', {})
            score = result.get('score', 0)
            text = result.get('text', '').strip()
            
            # Extract page number if available
            page_number = metadata.get('page', metadata.get('slide'))
            
            # Create excerpt (first 150 chars)
            excerpt = text[:150] + "..." if len(text) > 150 else text
            
            sources.append(SourceCitation(
                source_type="document",
                source_name=source_name,
                page_number=page_number,
                relevance_score=round(score, 4),
                excerpt=excerpt
            ))
        
        # Format context
        context_parts = ["Here is relevant context from your documents:\n"]
        for i, result in enumerate(top_results, 1):
            source = result.get('source', 'unknown')
            text = result.get('text', '').strip()
            score = result.get('score', 0)
            metadata = result.get('metadata', {})
            page_num = metadata.get('page', metadata.get('slide'))
            
            # Add page reference to context
            page_ref = f", Page {page_num}" if page_num else ""
            context_parts.append(f"\n[Context {i} from {source}{page_ref} (relevance: {score:.2f})]")
            context_parts.append(text)
        
        context_parts.append("\n\nBased on the above context, please answer the following question:")
        
        return "\n".join(context_parts), sources
        
    except Exception as e:
        logger.error(f"Failed to fetch relevant context: {e}", exc_info=True)
        return "", []


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
    - Output formatting via output_format and output_template parameters
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
        sources = []
        
        if request.indices and len(request.indices) > 0:
            logger.info(f"RAG enabled with indices: {request.indices}")
            
            # Fetch relevant context from indices
            relevant_context, rag_sources = await fetch_relevant_context(
                query=request.prompt,
                indices=request.indices,
                top_k=5  # Configurable
            )
            
            if relevant_context:
                # Augment the prompt with context
                augmented_prompt = f"{relevant_context}\n\n{request.prompt}"
                sources.extend(rag_sources)
                logger.info(f"Prompt augmented with context from {len(request.indices)} indices")
            else:
                logger.warning("No relevant context found, using original prompt")
        
        # Add model source citation for non-RAG or combined responses
        model_citation = SourceCitation(
            source_type="model",
            source_name=request.model,
            page_number=None,
            relevance_score=None,
            excerpt=f"AI-generated response using {request.model}"
        )
        
        # Apply output format and template instructions
        output_format = request.output_format or "TEXT"
        output_template = request.output_template
        
        # Build format-specific instructions
        format_instructions = ""
        if output_format != "TEXT":
            format_instructions = f"\n\nIMPORTANT: Please format your response as {output_format}."
            
            if output_format == "JSON":
                format_instructions += " Provide a valid JSON object."
                if output_template:
                    format_instructions += f" Use this template structure:\n{output_template}"
            elif output_format == "CSV":
                format_instructions += " Format the data as comma-separated values with headers."
                if output_template:
                    format_instructions += f" Use these columns:\n{output_template}"
            elif output_format == "PDF":
                format_instructions += " Structure the content as if it will be converted to a PDF document with clear sections and formatting."
                if output_template:
                    format_instructions += f" Follow this structure:\n{output_template}"
            elif output_format == "DOCX":
                format_instructions += " Structure the content as a Word document with clear sections, headings, and formatting."
                if output_template:
                    format_instructions += f" Follow this structure:\n{output_template}"
            elif output_format == "PPT":
                format_instructions += " Structure the content as PowerPoint slides with clear slide titles and bullet points."
                if output_template:
                    format_instructions += f" Follow this structure:\n{output_template}"
        elif output_template:
            # Even for TEXT format, apply template if provided
            format_instructions = f"\n\nPlease structure your response according to this template:\n{output_template}"
        
        # Add format instructions to the prompt
        augmented_prompt = augmented_prompt + format_instructions
        
        # Log prompt statistics
        prompt_stats = context_handler.get_prompt_stats(augmented_prompt)
        logger.info(
            "generation_request_received",
            model=request.model,
            rag_enabled=bool(request.indices),
            indices_count=len(request.indices) if request.indices else 0,
            output_format=output_format,
            has_template=bool(output_template),
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
        
        # Get the generated response
        generated_text = result.get("response", "")
        
        # Append citation section to the response
        if sources:
            citation_text = "\n\n---\n**Sources:**\n"
            for i, source in enumerate(sources, 1):
                if source.source_type == "document":
                    page_ref = f", Page {source.page_number}" if source.page_number else ""
                    citation_text += f"\n{i}. {source.source_name}{page_ref}"
                    if source.relevance_score:
                        citation_text += f" (relevance: {source.relevance_score:.2f})"
            
            # Add model reference
            citation_text += f"\n\n*Response generated by AI model: {request.model}*"
            generated_text += citation_text
        else:
            # For non-RAG responses, add disclaimer
            generated_text += f"\n\n---\n*Note: This response was generated by the AI model '{request.model}'. Please verify important information from authoritative sources.*"
        
        # Add model citation to sources list
        sources.append(model_citation)
        
        # Build response
        return GenerateResponse(
            response=generated_text,
            model=result.get("model", request.model),
            sources=sources if sources else None,
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
