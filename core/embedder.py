"""
State-of-the-art local embedding generation using sentence-transformers.
Supports enterprise-grade models like nomic-embed-text and BGE for high-accuracy retrieval.
"""

import logging
import os
from pathlib import Path
from typing import List, Optional, Union
import numpy as np

try:
    from sentence_transformers import SentenceTransformer
    import sentence_transformers
    SENTENCE_TRANSFORMERS_AVAILABLE = True
    # Check if local_files_only is supported (version 2.4.0+)
    import inspect
    _st_init_params = inspect.signature(SentenceTransformer.__init__).parameters
    SUPPORTS_LOCAL_FILES_ONLY = 'local_files_only' in _st_init_params
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    SUPPORTS_LOCAL_FILES_ONLY = False

logger = logging.getLogger(__name__)

# Local model cache directory
LOCAL_MODEL_CACHE = Path(__file__).parent.parent / "models" / "embeddings"
LOCAL_MODEL_CACHE.mkdir(parents=True, exist_ok=True)


class LocalEmbedder:
    """
    High-performance local embedding generator with batching support.
    
    Recommended models (in order of accuracy/speed tradeoff):
    1. nomic-ai/nomic-embed-text-v1.5 (768d, best balance)
    2. BAAI/bge-large-en-v1.5 (1024d, highest accuracy)
    3. BAAI/bge-base-en-v1.5 (768d, good speed)
    4. sentence-transformers/all-mpnet-base-v2 (768d, fallback)
    """

    # Model configurations with dimensions and optimal batch sizes
    MODEL_CONFIGS = {
        'nomic-embed-text-v1.5': {
            'name': 'nomic-ai/nomic-embed-text-v1.5',
            'dimension': 768, 
            'batch_size': 128,
            'trust_remote_code': True,
        },
        'bge-large': {
            'name': 'BAAI/bge-large-en-v1.5',
            'dimension': 1024,
            'batch_size': 64,
            'trust_remote_code': False,
        },
        'bge-base': {
            'name': 'BAAI/bge-base-en-v1.5',
            'dimension': 768,
            'batch_size': 128,
            'trust_remote_code': False,
        },
        'mpnet': {
            'name': 'sentence-transformers/all-mpnet-base-v2',
            'dimension': 768,
            'batch_size': 128,
            'trust_remote_code': False,
        },
        'minilm': {
            'name': 'sentence-transformers/all-MiniLM-L6-v2',
            'dimension': 384,
            'batch_size': 256,
            'trust_remote_code': False,
        }
    }

    def __init__(
        self,
        model_name: str = 'minilm',  # Changed default to reliable minilm
        device: Optional[str] = None,
        normalize_embeddings: bool = True,
        batch_size: Optional[int] = None,
        local_files_only: bool = False,  # Default to False to allow initial download
        cache_folder: Optional[str] = None
    ):
        """
        Initialize local embedder with specified model.
        
        Args:
            model_name: Model identifier (use keys from MODEL_CONFIGS or full HF path)
            device: 'cuda', 'cpu', or None for auto-detect
            normalize_embeddings: L2 normalize vectors for cosine similarity
            batch_size: Override default batch size
            local_files_only: If True, only use locally cached models (offline mode)
            cache_folder: Custom cache folder path (defaults to models/embeddings/)
        """
        if not SENTENCE_TRANSFORMERS_AVAILABLE:
            raise ImportError(
                "sentence-transformers is required. Install with: pip install sentence-transformers"
            )
        
        self.model_name = model_name
        self.normalize_embeddings = normalize_embeddings
        self.local_files_only = local_files_only
        
        # Set cache folder
        if cache_folder:
            self.cache_folder = Path(cache_folder)
        else:
            self.cache_folder = LOCAL_MODEL_CACHE
        
        # Get model config
        self.config = self.MODEL_CONFIGS.get(model_name, {
            'name': model_name,
            'dimension': 768,  # Default
            'batch_size': 128,
            'trust_remote_code': False,
        })
        
        self.batch_size = batch_size or self.config['batch_size']
        self.dimension = self.config['dimension']
        
        # Load model
        logger.info(f"Loading embedding model: {self.config['name']}")
        logger.info(f"Cache folder: {self.cache_folder}")
        logger.info(f"Offline mode (local_files_only): {self.local_files_only}")
        logger.info(f"sentence-transformers supports local_files_only: {SUPPORTS_LOCAL_FILES_ONLY}")
        
        try:
            # Build kwargs based on what's supported
            model_kwargs = {
                'device': device,
                'trust_remote_code': self.config.get('trust_remote_code', False),
                'cache_folder': str(self.cache_folder),
            }
            
            # Only add local_files_only if supported by the library version
            if SUPPORTS_LOCAL_FILES_ONLY:
                model_kwargs['local_files_only'] = self.local_files_only
            elif self.local_files_only:
                logger.warning(
                    f"sentence-transformers version {sentence_transformers.__version__} doesn't support local_files_only parameter. "
                    f"Upgrade to 2.4.0+ for offline mode support: pip install --upgrade sentence-transformers"
                )
            
            self.model = SentenceTransformer(
                self.config['name'],
                **model_kwargs
            )
            logger.info(f"Model loaded successfully on device: {self.model.device}")
        except Exception as e:
            logger.error(f"Failed to load model {self.config['name']}: {e}")
            
            if self.local_files_only:
                logger.warning(
                    f"Model not found in cache. To download models for offline use, run:\n"
                    f"  python -c \"from core.embedder import download_models; download_models()\"\n"
                    f"Or set local_files_only=False to download on-demand (requires internet)."
                )
            
            # Fallback to MiniLM
            logger.info("Falling back to all-MiniLM-L6-v2")
            self.config = self.MODEL_CONFIGS['minilm']
            self.dimension = self.config['dimension']
            try:
                # Build kwargs for fallback model
                fallback_kwargs = {
                    'device': device,
                    'cache_folder': str(self.cache_folder),
                }
                
                # Only add local_files_only if supported
                if SUPPORTS_LOCAL_FILES_ONLY:
                    fallback_kwargs['local_files_only'] = self.local_files_only
                
                self.model = SentenceTransformer(
                    self.config['name'],
                    **fallback_kwargs
                )
            except Exception as fallback_error:
                logger.error(f"Fallback model also failed: {fallback_error}")
                raise RuntimeError(
                    f"Could not load any embedding model. "
                    f"Please download models first using: "
                    f"python -c \"from core.embedder import download_models; download_models()\""
                )

    def embed_text(
        self,
        text: Union[str, List[str]],
        show_progress: bool = False,
        convert_to_numpy: bool = True
    ) -> Union[np.ndarray, List[np.ndarray]]:
        """
        Generate embeddings for text(s).
        
        Args:
            text: Single text string or list of texts
            show_progress: Show progress bar for large batches
            convert_to_numpy: Return numpy arrays (vs torch tensors)
            
        Returns:
            Embedding vector(s) as numpy array(s)
        """
        is_single = isinstance(text, str)
        texts = [text] if is_single else text
        
        if not texts:
            return np.array([]) if convert_to_numpy else []
        
        # Generate embeddings
        embeddings = self.model.encode(
            texts,
            batch_size=self.batch_size,
            show_progress_bar=show_progress,
            normalize_embeddings=self.normalize_embeddings,
            convert_to_numpy=convert_to_numpy,
        )
        
        return embeddings[0] if is_single else embeddings

    def embed_query(self, query: str) -> np.ndarray:
        """
        Generate embedding for a search query.
        
        Some models (like BGE) benefit from query prefixes.
        
        Args:
            query: Search query text
            
        Returns:
            Query embedding vector
        """
        # Add query prefix for BGE models
        if 'bge' in self.config['name'].lower():
            query = f"Represent this sentence for searching relevant passages: {query}"
        
        return self.embed_text(query, convert_to_numpy=True)

    def embed_documents(
        self,
        documents: List[str],
        show_progress: bool = True
    ) -> np.ndarray:
        """
        Generate embeddings for document chunks (batch-optimized).
        
        Args:
            documents: List of document texts to embed
            show_progress: Show progress bar
            
        Returns:
            Array of embeddings (shape: [num_docs, dimension])
        """
        if not documents:
            return np.array([])
        
        # Add document prefix for BGE models
        if 'bge' in self.config['name'].lower():
            documents = [
                f"Represent this document for retrieval: {doc}"
                for doc in documents
            ]
        
        return self.embed_text(
            documents,
            show_progress=show_progress,
            convert_to_numpy=True
        )

    def similarity(
        self,
        embedding1: np.ndarray,
        embedding2: np.ndarray
    ) -> float:
        """
        Calculate cosine similarity between two embeddings.
        
        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector
            
        Returns:
            Similarity score (0-1 if normalized, -1 to 1 otherwise)
        """
        if embedding1.ndim == 1:
            embedding1 = embedding1.reshape(1, -1)
        if embedding2.ndim == 1:
            embedding2 = embedding2.reshape(1, -1)
        
        return np.dot(embedding1, embedding2.T)[0][0]

    def get_model_info(self) -> dict:
        """Get information about loaded model"""
        return {
            'model_name': self.config['name'],
            'dimension': self.dimension,
            'device': str(self.model.device),
            'max_seq_length': self.model.max_seq_length,
            'batch_size': self.batch_size,
            'normalize': self.normalize_embeddings,
        }

    @staticmethod
    def list_available_models() -> List[str]:
        """List all pre-configured model identifiers"""
        return list(LocalEmbedder.MODEL_CONFIGS.keys())

    @staticmethod
    def get_recommended_model(use_case: str = 'balanced') -> str:
        """
        Get recommended model for specific use case.
        
        Args:
            use_case: 'speed', 'balanced', or 'accuracy'
            
        Returns:
            Model identifier
        """
        recommendations = {
            'speed': 'minilm',
            'balanced': 'nomic-embed-text-v1.5',
            'accuracy': 'bge-large',
        }
        return recommendations.get(use_case, 'nomic-embed-text-v1.5')


