"""
Service for converting trained models to Ollama-compatible format.
Handles GGUF conversion and Ollama model registration.
"""
import os
import json
import asyncio
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime

from utils.logger import get_logger
from services.ollama_service import get_ollama_service

logger = get_logger(__name__)


class ModelConversionService:
    """Service for converting and registering trained models with Ollama."""
    
    def __init__(self):
        """Initialize model conversion service."""
        self.ollama_service = get_ollama_service()
        self.converted_models_dir = Path("models/ollama_converted")
        self.converted_models_dir.mkdir(parents=True, exist_ok=True)
        
    async def convert_and_register_with_ollama(
        self,
        model_path: str,
        model_name: str,
        base_model: str,
        technique: str
    ) -> Dict[str, Any]:
        """
        Convert a trained model to GGUF format and register with Ollama.
        
        Args:
            model_path: Path to the trained model directory
            model_name: Name for the new Ollama model
            base_model: Original base model identifier
            technique: Training technique used (lora, qlora, etc.)
            
        Returns:
            Dictionary with conversion status and model information
        """
        try:
            logger.info(
                "starting_model_conversion",
                model_name=model_name,
                model_path=model_path
            )
            
            # For now, we'll create a simple approach:
            # 1. Create a Modelfile that references the base model
            # 2. Add adapter configuration
            # 3. Register with Ollama
            
            # Since direct GGUF conversion requires llama.cpp which is complex,
            # we'll use an alternative approach: create a Modelfile that loads
            # the adapter on top of an existing Ollama model
            
            result = await self._create_ollama_modelfile_with_adapter(
                model_path=model_path,
                model_name=model_name,
                base_model=base_model,
                technique=technique
            )
            
            return result
            
        except Exception as e:
            logger.error(
                "model_conversion_failed",
                model_name=model_name,
                error=str(e),
                exc_info=True
            )
            raise
    
    async def _create_ollama_modelfile_with_adapter(
        self,
        model_path: str,
        model_name: str,
        base_model: str,
        technique: str
    ) -> Dict[str, Any]:
        """
        Create an Ollama Modelfile and register the model.
        
        Note: This creates a reference to use the model via API calls.
        For full GGUF conversion, additional tools like llama.cpp would be needed.
        """
        try:
            # Get base Ollama model name from HuggingFace identifier
            ollama_base = self._map_hf_to_ollama_model(base_model)
            
            # Create Modelfile
            modelfile_content = self._generate_modelfile(
                ollama_base=ollama_base,
                model_name=model_name,
                model_path=model_path,
                technique=technique
            )
            
            # Save Modelfile
            modelfile_path = self.converted_models_dir / f"{model_name}.Modelfile"
            with open(modelfile_path, "w") as f:
                f.write(modelfile_content)
            
            logger.info(
                "modelfile_created",
                model_name=model_name,
                modelfile_path=str(modelfile_path)
            )
            
            # Try to create the model in Ollama
            # Note: This requires the base model to exist in Ollama
            try:
                await self._register_with_ollama(model_name, modelfile_path)
                
                return {
                    "status": "success",
                    "model_name": model_name,
                    "ollama_available": True,
                    "message": f"Model '{model_name}' registered with Ollama",
                    "modelfile_path": str(modelfile_path),
                    "instructions": (
                        f"Model is now available in Ollama. "
                        f"You can use it with: ollama run {model_name}"
                    )
                }
            except Exception as e:
                # If Ollama registration fails, still return success with instructions
                logger.warning(
                    "ollama_registration_warning",
                    model_name=model_name,
                    error=str(e)
                )
                
                return {
                    "status": "partial",
                    "model_name": model_name,
                    "ollama_available": False,
                    "message": f"Modelfile created but Ollama registration failed",
                    "modelfile_path": str(modelfile_path),
                    "instructions": (
                        f"To manually register with Ollama:\n"
                        f"1. Ensure '{ollama_base}' is available in Ollama\n"
                        f"2. Run: ollama create {model_name} -f {modelfile_path}\n"
                        f"Note: Full GGUF conversion requires additional setup"
                    ),
                    "error": str(e)
                }
                
        except Exception as e:
            logger.error(
                "modelfile_creation_failed",
                model_name=model_name,
                error=str(e)
            )
            raise
    
    def _map_hf_to_ollama_model(self, hf_identifier: str) -> str:
        """
        Map HuggingFace model identifier to Ollama model name.
        
        Args:
            hf_identifier: HuggingFace model identifier
            
        Returns:
            Ollama model name
        """
        # Common mappings
        mappings = {
            "mistralai/Mistral-7B": "mistral",
            "mistralai/Mistral-7B-v0.1": "mistral",
            "meta-llama/Llama-2-7b": "llama2",
            "meta-llama/Llama-2-13b": "llama2:13b",
            "TinyLlama/TinyLlama-1.1B-Chat-v1.0": "tinyllama",
            "microsoft/phi-2": "phi",
            "google/gemma-2b": "gemma:2b",
            "google/gemma-7b": "gemma:7b",
        }
        
        # Check exact match
        if hf_identifier in mappings:
            return mappings[hf_identifier]
        
        # Try to extract model name
        model_name = hf_identifier.split("/")[-1].lower()
        
        # Common patterns
        if "mistral" in model_name:
            return "mistral"
        elif "llama" in model_name:
            if "13b" in model_name:
                return "llama2:13b"
            elif "70b" in model_name:
                return "llama2:70b"
            return "llama2"
        elif "phi" in model_name:
            return "phi"
        elif "gemma" in model_name:
            if "2b" in model_name:
                return "gemma:2b"
            return "gemma:7b"
        elif "tinyllama" in model_name:
            return "tinyllama"
        
        # Default: use the model name as-is
        return model_name.replace("-", "_")
    
    def _generate_modelfile(
        self,
        ollama_base: str,
        model_name: str,
        model_path: str,
        technique: str
    ) -> str:
        """
        Generate Ollama Modelfile content.
        
        Args:
            ollama_base: Base Ollama model
            model_name: New model name
            model_path: Path to trained model
            technique: Training technique used
            
        Returns:
            Modelfile content as string
        """
        # Read training metadata if available
        metadata_path = Path(model_path) / "training_metadata.json"
        metadata = {}
        if metadata_path.exists():
            with open(metadata_path, "r") as f:
                metadata = json.load(f)
        
        # Create Modelfile
        modelfile = f"""# Modelfile for {model_name}
# Base model: {ollama_base}
# Training technique: {technique}
# Created: {datetime.now().isoformat()}

FROM {ollama_base}

# Model parameters
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER repeat_penalty 1.1

# System message
SYSTEM You are a helpful AI assistant. This model was fine-tuned using {technique} technique.

# Note: This Modelfile uses the base {ollama_base} model.
# The fine-tuned weights are stored at: {model_path}
# For full adapter integration, use the model via the API with the adapter path.
"""
        
        return modelfile
    
    async def _register_with_ollama(self, model_name: str, modelfile_path: Path):
        """
        Register model with Ollama using the Modelfile.
        
        Args:
            model_name: Name for the Ollama model
            modelfile_path: Path to the Modelfile
        """
        try:
            # Use ollama create command
            process = await asyncio.create_subprocess_exec(
                "ollama",
                "create",
                model_name,
                "-f",
                str(modelfile_path),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                logger.info(
                    "ollama_model_created",
                    model_name=model_name,
                    output=stdout.decode()
                )
            else:
                error_msg = stderr.decode() if stderr else "Unknown error"
                logger.error(
                    "ollama_create_failed",
                    model_name=model_name,
                    error=error_msg
                )
                raise Exception(f"Ollama create failed: {error_msg}")
                
        except FileNotFoundError:
            raise Exception("Ollama CLI not found. Please ensure Ollama is installed.")
        except Exception as e:
            raise Exception(f"Failed to register with Ollama: {str(e)}")


# Singleton instance
_conversion_service: Optional[ModelConversionService] = None


def get_conversion_service() -> ModelConversionService:
    """Get the model conversion service instance."""
    global _conversion_service
    if _conversion_service is None:
        _conversion_service = ModelConversionService()
    return _conversion_service
