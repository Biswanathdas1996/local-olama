"""
Configuration management using Pydantic Settings.
Loads settings from environment variables and .env file.
"""
from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with validation."""
    
    # Ollama Configuration
    ollama_base_url: str = "http://localhost:11434"
    ollama_timeout: int = 300
    
    # Application Configuration
    app_name: str = "Local LLM Platform"
    app_version: str = "1.0.0"
    debug: bool = False
    log_level: str = "INFO"
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Performance Settings
    max_concurrent_requests: int = 10
    request_timeout: int = 300
    max_prompt_size_mb: int = 10
    
    # Document Ingestion & RAG Settings
    embedding_model: str = "nomic-embed-text-v1.5"  # or 'bge-large', 'bge-base', 'mpnet'
    chunk_size: int = 512  # tokens per chunk (smaller = more accurate retrieval)
    chunk_overlap: int = 100  # token overlap between chunks (20% overlap)
    vector_store_path: str = "./data/vector_store"
    keyword_index_path: str = "./data/keyword_index"
    
    # Hybrid Search Weights (optimized for accuracy)
    semantic_weight: float = 0.65  # weight for semantic similarity
    lexical_weight: float = 0.35   # weight for BM25 keyword matching
    
    # Extraction Settings
    use_ocr: bool = False  # enable OCR for scanned PDFs (requires tesseract)
    respect_doc_structure: bool = True  # preserve section boundaries in chunking
    extract_keywords: bool = True  # extract keywords for hybrid search
    keywords_per_chunk: int = 15  # keywords to extract per chunk (increased for better coverage)
    
    # Search Settings
    default_top_k: int = 10  # default number of search results
    min_search_score: float = 0.3  # minimum relevance score threshold
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    @property
    def ollama_api_url(self) -> str:
        """Get the Ollama API base URL."""
        return f"{self.ollama_base_url}/api"
    
    @property
    def max_prompt_size_bytes(self) -> int:
        """Get max prompt size in bytes."""
        return self.max_prompt_size_mb * 1024 * 1024


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    Uses lru_cache to ensure single instance across app.
    """
    return Settings()