# Singleton instance for memory efficiency
_global_embedder: Optional[LocalEmbedder] = None


def get_embedder(
    model_name: Optional[str] = None,
    **kwargs
) -> LocalEmbedder:
    """
    Get or create global embedder instance (singleton pattern).
    
    Args:
        model_name: Model to use (if different from global)
        **kwargs: Additional embedder arguments
        
    Returns:
        LocalEmbedder instance
    """
    global _global_embedder
    
    # Load settings if available
    try:
        from utils.config import get_settings
        settings = get_settings()
        default_model = settings.embedding_model
        # Check if local_files_only should be set from config
        if not kwargs.get('local_files_only') and hasattr(settings, 'embedding_local_only'):
            kwargs['local_files_only'] = settings.embedding_local_only
    except:
        default_model = 'minilm'  # Safe default
        if 'local_files_only' not in kwargs:
            kwargs['local_files_only'] = False  # Allow download if settings not available
    
    if _global_embedder is None or (model_name and model_name != _global_embedder.model_name):
        model_name = model_name or default_model
        _global_embedder = LocalEmbedder(model_name=model_name, **kwargs)
    
    return _global_embedder


def download_models(
    models: Optional[List[str]] = None,
    cache_folder: Optional[str] = None
) -> None:
    """
    Download embedding models for offline use.
    
    This function downloads models when you have internet connection,
    so they can be used offline later.
    
    Args:
        models: List of model identifiers to download (default: minilm for reliable offline operation)
        cache_folder: Where to cache models (default: models/embeddings/)
    
    Example:
        >>> from core.embedder import download_models
        >>> download_models()  # Download minilm model (recommended)
        >>> download_models(['minilm', 'nomic-embed-text-v1.5'])  # Download specific models
    """
    if not SENTENCE_TRANSFORMERS_AVAILABLE:
        raise ImportError(
            "sentence-transformers is required. Install with: pip install sentence-transformers"
        )
    
    # Default to lightweight, reliable model for offline use
    if models is None:
        models = ['minilm']
    
    # Set cache folder
    if cache_folder:
        cache_path = Path(cache_folder)
    else:
        cache_path = LOCAL_MODEL_CACHE
    
    cache_path.mkdir(parents=True, exist_ok=True)
    
    print(f"Downloading models to: {cache_path}")
    print(f"Models to download: {models}\n")
    
    for model_id in models:
        config = LocalEmbedder.MODEL_CONFIGS.get(model_id, {'name': model_id})
        model_name = config.get('name', model_id)
        
        print(f"Downloading: {model_name}...")
        try:
            # Build kwargs based on what's supported
            download_kwargs = {
                'cache_folder': str(cache_path),
                'trust_remote_code': config.get('trust_remote_code', False)
            }
            
            # Only add local_files_only if supported by the library version
            if SUPPORTS_LOCAL_FILES_ONLY:
                download_kwargs['local_files_only'] = False  # Allow internet download
            
            # Download by loading the model
            model = SentenceTransformer(
                model_name,
                **download_kwargs
            )
            print(f"✓ Successfully downloaded: {model_name}")
            print(f"  Dimension: {config.get('dimension', 'unknown')}")
            print(f"  Max sequence length: {model.max_seq_length}\n")
            del model  # Free memory
        except Exception as e:
            print(f"✗ Failed to download {model_name}: {e}\n")
    
    print(f"Download complete! Models are cached in: {cache_path}")
    print(f"You can now use embeddings offline with local_files_only=True")


def check_model_cache(
    cache_folder: Optional[str] = None
) -> dict:
    """
    Check which models are available in local cache.
    
    Args:
        cache_folder: Cache folder to check (default: models/embeddings/)
    
    Returns:
        Dictionary with model availability status
    """
    if cache_folder:
        cache_path = Path(cache_folder)
    else:
        cache_path = LOCAL_MODEL_CACHE
    
    result = {
        'cache_folder': str(cache_path),
        'cache_exists': cache_path.exists(),
        'models': {}
    }
    
    if not cache_path.exists():
        return result
    
    # Check each configured model
    for model_id, config in LocalEmbedder.MODEL_CONFIGS.items():
        model_name = config['name']
        # Check if model folder exists in cache
        model_folder = cache_path / model_name.replace('/', '_')
        is_cached = model_folder.exists() and any(model_folder.iterdir())
        
        result['models'][model_id] = {
            'name': model_name,
            'cached': is_cached,
            'path': str(model_folder) if is_cached else None
        }
    
    return result
