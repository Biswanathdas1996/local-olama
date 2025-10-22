"""
Context handler for managing large prompts and multi-turn conversations.
Optimizes memory usage and token management for large context windows.
"""
from typing import List, Optional, Dict, Any
import sys

from utils.config import get_settings
from utils.logger import get_logger

logger = get_logger(__name__)


class ContextHandler:
    """
    Handles large context sizes and optimizes prompt management.
    Provides utilities for chunking, validation, and context preservation.
    """
    
    def __init__(self):
        """Initialize context handler with settings."""
        self.settings = get_settings()
        self.max_prompt_size = self.settings.max_prompt_size_bytes
    
    def validate_prompt_size(self, prompt: str) -> bool:
        """
        Validate that prompt size is within acceptable limits.
        
        Args:
            prompt: The prompt text to validate
            
        Returns:
            True if valid, False otherwise
        """
        prompt_bytes = len(prompt.encode('utf-8'))
        
        if prompt_bytes > self.max_prompt_size:
            logger.warning(
                "prompt_size_exceeded",
                size_bytes=prompt_bytes,
                max_bytes=self.max_prompt_size
            )
            return False
        
        return True
    
    def get_prompt_stats(self, prompt: str) -> Dict[str, Any]:
        """
        Get statistics about the prompt.
        
        Args:
            prompt: The prompt text
            
        Returns:
            Dictionary with prompt statistics
        """
        prompt_bytes = len(prompt.encode('utf-8'))
        prompt_chars = len(prompt)
        
        # Rough token estimate (1 token ≈ 4 characters for English text)
        estimated_tokens = prompt_chars // 4
        
        return {
            "size_bytes": prompt_bytes,
            "size_mb": round(prompt_bytes / (1024 * 1024), 2),
            "characters": prompt_chars,
            "estimated_tokens": estimated_tokens,
            "within_limit": prompt_bytes <= self.max_prompt_size
        }
    
    def truncate_prompt(
        self,
        prompt: str,
        max_tokens: Optional[int] = None,
        preserve_start: bool = True
    ) -> str:
        """
        Truncate prompt to fit within token limits.
        
        Args:
            prompt: The prompt text to truncate
            max_tokens: Maximum number of tokens (estimated)
            preserve_start: If True, keep the beginning of prompt; else keep end
            
        Returns:
            Truncated prompt
        """
        if max_tokens is None:
            # Use byte limit as fallback
            max_bytes = self.max_prompt_size
            prompt_bytes = len(prompt.encode('utf-8'))
            
            if prompt_bytes <= max_bytes:
                return prompt
            
            # Binary search to find the right truncation point
            if preserve_start:
                # Keep the start, truncate the end
                low, high = 0, len(prompt)
                while low < high:
                    mid = (low + high + 1) // 2
                    if len(prompt[:mid].encode('utf-8')) <= max_bytes:
                        low = mid
                    else:
                        high = mid - 1
                truncated = prompt[:low]
            else:
                # Keep the end, truncate the start
                low, high = 0, len(prompt)
                while low < high:
                    mid = (low + high) // 2
                    if len(prompt[mid:].encode('utf-8')) <= max_bytes:
                        high = mid
                    else:
                        low = mid + 1
                truncated = prompt[low:]
        else:
            # Estimate based on tokens (rough: 1 token ≈ 4 chars)
            max_chars = max_tokens * 4
            if len(prompt) <= max_chars:
                return prompt
            
            if preserve_start:
                truncated = prompt[:max_chars]
            else:
                truncated = prompt[-max_chars:]
        
        logger.info(
            "prompt_truncated",
            original_size=len(prompt),
            truncated_size=len(truncated),
            preserved_start=preserve_start
        )
        
        return truncated
    
    def prepare_context_for_continuation(
        self,
        context: Optional[List[int]],
        max_context_length: int = 4096
    ) -> Optional[List[int]]:
        """
        Prepare context tokens for multi-turn conversation continuation.
        
        Args:
            context: Previous context tokens
            max_context_length: Maximum context length to maintain
            
        Returns:
            Processed context tokens
        """
        if not context:
            return None
        
        if len(context) <= max_context_length:
            return context
        
        # Keep most recent context
        truncated_context = context[-max_context_length:]
        
        logger.info(
            "context_truncated",
            original_length=len(context),
            truncated_length=len(truncated_context)
        )
        
        return truncated_context
    
    def estimate_memory_usage(self, prompt: str) -> Dict[str, float]:
        """
        Estimate memory usage for processing the prompt.
        
        Args:
            prompt: The prompt text
            
        Returns:
            Dictionary with memory estimates in MB
        """
        prompt_size_mb = len(prompt.encode('utf-8')) / (1024 * 1024)
        
        # Rough estimates:
        # - Prompt storage: actual size
        # - Processing overhead: ~2x prompt size
        # - Response buffer: ~1x prompt size (conservative)
        
        estimated = {
            "prompt_mb": round(prompt_size_mb, 2),
            "processing_overhead_mb": round(prompt_size_mb * 2, 2),
            "response_buffer_mb": round(prompt_size_mb, 2),
            "total_estimated_mb": round(prompt_size_mb * 4, 2)
        }
        
        return estimated


# Global instance
_context_handler: Optional[ContextHandler] = None


def get_context_handler() -> ContextHandler:
    """
    Get or create the global context handler instance.
    
    Returns:
        ContextHandler instance
    """
    global _context_handler
    if _context_handler is None:
        _context_handler = ContextHandler()
    return _context_handler
