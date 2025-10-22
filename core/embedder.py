"""
State-of-the-art local embedding generation using sentence-transformers.
Supports enterprise-grade models like nomic-embed-text and BGE for high-accuracy retrieval.
"""

import logging
from typing import List, Optional, Union
import numpy as np

try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False

logger = logging.getLogger(__name__)


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
        model_name: str = 'nomic-embed-text-v1.5',
        device: Optional[str] = None,
        normalize_embeddings: bool = True,
        batch_size: Optional[int] = None
    ):
        """
        Initialize local embedder with specified model.
        
        Args:
            model_name: Model identifier (use keys from MODEL_CONFIGS or full HF path)
            device: 'cuda', 'cpu', or None for auto-detect
            normalize_embeddings: L2 normalize vectors for cosine similarity
            batch_size: Override default batch size
        """
        if not SENTENCE_TRANSFORMERS_AVAILABLE:
            raise ImportError(
                "sentence-transformers is required. Install with: pip install sentence-transformers"
            )
        
        self.model_name = model_name
        self.normalize_embeddings = normalize_embeddings
        
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
        try:
            self.model = SentenceTransformer(
                self.config['name'],
                device=device,
                trust_remote_code=self.config.get('trust_remote_code', False)
            )
            logger.info(f"Model loaded successfully on device: {self.model.device}")
        except Exception as e:
            logger.error(f"Failed to load model {self.config['name']}: {e}")
            # Fallback to MiniLM
            logger.info("Falling back to all-MiniLM-L6-v2")
            self.config = self.MODEL_CONFIGS['minilm']
            self.dimension = self.config['dimension']
            self.model = SentenceTransformer(self.config['name'], device=device)

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
    
    if _global_embedder is None or (model_name and model_name != _global_embedder.model_name):
        model_name = model_name or LocalEmbedder.get_recommended_model('balanced')
        _global_embedder = LocalEmbedder(model_name=model_name, **kwargs)
    
    return _global_embedder
