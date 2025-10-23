"""
Ollama service wrapper for interacting with local Ollama API.
Handles all communication with Ollama HTTP API and CLI operations.
"""
import asyncio
import subprocess
import re
from typing import Dict, Any, List, Optional
from datetime import datetime

import httpx
from httpx import AsyncClient, ConnectError, TimeoutException

from utils.config import get_settings
from utils.logger import get_logger
from schemas.request_schemas import GenerateRequest

logger = get_logger(__name__)


class OllamaServiceError(Exception):
    """Base exception for Ollama service errors."""
    pass


class OllamaConnectionError(OllamaServiceError):
    """Raised when unable to connect to Ollama."""
    pass


class ModelNotFoundError(OllamaServiceError):
    """Raised when requested model is not available."""
    pass


class OllamaService:
    """
    Service for interacting with Ollama API and CLI.
    Provides async methods for model management and text generation.
    """
    
    def __init__(self):
        """Initialize Ollama service with settings."""
        self.settings = get_settings()
        self.client: Optional[AsyncClient] = None
        self._client_lock = asyncio.Lock()
        # Track active downloads: model_name -> progress info
        self.active_downloads: Dict[str, Dict[str, Any]] = {}
    
    async def get_client(self) -> AsyncClient:
        """Get or create async HTTP client."""
        if self.client is None:
            async with self._client_lock:
                if self.client is None:
                    self.client = AsyncClient(
                        timeout=httpx.Timeout(self.settings.ollama_timeout),
                        limits=httpx.Limits(
                            max_connections=self.settings.max_concurrent_requests,
                            max_keepalive_connections=self.settings.max_concurrent_requests
                        )
                    )
        return self.client
    
    async def close(self):
        """Close the HTTP client."""
        if self.client:
            await self.client.aclose()
            self.client = None
    
    async def check_health(self) -> bool:
        """
        Check if Ollama service is running and accessible.
        
        Returns:
            bool: True if Ollama is accessible, False otherwise
        """
        try:
            client = await self.get_client()
            response = await client.get(f"{self.settings.ollama_base_url}/api/tags")
            return response.status_code == 200
        except (ConnectError, TimeoutException) as e:
            logger.warning("ollama_health_check_failed", error=str(e))
            return False
        except Exception as e:
            logger.error("ollama_health_check_error", error=str(e))
            return False
    
    async def list_models(self) -> List[Dict[str, Any]]:
        """
        List all locally available models.
        
        Returns:
            List of model information dictionaries
            
        Raises:
            OllamaConnectionError: If unable to connect to Ollama
        """
        try:
            client = await self.get_client()
            response = await client.get(f"{self.settings.ollama_api_url}/tags")
            
            if response.status_code != 200:
                logger.error(
                    "list_models_failed",
                    status_code=response.status_code,
                    response=response.text
                )
                raise OllamaServiceError(f"Failed to list models: {response.text}")
            
            data = response.json()
            models = data.get("models", [])
            
            logger.info("models_listed", count=len(models))
            return models
            
        except (ConnectError, TimeoutException) as e:
            logger.error("ollama_connection_error", error=str(e))
            raise OllamaConnectionError(
                "Unable to connect to Ollama. Ensure Ollama is running."
            )
    
    async def generate(self, request: GenerateRequest) -> Dict[str, Any]:
        """
        Generate text using specified model.
        
        Args:
            request: Generation request with model and prompt details
            
        Returns:
            Dictionary containing generated response and metadata
            
        Raises:
            ModelNotFoundError: If model is not available
            OllamaServiceError: If generation fails
        """
        try:
            client = await self.get_client()
            
            # Prepare request payload
            payload = {
                "model": request.model,
                "prompt": request.prompt,
                "stream": False,  # Non-streaming response
                "options": {}
            }
            
            # Add generation parameters
            if request.max_tokens:
                payload["options"]["num_predict"] = request.max_tokens
            if request.temperature is not None:
                payload["options"]["temperature"] = request.temperature
            if request.top_p is not None:
                payload["options"]["top_p"] = request.top_p
            if request.top_k is not None:
                payload["options"]["top_k"] = request.top_k
            if request.repeat_penalty is not None:
                payload["options"]["repeat_penalty"] = request.repeat_penalty
            if request.context is not None:
                payload["context"] = request.context
            
            logger.info(
                "generation_started",
                model=request.model,
                prompt_length=len(request.prompt)
            )
            
            # Make API call
            response = await client.post(
                f"{self.settings.ollama_api_url}/generate",
                json=payload
            )
            
            if response.status_code == 404:
                logger.error("model_not_found", model=request.model)
                raise ModelNotFoundError(
                    f"Model '{request.model}' not found. "
                    "Please download it first using /models/download"
                )
            
            if response.status_code != 200:
                logger.error(
                    "generation_failed",
                    status_code=response.status_code,
                    response=response.text
                )
                raise OllamaServiceError(
                    f"Generation failed: {response.text}"
                )
            
            result = response.json()
            
            logger.info(
                "generation_completed",
                model=request.model,
                response_length=len(result.get("response", "")),
                eval_count=result.get("eval_count")
            )
            
            return result
            
        except (ConnectError, TimeoutException) as e:
            logger.error("ollama_connection_error", error=str(e))
            raise OllamaConnectionError(
                "Unable to connect to Ollama. Ensure Ollama is running."
            )
    
    async def download_model(self, model_name: str) -> Dict[str, str]:
        """
        Download a model using Ollama CLI with progress tracking.
        
        Args:
            model_name: Name of the model to download
            
        Returns:
            Dictionary with status information
            
        Note:
            This runs the Ollama CLI command in the background.
            For large models, this may take significant time.
            Progress can be tracked using get_download_progress().
        """
        try:
            logger.info("model_download_started", model=model_name)
            
            # Initialize progress tracking
            self.active_downloads[model_name] = {
                "status": "downloading",
                "progress": 0,
                "message": "Starting download...",
                "started_at": datetime.now().isoformat()
            }
            
            # Start download in background task
            asyncio.create_task(self._download_model_background(model_name))
            
            return {
                "status": "initiated",
                "model_name": model_name,
                "message": f"Download of '{model_name}' has been initiated"
            }
                
        except FileNotFoundError:
            logger.error("ollama_cli_not_found")
            raise OllamaServiceError(
                "Ollama CLI not found. Please ensure Ollama is installed."
            )
        except Exception as e:
            logger.error("model_download_error", model=model_name, error=str(e))
            raise OllamaServiceError(f"Model download failed: {str(e)}")
    
    async def _download_model_background(self, model_name: str):
        """
        Background task to download model and track progress.
        
        Args:
            model_name: Name of the model to download
        """
        try:
            # Use Ollama CLI to pull the model
            process = await asyncio.create_subprocess_exec(
                "ollama",
                "pull",
                model_name,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            # Monitor stdout for progress
            if process.stdout:
                async for line in process.stdout:
                    line_str = line.decode().strip()
                    if line_str:
                        # Parse progress from output
                        self._update_download_progress(model_name, line_str)
                        logger.debug("download_progress", model=model_name, line=line_str)
            
            # Wait for process to complete
            await process.wait()
            
            if process.returncode == 0:
                logger.info("model_download_completed", model=model_name)
                self.active_downloads[model_name] = {
                    "status": "completed",
                    "progress": 100,
                    "message": f"Model '{model_name}' downloaded successfully",
                    "completed_at": datetime.now().isoformat()
                }
            else:
                stderr_output = ""
                if process.stderr:
                    stderr_output = await process.stderr.read()
                    stderr_output = stderr_output.decode()
                
                error_msg = stderr_output if stderr_output else "Unknown error"
                logger.error(
                    "model_download_failed",
                    model=model_name,
                    error=error_msg
                )
                self.active_downloads[model_name] = {
                    "status": "failed",
                    "progress": 0,
                    "message": f"Download failed: {error_msg}",
                    "error": error_msg
                }
                
        except Exception as e:
            logger.error("model_download_error", model=model_name, error=str(e))
            self.active_downloads[model_name] = {
                "status": "failed",
                "progress": 0,
                "message": f"Download failed: {str(e)}",
                "error": str(e)
            }
    
    def _update_download_progress(self, model_name: str, line: str):
        """
        Parse and update download progress from CLI output.
        
        Args:
            model_name: Name of the model being downloaded
            line: Output line from ollama pull command
        """
        if model_name not in self.active_downloads:
            return
        
        # Try to extract percentage from output
        # Ollama outputs lines like "pulling manifest" or "downloading digestname"
        # and shows progress bars
        progress_match = re.search(r'(\d+)%', line)
        if progress_match:
            progress = int(progress_match.group(1))
            self.active_downloads[model_name]["progress"] = progress
            self.active_downloads[model_name]["message"] = line
        else:
            # Update message even if no percentage found
            self.active_downloads[model_name]["message"] = line
    
    def get_download_progress(self, model_name: str) -> Optional[Dict[str, Any]]:
        """
        Get current download progress for a model.
        
        Args:
            model_name: Name of the model
            
        Returns:
            Dictionary with progress information or None if not downloading
        """
        return self.active_downloads.get(model_name)
    
    def clear_download_progress(self, model_name: str):
        """
        Clear download progress tracking for a model.
        
        Args:
            model_name: Name of the model
        """
        if model_name in self.active_downloads:
            del self.active_downloads[model_name]
    
    async def delete_model(self, model_name: str) -> Dict[str, str]:
        """
        Delete a model using Ollama CLI.
        
        Args:
            model_name: Name of the model to delete
            
        Returns:
            Dictionary with status information
        """
        try:
            logger.info("model_deletion_started", model=model_name)
            
            # Use Ollama CLI to remove the model
            process = await asyncio.create_subprocess_exec(
                "ollama",
                "rm",
                model_name,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                logger.info("model_deletion_completed", model=model_name)
                return {
                    "status": "success",
                    "model_name": model_name,
                    "message": f"Model '{model_name}' deleted successfully"
                }
            else:
                error_msg = stderr.decode() if stderr else "Unknown error"
                logger.error(
                    "model_deletion_failed",
                    model=model_name,
                    error=error_msg
                )
                
                if "not found" in error_msg.lower():
                    raise ModelNotFoundError(f"Model '{model_name}' not found")
                
                raise OllamaServiceError(f"Failed to delete model: {error_msg}")
                
        except FileNotFoundError:
            logger.error("ollama_cli_not_found")
            raise OllamaServiceError(
                "Ollama CLI not found. Please ensure Ollama is installed."
            )
        except Exception as e:
            logger.error("model_deletion_error", model=model_name, error=str(e))
            raise OllamaServiceError(f"Model deletion failed: {str(e)}")


# Global service instance
_ollama_service: Optional[OllamaService] = None


def get_ollama_service() -> OllamaService:
    """
    Get or create the global Ollama service instance.
    
    Returns:
        OllamaService instance
    """
    global _ollama_service
    if _ollama_service is None:
        _ollama_service = OllamaService()
    return _ollama_service


async def cleanup_ollama_service():
    """Cleanup the global Ollama service instance."""
    global _ollama_service
    if _ollama_service:
        await _ollama_service.close()
        _ollama_service = None
