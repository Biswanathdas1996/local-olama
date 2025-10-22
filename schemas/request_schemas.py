"""
Pydantic schemas for request validation and response serialization.
"""
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, field_validator


class GenerateRequest(BaseModel):
    """Request schema for text generation."""
    
    model: str = Field(
        ...,
        description="Name of the model to use (e.g., 'llama3', 'mistral')",
        min_length=1,
        max_length=100
    )
    prompt: str = Field(
        ...,
        description="The prompt text to generate a response from",
        min_length=1
    )
    max_tokens: Optional[int] = Field(
        default=2000,
        description="Maximum number of tokens to generate",
        ge=1,
        le=100000
    )
    temperature: Optional[float] = Field(
        default=0.7,
        description="Sampling temperature (0.0 to 2.0)",
        ge=0.0,
        le=2.0
    )
    top_p: Optional[float] = Field(
        default=0.9,
        description="Nucleus sampling parameter",
        ge=0.0,
        le=1.0
    )
    top_k: Optional[int] = Field(
        default=40,
        description="Top-k sampling parameter",
        ge=1,
        le=100
    )
    repeat_penalty: Optional[float] = Field(
        default=1.1,
        description="Penalty for repeating tokens",
        ge=0.0,
        le=2.0
    )
    context: Optional[List[int]] = Field(
        default=None,
        description="Context from previous generation for multi-turn conversations"
    )
    indices: Optional[List[str]] = Field(
        default=None,
        description="Optional list of index names to search for relevant context (enables RAG)"
    )
    output_format: Optional[str] = Field(
        default="TEXT",
        description="Output format: TEXT (default), JSON, CSV, PDF, DOCX, or PPT"
    )
    output_template: Optional[str] = Field(
        default=None,
        description="Optional template to structure the output"
    )
    
    @field_validator('prompt')
    @classmethod
    def validate_prompt_size(cls, v: str) -> str:
        """Validate prompt is not excessively large."""
        from utils.config import get_settings
        settings = get_settings()
        max_size = settings.max_prompt_size_bytes
        
        prompt_size = len(v.encode('utf-8'))
        if prompt_size > max_size:
            raise ValueError(
                f"Prompt size ({prompt_size} bytes) exceeds maximum "
                f"allowed size ({max_size} bytes)"
            )
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "model": "llama3",
                "prompt": "Explain quantum computing in simple terms.",
                "max_tokens": 4000,
                "temperature": 0.7,
                "top_p": 0.9
            }
        }


class ModelDownloadRequest(BaseModel):
    """Request schema for downloading a model."""
    
    model_name: str = Field(
        ...,
        description="Name of the model to download (e.g., 'llama3', 'mistral')",
        min_length=1,
        max_length=100
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "model_name": "llama3"
            }
        }
