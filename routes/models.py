"""
API routes for model management.
Provides endpoints for listing, downloading, and deleting Ollama models.
"""
from typing import List
from fastapi import APIRouter, HTTPException, status

from schemas import (
    ModelsListResponse,
    ModelInfo,
    ModelDownloadRequest,
    ModelDownloadResponse,
    ModelDeleteResponse,
    ErrorResponse
)
from services import (
    get_ollama_service,
    OllamaConnectionError,
    ModelNotFoundError,
    OllamaServiceError
)
from utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/models", tags=["Models"])


@router.get(
    "",
    response_model=ModelsListResponse,
    summary="List all available models",
    description="Retrieve a list of all models currently available locally through Ollama.",
    responses={
        200: {"description": "Successfully retrieved models list"},
        503: {
            "model": ErrorResponse,
            "description": "Ollama service unavailable"
        }
    }
)
async def list_models() -> ModelsListResponse:
    """
    List all locally available Ollama models.
    
    Returns:
        ModelsListResponse with list of models and count
    """
    try:
        ollama_service = get_ollama_service()
        models_data = await ollama_service.list_models()
        
        # Parse model information
        models = [
            ModelInfo(
                name=model.get("name", ""),
                modified_at=model.get("modified_at"),
                size=model.get("size"),
                digest=model.get("digest"),
                details=model.get("details")
            )
            for model in models_data
        ]
        
        return ModelsListResponse(
            models=models,
            count=len(models)
        )
        
    except OllamaConnectionError as e:
        logger.error("list_models_connection_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        logger.error("list_models_unexpected_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list models: {str(e)}"
        )


@router.post(
    "/download",
    response_model=ModelDownloadResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Download a new model",
    description="Download a model from Ollama library. This operation may take significant time for large models.",
    responses={
        202: {"description": "Model download initiated"},
        503: {
            "model": ErrorResponse,
            "description": "Ollama service unavailable"
        },
        500: {
            "model": ErrorResponse,
            "description": "Download failed"
        }
    }
)
async def download_model(request: ModelDownloadRequest) -> ModelDownloadResponse:
    """
    Download a new model using Ollama CLI.
    
    Args:
        request: Model download request with model name
        
    Returns:
        ModelDownloadResponse with status
    """
    try:
        ollama_service = get_ollama_service()
        result = await ollama_service.download_model(request.model_name)
        
        return ModelDownloadResponse(
            status=result["status"],
            model_name=result["model_name"],
            message=result["message"]
        )
        
    except OllamaConnectionError as e:
        logger.error("download_model_connection_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except OllamaServiceError as e:
        logger.error("download_model_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error("download_model_unexpected_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download model: {str(e)}"
        )


@router.delete(
    "/{model_name}",
    response_model=ModelDeleteResponse,
    summary="Delete a model",
    description="Delete a locally stored model to free up disk space.",
    responses={
        200: {"description": "Model deleted successfully"},
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
async def delete_model(model_name: str) -> ModelDeleteResponse:
    """
    Delete a model from local storage.
    
    Args:
        model_name: Name of the model to delete
        
    Returns:
        ModelDeleteResponse with status
    """
    try:
        ollama_service = get_ollama_service()
        result = await ollama_service.delete_model(model_name)
        
        return ModelDeleteResponse(
            status=result["status"],
            model_name=result["model_name"],
            message=result["message"]
        )
        
    except ModelNotFoundError as e:
        logger.error("delete_model_not_found", model=model_name, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except OllamaConnectionError as e:
        logger.error("delete_model_connection_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except OllamaServiceError as e:
        logger.error("delete_model_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    except Exception as e:
        logger.error("delete_model_unexpected_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete model: {str(e)}"
        )
