"""
Hybrid search engine combining semantic vector search with lexical BM25 ranking.
Provides enterprise-grade retrieval with weighted score fusion.
"""

import logging
import re
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import json
import pickle

try:
    from whoosh import index
    from whoosh.fields import Schema, TEXT, ID, STORED
    from whoosh.qparser import QueryParser, MultifieldParser
    from whoosh.scoring import BM25F
    from whoosh.query import And, Or, Term
    WHOOSH_AVAILABLE = True
except ImportError:
    WHOOSH_AVAILABLE = False

import numpy as np

logger = logging.getLogger(__name__)


class HybridSearchEngine:
    """
    Enterprise hybrid search combining:
    1. Semantic similarity (vector search via ChromaDB)
    2. Lexical matching (BM25 via Whoosh)
    
    Results are merged with configurable weighting.
    """

    def __init__(
        self,
        vector_store,
        keyword_index_dir: str = "./data/keyword_index",
        semantic_weight: float = 0.7,
        lexical_weight: float = 0.3
    ):
        """
        Initialize hybrid search engine.
        
        Args:
            vector_store: VectorStoreManager instance
            keyword_index_dir: Directory for Whoosh keyword indices
            semantic_weight: Weight for semantic scores (0-1)
            lexical_weight: Weight for lexical scores (0-1)
        """
        self.vector_store = vector_store
        self.keyword_index_dir = Path(keyword_index_dir)
        self.keyword_index_dir.mkdir(parents=True, exist_ok=True)
        
        # Validate weights
        total = semantic_weight + lexical_weight
        self.semantic_weight = semantic_weight / total
        self.lexical_weight = lexical_weight / total
        
        # Index cache
        self.whoosh_indices = {}
        
        if not WHOOSH_AVAILABLE:
            logger.warning("Whoosh not available. Hybrid search will use semantic only.")
        
        logger.info(
            f"HybridSearch initialized (semantic: {self.semantic_weight:.2f}, "
            f"lexical: {self.lexical_weight:.2f})"
        )

    def create_keyword_index(self, collection_name: str) -> bool:
        """
        Create Whoosh keyword index for a collection.
        
        Args:
            collection_name: Name of the collection/index
            
        Returns:
            Success status
        """
        if not WHOOSH_AVAILABLE:
            return False
        
        try:
            index_dir = self.keyword_index_dir / collection_name
            index_dir.mkdir(exist_ok=True)
            
            # Define schema
            schema = Schema(
                id=ID(stored=True, unique=True),
                content=TEXT(stored=True),
                keywords=TEXT(stored=True),
                metadata=STORED
            )
            
            # Create index
            idx = index.create_in(str(index_dir), schema)
            self.whoosh_indices[collection_name] = idx
            
            logger.info(f"Created keyword index for '{collection_name}'")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create keyword index for '{collection_name}': {e}")
            return False

    def get_keyword_index(self, collection_name: str):
        """Get or load Whoosh index"""
        if collection_name in self.whoosh_indices:
            return self.whoosh_indices[collection_name]
        
        if not WHOOSH_AVAILABLE:
            return None
        
        try:
            index_dir = self.keyword_index_dir / collection_name
            if not index_dir.exists():
                return None
            
            idx = index.open_dir(str(index_dir))
            self.whoosh_indices[collection_name] = idx
            return idx
            
        except Exception as e:
            logger.warning(f"Failed to load keyword index '{collection_name}': {e}")
            return None

    def add_to_keyword_index(
        self,
        collection_name: str,
        documents: List[Dict[str, str]]
    ) -> bool:
        """
        Add documents to keyword index.
        
        Args:
            collection_name: Target index
            documents: List of dicts with 'id', 'content', 'keywords', 'metadata'
            
        Returns:
            Success status
        """
        idx = self.get_keyword_index(collection_name)
        if not idx:
            # Try to create if doesn't exist
            self.create_keyword_index(collection_name)
            idx = self.get_keyword_index(collection_name)
        
        if not idx:
            logger.warning(f"Keyword index unavailable for '{collection_name}'")
            return False
        
        try:
            writer = idx.writer()
            
            for doc in documents:
                # Serialize metadata
                metadata_json = json.dumps(doc.get('metadata', {}))
                
                writer.add_document(
                    id=doc['id'],
                    content=doc.get('content', ''),
                    keywords=doc.get('keywords', ''),
                    metadata=metadata_json
                )
            
            writer.commit()
            logger.info(f"Added {len(documents)} documents to keyword index '{collection_name}'")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add to keyword index '{collection_name}': {e}")
            return False

    def semantic_search(
        self,
        collection_name: str,
        query_embedding: np.ndarray,
        top_k: int = 10
    ) -> List[Dict]:
        """
        Perform semantic vector search with improved score normalization.
        
        Returns:
            List of results with normalized scores (0-1)
        """
        results = self.vector_store.query(
            collection_name=collection_name,
            query_embedding=query_embedding,
            top_k=top_k
        )
        
        if not results['ids'] or len(results['ids']) == 0:
            return []
        
        # Convert ChromaDB distances to similarity scores
        # ChromaDB uses L2 (Euclidean) distance - lower is better
        formatted_results = []
        distances = results['distances']
        
        # Normalize using min-max scaling for better score distribution
        min_dist = min(distances) if distances else 0
        max_dist = max(distances) if distances else 1
        dist_range = max_dist - min_dist if max_dist > min_dist else 1
        
        for i, doc_id in enumerate(results['ids']):
            distance = distances[i]
            
            # Normalize distance to 0-1 range, then invert to get similarity
            # Min distance -> score 1.0, Max distance -> score 0.0
            if dist_range > 0:
                normalized_similarity = 1.0 - ((distance - min_dist) / dist_range)
            else:
                normalized_similarity = 1.0
            
            # Apply exponential scaling for better discrimination
            # This emphasizes differences in top results
            semantic_score = normalized_similarity ** 0.5  # Square root for softer scaling
            
            formatted_results.append({
                'id': doc_id,
                'text': results['documents'][i],
                'metadata': results['metadatas'][i],
                'semantic_score': semantic_score,
                'distance': distance
            })
        
        return formatted_results

    def lexical_search(
        self,
        collection_name: str,
        query_text: str,
        top_k: int = 10
    ) -> List[Dict]:
        """
        Perform BM25 keyword search with improved scoring.
        
        Returns:
            List of results with normalized BM25 scores
        """
        idx = self.get_keyword_index(collection_name)
        if not idx:
            logger.warning(f"No keyword index for '{collection_name}'. Skipping lexical search.")
            return []
        
        try:
            # Use BM25F with optimized parameters
            # K1 controls term frequency saturation (higher = less saturation)
            # B controls length normalization (higher = more penalization for long docs)
            bm25_weighting = BM25F(K1=1.5, B=0.75)
            
            with idx.searcher(weighting=bm25_weighting) as searcher:
                # Parse query across content and keywords fields with boosting
                parser = MultifieldParser(
                    ["content", "keywords"],
                    schema=idx.schema,
                    fieldboosts={'keywords': 1.5}  # Boost keyword field for better precision
                )
                
                # Preprocess query
                processed_query = self._preprocess_query(query_text)
                query = parser.parse(processed_query)
                
                # Search with more results for better score distribution
                results = searcher.search(query, limit=min(top_k * 2, 50))
                
                if not results:
                    return []
                
                # Collect all scores for better normalization
                all_scores = [hit.score for hit in results]
                max_score = max(all_scores) if all_scores else 1.0
                min_score = min(all_scores) if all_scores else 0.0
                score_range = max_score - min_score if max_score > min_score else 1.0
                
                # Format results with improved normalization
                formatted_results = []
                for hit in results[:top_k]:
                    raw_score = hit.score
                    
                    # Min-max normalization for better score distribution
                    if score_range > 0:
                        normalized_score = (raw_score - min_score) / score_range
                    else:
                        normalized_score = 1.0 if raw_score > 0 else 0.0
                    
                    # Apply sigmoid-like transformation for better discrimination
                    lexical_score = normalized_score ** 0.7  # Softer than linear
                    
                    # Parse metadata
                    metadata = json.loads(hit['metadata']) if hit['metadata'] else {}
                    
                    formatted_results.append({
                        'id': hit['id'],
                        'text': hit.get('content', ''),
                        'metadata': metadata,
                        'lexical_score': lexical_score,
                        'bm25_score': raw_score
                    })
                
                return formatted_results
                
        except Exception as e:
            logger.error(f"Lexical search failed on '{collection_name}': {e}")
            return []
    
    def _preprocess_query(self, query_text: str) -> str:
        """
        Preprocess query for better matching.
        - Remove special characters
        - Expand common abbreviations
        - Handle phrases
        """
        # Remove special chars except spaces and quotes
        query = re.sub(r'[^\w\s"\']', ' ', query_text)
        
        # Common abbreviations expansion
        expansions = {
            'ai': 'artificial intelligence',
            'ml': 'machine learning',
            'nlp': 'natural language processing',
            'api': 'application programming interface',
            'ui': 'user interface',
            'ux': 'user experience',
        }
        
        words = query.lower().split()
        expanded_words = []
        for word in words:
            if word in expansions:
                expanded_words.append(f"({word} OR {expansions[word]})")
            else:
                expanded_words.append(word)
        
        return ' '.join(expanded_words)

    def hybrid_search(
        self,
        collection_name: str,
        query_text: str,
        query_embedding: np.ndarray,
        top_k: int = 10,
        min_score: float = 0.0
    ) -> List[Dict]:
        """
        Perform hybrid search combining semantic and lexical results.
        Gracefully degrades to semantic-only if keyword index unavailable.
        
        Args:
            collection_name: Index to search
            query_text: Query string for lexical search
            query_embedding: Query vector for semantic search
            top_k: Number of final results
            min_score: Minimum hybrid score threshold
            
        Returns:
            Merged and ranked results
        """
        # Get semantic results (always available)
        semantic_results = self.semantic_search(
            collection_name, query_embedding, top_k=top_k * 2
        )
        
        if not semantic_results:
            logger.warning(f"No semantic results found for query in '{collection_name}'")
            return []
        
        # Get lexical results (may not be available)
        lexical_results = self.lexical_search(
            collection_name, query_text, top_k=top_k * 2
        )
        
        # If no lexical results, fall back to semantic only
        if not lexical_results:
            logger.info(f"No keyword index for '{collection_name}', using semantic search only")
            # Add hybrid_score to semantic results
            for result in semantic_results:
                result['hybrid_score'] = result['semantic_score']
                result['lexical_score'] = 0.0
                result['source'] = 'semantic'
            
            semantic_results.sort(key=lambda x: x['hybrid_score'], reverse=True)
            return semantic_results[:top_k]
        
        # Merge results
        merged = self._merge_results(semantic_results, lexical_results)
        
        # Filter by minimum score
        if min_score > 0:
            merged = [r for r in merged if r['hybrid_score'] >= min_score]
        
        # Sort by hybrid score and return top-k
        merged.sort(key=lambda x: x['hybrid_score'], reverse=True)
        return merged[:top_k]

    def _merge_results(
        self,
        semantic_results: List[Dict],
        lexical_results: List[Dict]
    ) -> List[Dict]:
        """
        Merge and rank results using enhanced hybrid scoring.
        
        Features:
        - Weighted score fusion with normalization
        - Reciprocal Rank Fusion (RRF) for rank-based merging
        - Bonus for documents appearing in both result sets
        """
        # Build lookup by ID
        results_map = {}
        
        # Track ranks for RRF
        semantic_ranks = {result['id']: idx for idx, result in enumerate(semantic_results)}
        lexical_ranks = {result['id']: idx for idx, result in enumerate(lexical_results)}
        
        # Add semantic results
        for idx, result in enumerate(semantic_results):
            doc_id = result['id']
            results_map[doc_id] = {
                **result,
                'semantic_score': result.get('semantic_score', 0),
                'semantic_rank': idx,
                'lexical_score': 0,
                'lexical_rank': None,
                'source': 'semantic'
            }
        
        # Merge lexical results
        for idx, result in enumerate(lexical_results):
            doc_id = result['id']
            
            if doc_id in results_map:
                # Already exists from semantic search - found in both!
                results_map[doc_id]['lexical_score'] = result.get('lexical_score', 0)
                results_map[doc_id]['lexical_rank'] = idx
                results_map[doc_id]['source'] = 'both'
            else:
                # Only in lexical results
                results_map[doc_id] = {
                    **result,
                    'semantic_score': 0,
                    'semantic_rank': None,
                    'lexical_score': result.get('lexical_score', 0),
                    'lexical_rank': idx,
                    'source': 'lexical'
                }
        
        # Calculate hybrid scores with multiple strategies
        merged_results = []
        k_rrf = 60  # RRF parameter (standard value)
        
        for doc_id, result in results_map.items():
            # Strategy 1: Weighted score fusion (traditional)
            score_fusion = (
                self.semantic_weight * result['semantic_score'] +
                self.lexical_weight * result['lexical_score']
            )
            
            # Strategy 2: Reciprocal Rank Fusion (position-based)
            rrf_score = 0
            if result['semantic_rank'] is not None:
                rrf_score += 1 / (k_rrf + result['semantic_rank'] + 1)
            if result['lexical_rank'] is not None:
                rrf_score += 1 / (k_rrf + result['lexical_rank'] + 1)
            
            # Normalize RRF to 0-1 range (approximate)
            rrf_normalized = min(rrf_score * k_rrf / 2, 1.0)
            
            # Combine strategies: 70% score fusion, 30% RRF
            hybrid_score = 0.7 * score_fusion + 0.3 * rrf_normalized
            
            # Apply bonus for documents found in both result sets (high confidence)
            if result['source'] == 'both':
                hybrid_score *= 1.15  # 15% bonus for cross-validation
            
            # Clamp to 0-1 range
            hybrid_score = min(max(hybrid_score, 0.0), 1.0)
            
            result['hybrid_score'] = hybrid_score
            result['rrf_score'] = rrf_normalized
            merged_results.append(result)
        
        return merged_results

    def search(
        self,
        collection_name: str,
        query_text: str,
        query_embedding: Optional[np.ndarray] = None,
        top_k: int = 10,
        search_type: str = 'hybrid'
    ) -> List[Dict]:
        """
        Main search interface.
        
        Args:
            collection_name: Index to search
            query_text: Natural language query
            query_embedding: Pre-computed query embedding (optional)
            top_k: Number of results
            search_type: 'hybrid', 'semantic', or 'lexical'
            
        Returns:
            Search results with scores and metadata
        """
        if search_type == 'semantic':
            if query_embedding is None:
                raise ValueError("query_embedding required for semantic search")
            return self.semantic_search(collection_name, query_embedding, top_k)
        
        elif search_type == 'lexical':
            return self.lexical_search(collection_name, query_text, top_k)
        
        elif search_type == 'hybrid':
            if query_embedding is None:
                raise ValueError("query_embedding required for hybrid search")
            return self.hybrid_search(
                collection_name, query_text, query_embedding, top_k
            )
        
        else:
            raise ValueError(f"Unknown search_type: {search_type}")

    def delete_keyword_index(self, collection_name: str) -> bool:
        """Delete keyword index for collection"""
        try:
            index_dir = self.keyword_index_dir / collection_name
            if index_dir.exists():
                import shutil
                shutil.rmtree(index_dir)
                logger.info(f"Deleted keyword index: {collection_name}")
            
            if collection_name in self.whoosh_indices:
                del self.whoosh_indices[collection_name]
            
            return True
        except Exception as e:
            logger.error(f"Failed to delete keyword index '{collection_name}': {e}")
            return False


# Global instance
_global_hybrid_search: Optional[HybridSearchEngine] = None


def get_hybrid_search(vector_store) -> HybridSearchEngine:
    """Get or create global hybrid search engine"""
    global _global_hybrid_search
    
    if _global_hybrid_search is None:
        _global_hybrid_search = HybridSearchEngine(vector_store)
    
    return _global_hybrid_search
