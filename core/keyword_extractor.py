"""
Keyword extraction for hybrid search using KeyBERT.
Extracts semantically relevant keywords for lexical matching.
"""

import logging
from typing import List, Dict, Set
import re

try:
    from keybert import KeyBERT
    KEYBERT_AVAILABLE = True
except ImportError:
    KEYBERT_AVAILABLE = False

try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False

logger = logging.getLogger(__name__)


class KeywordExtractor:
    """
    Enterprise keyword extraction for hybrid search.
    
    Uses KeyBERT for semantic keyword extraction and optional
    SpaCy for part-of-speech filtering.
    """

    def __init__(
        self,
        model_name: str = 'all-MiniLM-L6-v2',
        use_spacy: bool = True,
        spacy_model: str = 'en_core_web_sm'
    ):
        """
        Initialize keyword extractor.
        
        Args:
            model_name: Sentence transformer model for KeyBERT
            use_spacy: Use SpaCy for POS filtering
            spacy_model: SpaCy model name
        """
        self.use_spacy = use_spacy
        self.model = None
        self.nlp = None
        self.model_name = model_name
        
        # Initialize KeyBERT
        if KEYBERT_AVAILABLE:
            try:
                from sentence_transformers import SentenceTransformer
                # Pre-load the model for KeyBERT
                sentence_model = SentenceTransformer(model_name)
                self.model = KeyBERT(model=sentence_model)
                logger.info(f"KeyBERT initialized with model: {model_name}")
            except Exception as e:
                logger.warning(f"KeyBERT initialization failed: {e}. Will use fallback.")
                self.model = None
        else:
            logger.warning("KeyBERT not available. Install with: pip install keybert")
        
        # Initialize SpaCy
        if use_spacy and SPACY_AVAILABLE:
            try:
                self.nlp = spacy.load(spacy_model, disable=['parser', 'ner'])  # Faster loading
                logger.info(f"SpaCy loaded: {spacy_model}")
            except OSError as e:
                logger.warning(f"SpaCy model not found: {e}. Attempting download...")
                try:
                    import subprocess
                    import sys
                    result = subprocess.run(
                        [sys.executable, '-m', 'spacy', 'download', spacy_model],
                        check=True,
                        capture_output=True,
                        text=True,
                        timeout=120
                    )
                    logger.info(f"SpaCy download output: {result.stdout}")
                    self.nlp = spacy.load(spacy_model, disable=['parser', 'ner'])
                    logger.info(f"SpaCy downloaded and loaded: {spacy_model}")
                except Exception as e2:
                    logger.error(f"SpaCy download failed: {e2}. Keyword extraction will be limited.")
                    self.nlp = None
            except Exception as e:
                logger.error(f"SpaCy initialization failed: {e}")
                self.nlp = None
        else:
            if not SPACY_AVAILABLE:
                logger.warning("SpaCy not available. Install with: pip install spacy")

    def extract_keywords(
        self,
        text: str,
        top_n: int = 10,
        use_mmr: bool = True,
        diversity: float = 0.7
    ) -> List[str]:
        """
        Extract keywords from text with enhanced quality.
        
        Args:
            text: Input text
            top_n: Number of keywords to extract
            use_mmr: Use Maximal Marginal Relevance for diversity
            diversity: MMR diversity parameter (0-1, higher = more diverse)
            
        Returns:
            List of extracted keywords
        """
        if not text or not text.strip():
            return []
        
        keywords = []
        
        # Try KeyBERT first (semantic keyword extraction)
        if self.model:
            try:
                # Extract more candidates than needed for better filtering
                candidates_count = min(top_n * 3, 50)
                
                if use_mmr:
                    results = self.model.extract_keywords(
                        text,
                        top_n=candidates_count,
                        use_mmr=True,
                        diversity=diversity,  # Higher diversity for better coverage
                        keyphrase_ngram_range=(1, 3),  # Allow up to 3-word phrases
                        stop_words='english'
                    )
                else:
                    results = self.model.extract_keywords(
                        text,
                        top_n=candidates_count,
                        keyphrase_ngram_range=(1, 3),
                        stop_words='english'
                    )
                
                # Get keywords with scores for quality filtering
                keyword_candidates = [(kw[0], kw[1]) for kw in results if kw[1] > 0.3]  # Score threshold
                keywords = [kw[0] for kw in keyword_candidates]
                
                logger.debug(f"Extracted {len(keywords)} keywords with KeyBERT")
            except Exception as e:
                logger.warning(f"KeyBERT extraction failed: {e}. Using fallback.")
        
        # Fallback to rule-based extraction if KeyBERT unavailable
        if not keywords:
            keywords = self._extract_fallback(text, top_n * 2)
        
        # SpaCy-based quality filtering
        if self.nlp and keywords:
            keywords = self._filter_with_spacy(keywords)
        
        # Additional filtering: remove duplicates and very short keywords
        keywords = list(dict.fromkeys(keywords))  # Remove duplicates preserving order
        keywords = [kw for kw in keywords if len(kw) > 2]  # Remove 1-2 char keywords
        
        return keywords[:top_n]

    def extract_keywords_batch(
        self,
        texts: List[str],
        top_n: int = 10,
        use_mmr: bool = True
    ) -> List[List[str]]:
        """
        Extract keywords from multiple texts (batch processing).
        
        Args:
            texts: List of text documents
            top_n: Keywords per document
            use_mmr: Use MMR for diversity
            
        Returns:
            List of keyword lists
        """
        return [
            self.extract_keywords(text, top_n=top_n, use_mmr=use_mmr)
            for text in texts
        ]

    def _extract_fallback(self, text: str, top_n: int) -> List[str]:
        """
        Simple TF-based keyword extraction as fallback.
        
        Extracts frequently occurring meaningful words.
        """
        # Clean and tokenize
        text = text.lower()
        words = re.findall(r'\b[a-z]{3,}\b', text)
        
        # Remove common stop words
        stop_words = {
            'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can',
            'her', 'was', 'one', 'our', 'out', 'has', 'had', 'have', 'this',
            'that', 'with', 'from', 'they', 'been', 'were', 'said', 'their',
            'more', 'than', 'into', 'very', 'some', 'what', 'when', 'your'
        }
        
        words = [w for w in words if w not in stop_words]
        
        # Count frequencies
        word_freq = {}
        for word in words:
            word_freq[word] = word_freq.get(word, 0) + 1
        
        # Sort by frequency
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        
        return [word for word, _ in sorted_words[:top_n]]

    def _filter_with_spacy(self, keywords: List[str]) -> List[str]:
        """
        Filter keywords to keep only high-quality nouns, proper nouns, and meaningful phrases.
        """
        if not self.nlp:
            return keywords
        
        filtered = []
        seen_lemmas = set()  # Track lemmas to avoid near-duplicates
        
        for keyword in keywords:
            try:
                doc = self.nlp(keyword)
                
                # Skip if all stop words
                if all(token.is_stop for token in doc):
                    continue
                
                # Keep if contains noun, proper noun, or adjective+noun combination
                has_noun = any(token.pos_ in ['NOUN', 'PROPN'] for token in doc)
                has_adj_noun = any(
                    token.pos_ == 'ADJ' and doc[i+1].pos_ in ['NOUN', 'PROPN']
                    for i, token in enumerate(doc[:-1])
                )
                
                # Check for meaningful multi-word phrases
                is_meaningful_phrase = (
                    len(doc) > 1 and 
                    not all(token.is_stop for token in doc) and
                    any(token.pos_ in ['NOUN', 'PROPN', 'VERB', 'ADJ'] for token in doc)
                )
                
                # Get lemma for duplicate detection
                lemma = ' '.join([token.lemma_.lower() for token in doc if not token.is_stop])
                
                if (has_noun or has_adj_noun or is_meaningful_phrase) and lemma not in seen_lemmas:
                    filtered.append(keyword)
                    seen_lemmas.add(lemma)
            except Exception as e:
                # If processing fails, keep the keyword
                logger.debug(f"SpaCy filtering error for '{keyword}': {e}")
                if keyword not in [f[0] for f in filtered]:
                    filtered.append(keyword)
        
        return filtered

    def extract_entities(self, text: str) -> Dict[str, List[str]]:
        """
        Extract named entities using SpaCy.
        
        Args:
            text: Input text
            
        Returns:
            Dictionary of entity types to entity lists
        """
        if not self.nlp:
            return {}
        
        doc = self.nlp(text)
        entities = {}
        
        for ent in doc.ents:
            if ent.label_ not in entities:
                entities[ent.label_] = []
            entities[ent.label_].append(ent.text)
        
        return entities

    def get_terms_for_indexing(
        self,
        text: str,
        include_entities: bool = True,
        top_n: int = 10
    ) -> Set[str]:
        """
        Get all relevant terms for keyword indexing.
        
        Combines keywords and optional named entities.
        
        Args:
            text: Input text
            include_entities: Include named entities
            top_n: Number of keywords to extract
            
        Returns:
            Set of indexable terms
        """
        terms = set()
        
        # Extract keywords
        keywords = self.extract_keywords(text, top_n=top_n)
        terms.update(keywords)
        
        # Extract entities
        if include_entities and self.nlp:
            entities = self.extract_entities(text)
            for entity_list in entities.values():
                terms.update(entity_list)
        
        # Normalize (lowercase, strip)
        terms = {term.lower().strip() for term in terms if term}
        
        return terms


# Singleton instance
_global_extractor: KeywordExtractor = None


def get_keyword_extractor(**kwargs) -> KeywordExtractor:
    """Get or create global keyword extractor (singleton)"""
    global _global_extractor
    
    if _global_extractor is None:
        _global_extractor = KeywordExtractor(**kwargs)
    
    return _global_extractor
