"""
Response schemas for API endpoints.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class GenerateResponse(BaseModel):
    """Response schema for text generation."""
    
    response: str = Field(
        ...,
        description="Generated text response"
    )
    model: str = Field(
        ...,
        description="Model used for generation"
    )
    context: Optional[List[int]] = Field(
        default=None,
        description="Context tokens for continuing the conversation"
    )
    total_duration: Optional[int] = Field(
        default=None,
        description="Total duration in nanoseconds"
    )
    load_duration: Optional[int] = Field(
        default=None,
        description="Model load duration in nanoseconds"
    )
    prompt_eval_count: Optional[int] = Field(
        default=None,
        description="Number of tokens in the prompt"
    )
    eval_count: Optional[int] = Field(
        default=None,
        description="Number of tokens generated"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "response": "Quantum computing is a revolutionary computing paradigm...",
                "model": "llama3",
                "total_duration": 5000000000,
                "prompt_eval_count": 25,
                "eval_count": 150
            }
        }


class ModelInfo(BaseModel):
    """Information about a single model."""
    
    name: str = Field(..., description="Model name")
    modified_at: Optional[datetime] = Field(None, description="Last modified timestamp")
    size: Optional[int] = Field(None, description="Model size in bytes")
    digest: Optional[str] = Field(None, description="Model digest/hash")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional model details")


class ModelsListResponse(BaseModel):
    """Response schema for listing models."""
    
    models: List[ModelInfo] = Field(
        ...,
        description="List of available models"
    )
    count: int = Field(
        ...,
        description="Total number of models"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "models": [
                    {
                        "name": "llama3",
                        "size": 4661224768,
                        "digest": "sha256:abc123..."
                    }
                ],
                "count": 1
            }
        }


class ModelDownloadResponse(BaseModel):
    """Response schema for model download."""
    
    status: str = Field(
        ...,
        description="Download status"
    )
    model_name: str = Field(
        ...,
        description="Name of the model being downloaded"
    )
    message: str = Field(
        ...,
        description="Detailed status message"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "success",
                "model_name": "llama3",
                "message": "Model download initiated successfully"
            }
        }


class ModelDeleteResponse(BaseModel):
    """Response schema for model deletion."""
    
    status: str = Field(..., description="Deletion status")
    model_name: str = Field(..., description="Name of the deleted model")
    message: str = Field(..., description="Status message")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "success",
                "model_name": "llama3",
                "message": "Model deleted successfully"
            }
        }


class HealthResponse(BaseModel):
    """Response schema for health check."""
    
    status: str = Field(..., description="Service status")
    ollama_connected: bool = Field(..., description="Ollama connection status")
    timestamp: datetime = Field(..., description="Health check timestamp")
    version: str = Field(..., description="API version")
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "ollama_connected": True,
                "timestamp": "2025-10-22T10:00:00Z",
                "version": "1.0.0"
            }
        }


class ErrorResponse(BaseModel):
    """Standard error response schema."""
    
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Detailed error information")
    
    class Config:
        json_schema_extra = {
            "example": {
                "error": "ModelNotFoundError",
                "message": "The specified model was not found",
                "detail": "Model 'llama3' is not available locally"
            }
        }
