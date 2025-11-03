"""
Vector store management using ChromaDB for persistent local storage.
Handles embedding storage, retrieval, and collection management.
"""

import logging
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import json

try:
    import chromadb
    from chromadb.config import Settings
    from chromadb.utils import embedding_functions
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False

import numpy as np

logger = logging.getLogger(__name__)


class VectorStoreManager:
    """
    Enterprise ChromaDB manager with persistent storage.
    
    Features:
    - Persistent local storage
    - Efficient batch operations
    - Metadata filtering
    - Automatic collection management
    """

    def __init__(
        self,
        persist_directory: str = "./data/vector_store",
        embedding_function: Optional[callable] = None
    ):
        """
        Initialize vector store manager.
        
        Args:
            persist_directory: Local directory for persistent storage
            embedding_function: Optional custom embedding function
        """
        if not CHROMADB_AVAILABLE:
            raise ImportError(
                "chromadb is required. Install with: pip install chromadb"
            )
        
        self.persist_directory = Path(persist_directory)
        self.persist_directory.mkdir(parents=True, exist_ok=True)
        
        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(
            path=str(self.persist_directory),
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True,
            )
        )
        
        self.embedding_function = embedding_function
        self.collections = {}
        
        logger.info(f"VectorStore initialized at: {self.persist_directory}")

    def create_collection(
        self,
        name: str,
        metadata: Optional[Dict] = None,
        embedding_dimension: Optional[int] = None
    ) -> bool:
        """
        Create a new collection (index).
        
        Args:
            name: Collection name (3-512 characters, alphanumeric + ._-, must start/end with alphanumeric)
            metadata: Optional collection metadata
            embedding_dimension: Expected embedding dimension
            
        Returns:
            Success status
        """
        try:
            # Validate collection name
            import re
            if not name or len(name) < 3 or len(name) > 512:
                logger.error(f"Collection name must be 3-512 characters. Got: '{name}' ({len(name)} chars)")
                raise ValueError(f"Collection name must be 3-512 characters. Got: '{name}' ({len(name)} chars)")
            
            if not re.match(r'^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$', name):
                logger.error(f"Invalid collection name: '{name}'. Must contain only [a-zA-Z0-9._-] and start/end with alphanumeric")
                raise ValueError(f"Invalid collection name: '{name}'. Must contain only [a-zA-Z0-9._-] and start/end with alphanumeric")
            
            # Check if exists
            existing = self.client.list_collections()
            if any(col.name == name for col in existing):
                logger.info(f"Collection '{name}' already exists")
                return True
            
            # Create collection
            collection_metadata = metadata or {}
            if embedding_dimension:
                collection_metadata['dimension'] = embedding_dimension
            
            collection = self.client.create_collection(
                name=name,
                metadata=collection_metadata,
            )
            
            self.collections[name] = collection
            logger.info(f"Created collection: {name}")
            return True
            
        except ValueError:
            # Re-raise validation errors
            raise
        except Exception as e:
            logger.error(f"Failed to create collection '{name}': {e}")
            # Include more context in the error message
            if "Expected a name containing" in str(e) or "3-512 characters" in str(e):
                raise ValueError(f"Invalid collection name '{name}': {e}")
            return False

    def get_collection(self, name: str):
        """Get or load collection by name"""
        if name in self.collections:
            return self.collections[name]
        
        try:
            collection = self.client.get_collection(name=name)
            self.collections[name] = collection
            return collection
        except Exception as e:
            logger.error(f"Collection '{name}' not found: {e}")
            return None

    def add_documents(
        self,
        collection_name: str,
        texts: List[str],
        embeddings: List[np.ndarray],
        metadatas: Optional[List[Dict]] = None,
        ids: Optional[List[str]] = None
    ) -> bool:
        """
        Add documents to collection.
        
        Args:
            collection_name: Target collection
            texts: Document texts
            embeddings: Pre-computed embeddings
            metadatas: Optional metadata per document
            ids: Optional custom IDs (auto-generated if None)
            
        Returns:
            Success status
        """
        collection = self.get_collection(collection_name)
        if not collection:
            logger.error(f"Collection '{collection_name}' not found")
            return False
        
        try:
            # Generate IDs if not provided
            if ids is None:
                existing_count = collection.count()
                ids = [f"{collection_name}_{i}" for i in range(existing_count, existing_count + len(texts))]
            
            # Prepare metadatas
            if metadatas is None:
                metadatas = [{} for _ in texts]
            
            # Convert embeddings to list format
            embeddings_list = [emb.tolist() if isinstance(emb, np.ndarray) else emb for emb in embeddings]
            
            # Add to collection in batches
            batch_size = 100
            for i in range(0, len(texts), batch_size):
                end_idx = min(i + batch_size, len(texts))
                
                collection.add(
                    documents=texts[i:end_idx],
                    embeddings=embeddings_list[i:end_idx],
                    metadatas=metadatas[i:end_idx],
                    ids=ids[i:end_idx]
                )
            
            logger.info(f"Added {len(texts)} documents to '{collection_name}'")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add documents to '{collection_name}': {e}")
            return False

    def query(
        self,
        collection_name: str,
        query_embedding: np.ndarray,
        top_k: int = 10,
        where: Optional[Dict] = None,
        include: Optional[List[str]] = None
    ) -> Dict:
        """
        Query collection for similar vectors.
        
        Args:
            collection_name: Collection to query
            query_embedding: Query vector
            top_k: Number of results
            where: Metadata filters (e.g., {"source": "doc1.pdf"})
            include: Fields to include (default: ["documents", "metadatas", "distances"])
            
        Returns:
            Query results with documents, metadata, and distances
        """
        collection = self.get_collection(collection_name)
        if not collection:
            return {"ids": [], "documents": [], "metadatas": [], "distances": []}
        
        try:
            # Default includes
            if include is None:
                include = ["documents", "metadatas", "distances"]
            
            # Convert embedding to list
            query_emb_list = query_embedding.tolist() if isinstance(query_embedding, np.ndarray) else query_embedding
            
            # Query
            results = collection.query(
                query_embeddings=[query_emb_list],
                n_results=top_k,
                where=where,
                include=include
            )
            
            # Flatten results (ChromaDB returns nested lists)
            return {
                'ids': results.get('ids', [[]])[0],
                'documents': results.get('documents', [[]])[0],
                'metadatas': results.get('metadatas', [[]])[0],
                'distances': results.get('distances', [[]])[0],
            }
            
        except Exception as e:
            logger.error(f"Query failed on '{collection_name}': {e}")
            return {"ids": [], "documents": [], "metadatas": [], "distances": []}

    def delete_collection(self, name: str) -> bool:
        """Delete a collection"""
        try:
            self.client.delete_collection(name=name)
            if name in self.collections:
                del self.collections[name]
            logger.info(f"Deleted collection: {name}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete collection '{name}': {e}")
            return False

    def list_collections(self) -> List[str]:
        """List all collection names"""
        try:
            collections = self.client.list_collections()
            return [col.name for col in collections]
        except Exception as e:
            logger.error(f"Failed to list collections: {e}")
            return []

    def get_collection_info(self, name: str) -> Optional[Dict]:
        """Get information about a collection"""
        collection = self.get_collection(name)
        if not collection:
            return None
        
        try:
            count = collection.count()
            metadata = collection.metadata
            
            return {
                'name': name,
                'count': count,
                'metadata': metadata,
            }
        except Exception as e:
            logger.error(f"Failed to get info for '{name}': {e}")
            return None

    def update_documents(
        self,
        collection_name: str,
        ids: List[str],
        texts: Optional[List[str]] = None,
        embeddings: Optional[List[np.ndarray]] = None,
        metadatas: Optional[List[Dict]] = None
    ) -> bool:
        """Update existing documents in collection"""
        collection = self.get_collection(collection_name)
        if not collection:
            return False
        
        try:
            update_params = {'ids': ids}
            
            if texts:
                update_params['documents'] = texts
            if embeddings:
                update_params['embeddings'] = [
                    emb.tolist() if isinstance(emb, np.ndarray) else emb
                    for emb in embeddings
                ]
            if metadatas:
                update_params['metadatas'] = metadatas
            
            collection.update(**update_params)
            logger.info(f"Updated {len(ids)} documents in '{collection_name}'")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update documents in '{collection_name}': {e}")
            return False

    def delete_documents(
        self,
        collection_name: str,
        ids: Optional[List[str]] = None,
        where: Optional[Dict] = None
    ) -> bool:
        """
        Delete documents from collection.
        
        Args:
            collection_name: Target collection
            ids: Specific document IDs to delete
            where: Metadata filter for deletion
            
        Returns:
            Success status
        """
        collection = self.get_collection(collection_name)
        if not collection:
            return False
        
        try:
            if ids:
                collection.delete(ids=ids)
            elif where:
                collection.delete(where=where)
            else:
                logger.warning("No deletion criteria provided")
                return False
            
            logger.info(f"Deleted documents from '{collection_name}'")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete from '{collection_name}': {e}")
            return False

    def get_statistics(self) -> Dict:
        """Get overall statistics about all collections"""
        collections = self.list_collections()
        
        stats = {
            'total_collections': len(collections),
            'collections': {}
        }
        
        total_docs = 0
        for name in collections:
            info = self.get_collection_info(name)
            if info:
                stats['collections'][name] = info
                total_docs += info['count']
        
        stats['total_documents'] = total_docs
        
        return stats


# Global instance
_global_vector_store: Optional[VectorStoreManager] = None


def get_vector_store(persist_directory: Optional[str] = None) -> VectorStoreManager:
    """Get or create global vector store instance"""
    global _global_vector_store
    
    if _global_vector_store is None:
        persist_dir = persist_directory or "./data/vector_store"
        _global_vector_store = VectorStoreManager(persist_directory=persist_dir)
    
    return _global_vector_store
