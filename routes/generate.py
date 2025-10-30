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
    from core.keyword_extractor import get_keyword_extractor
    from core.guardrails_manager import get_guardrails_manager
    from utils.config import get_settings
    RAG_AVAILABLE = True
except ImportError:
    RAG_AVAILABLE = False

logger = get_logger(__name__)
router = APIRouter(prefix="/generate", tags=["Generation"])


async def fetch_relevant_context(
    query: str,
    indices: List[str],
    top_k: int = 5,
    min_score: float = 0.0,
    search_type: str = 'hybrid',
    enable_keyword_extraction: bool = True,
    keyword_top_n: int = 10
) -> tuple[str, List[SourceCitation]]:
    """
    Fetch relevant context from specified indices using RAG.
    
    Args:
        query: User's query/prompt
        indices: List of index names to search
        top_k: Number of top results to retrieve per index
        min_score: Minimum relevance score threshold (0.0 to 1.0)
        search_type: Type of search - 'hybrid', 'semantic', or 'lexical'
        enable_keyword_extraction: Whether to extract keywords from query for enhanced search
        keyword_top_n: Number of keywords to extract from the query
        
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
        
        # Extract keywords from the query if enabled
        extracted_keywords = []
        enhanced_query = query
        if enable_keyword_extraction:
            try:
                keyword_extractor = get_keyword_extractor()
                extracted_keywords = keyword_extractor.extract_keywords(
                    query,
                    top_n=keyword_top_n,
                    use_mmr=True,
                    diversity=0.7
                )
                
                if extracted_keywords:
                    logger.info(f"Extracted keywords from query: {extracted_keywords}")
                    # Enhance the query with extracted keywords for better lexical matching
                    # This helps especially when search_type is 'hybrid' or 'lexical'
                    keywords_str = " ".join(extracted_keywords)
                    enhanced_query = f"{query} {keywords_str}"
                    logger.info(f"Enhanced query for search: {enhanced_query[:100]}...")
            except Exception as e:
                logger.warning(f"Keyword extraction failed, using original query: {e}")
        
        # Generate query embedding
        query_embedding = embedder.embed_query(query)  # Use original query for semantic embedding
        
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
                    query_text=enhanced_query,  # Use enhanced query for lexical search
                    query_embedding=query_embedding,
                    top_k=top_k,
                    min_score=min_score,
                    search_type=search_type
                )
                
                for result in results:
                    # Determine score based on search type (same as BYOD search)
                    if search_type == 'hybrid':
                        score = result.get('hybrid_score', 0)
                    elif search_type == 'semantic':
                        score = result.get('semantic_score', 0)
                    else:  # lexical
                        score = result.get('lexical_score', 0)
                    
                    all_results.append({
                        'text': result.get('text', ''),
                        'score': score,
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
        
        # Add extracted keywords info if available
        if extracted_keywords:
            context_parts.append(f"\n[Key concepts identified: {', '.join(extracted_keywords[:5])}]\n")
        
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
        # Initialize guardrails if enabled
        guardrails_manager = None
        guardrails_enabled = request.enable_guardrails
        
        if guardrails_enabled:
            try:
                guardrails_manager = get_guardrails_manager()
                if not guardrails_manager.is_enabled():
                    logger.warning("Guardrails requested but not properly initialized")
                    guardrails_enabled = False
            except Exception as e:
                logger.warning(f"Failed to initialize guardrails: {e}")
                guardrails_enabled = False
        
        # Validate and analyze prompt
        context_handler = get_context_handler()
        
        # Apply input filtering if guardrails are enabled
        filtered_prompt = request.prompt
        input_filtered = False
        filtering_reason = None
        
        if guardrails_enabled and guardrails_manager:
            input_result = await guardrails_manager.filter_input(request.prompt)
            if not input_result["allowed"]:
                return GenerateResponse(
                    response=input_result["reason"],
                    model=request.model,
                    sources=[],
                    guardrails_applied=True,
                    input_filtered=True,
                    output_filtered=False,
                    filtering_reason=input_result["reason"]
                )
            filtered_prompt = input_result["filtered_input"]
        
        # Check if RAG is requested
        augmented_prompt = filtered_prompt
        sources = []
        
        if request.indices and len(request.indices) > 0:
            logger.info(f"RAG enabled with indices: {request.indices}")
            logger.info(f"Search config - top_k: {request.search_top_k}, min_score: {request.search_min_score}, type: {request.search_type}")
            logger.info(f"Keyword extraction: {request.enable_keyword_extraction}")
            
            # Fetch relevant context from indices
            relevant_context, rag_sources = await fetch_relevant_context(
                query=filtered_prompt,  # Use filtered prompt for RAG
                indices=request.indices,
                top_k=request.search_top_k or 5,
                min_score=request.search_min_score or 0.0,
                search_type=request.search_type or 'hybrid',
                enable_keyword_extraction=request.enable_keyword_extraction if hasattr(request, 'enable_keyword_extraction') else True,
                keyword_top_n=request.keyword_top_n if hasattr(request, 'keyword_top_n') else 10
            )
            
            if relevant_context:
                # Augment the prompt with context
                augmented_prompt = f"{relevant_context}\n\n{filtered_prompt}"
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
        # Add model citation to sources list for frontend display
        sources.append(model_citation)
        
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
        
        # Apply output filtering if guardrails are enabled
        final_response = generated_text
        output_filtered = False
        
        if guardrails_enabled and guardrails_manager:
            output_result = await guardrails_manager.filter_output(
                generated_text, 
                filtered_prompt
            )
            final_response = output_result["filtered_output"]
            output_filtered = not output_result["allowed"]
            if output_filtered and not filtering_reason:
                filtering_reason = output_result.get("reason")
        
        # Build response
        return GenerateResponse(
            response=final_response,
            model=result.get("model", request.model),
            sources=sources if sources else None,
            context=result.get("context"),
            total_duration=result.get("total_duration"),
            load_duration=result.get("load_duration"),
            prompt_eval_count=result.get("prompt_eval_count"),
            eval_count=result.get("eval_count"),
            guardrails_applied=guardrails_enabled,
            input_filtered=input_filtered,
            output_filtered=output_filtered,
            filtering_reason=filtering_reason
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
