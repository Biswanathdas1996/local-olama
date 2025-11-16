"""
MCP Server Implementation for LLM-365

This server exposes LLM capabilities through the Model Context Protocol (MCP),
allowing any MCP-compatible application to consume these LLM services.

Features:
- Text generation with multiple models
- RAG-enhanced responses
- Customizable generation parameters
- Model management
- Health checks
"""

import asyncio
import json
import logging
from typing import Any, Optional, Sequence
from datetime import datetime

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import (
    Tool,
    TextContent,
    ImageContent,
    EmbeddedResource,
    LoggingLevel
)
import httpx

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("mcp-llm365")


class LLM365MCPServer:
    """MCP Server for LLM-365 integration"""
    
    def __init__(self, base_url: str = "http://192.168.1.7:8000"):
        self.base_url = base_url.rstrip('/')
        self.server = Server("llm365-mcp-server")
        self.client = httpx.AsyncClient(timeout=300.0)  # 5 minute timeout for long generations
        
        # Register handlers
        self._register_handlers()
        
        logger.info(f"MCP Server initialized with base URL: {self.base_url}")
    
    def _register_handlers(self):
        """Register all MCP protocol handlers"""
        
        @self.server.list_tools()
        async def list_tools() -> list[Tool]:
            """List available LLM tools"""
            return [
                Tool(
                    name="generate_text",
                    description="""Generate text using a local LLM model.
                    
Supports:
- Multiple models (llama3.1:8b, mistral, etc.)
- Customizable temperature, top_p, and other parameters
- Large context windows
- RAG-enhanced generation with document indices
- Output formatting (TEXT, JSON, CSV, PDF, DOCX, PPT)
- Guardrails for content safety

Parameters:
- model: Name of the LLM model to use (required)
- prompt: The text prompt for generation (required)
- temperature: Controls randomness (0.0-2.0, default 0.7)
- top_p: Nucleus sampling parameter (0.0-1.0, default 0.9)
- max_tokens: Maximum tokens to generate (default 2048)
- indices: List of document indices for RAG (optional)
- search_type: Type of search - 'hybrid', 'semantic', or 'lexical' (default 'hybrid')
- search_top_k: Number of top results per index (default 5)
- search_min_score: Minimum relevance score 0.0-1.0 (default 0.0)
- output_format: TEXT, JSON, CSV, PDF, DOCX, or PPT (default TEXT)
- enable_guardrails: Enable content safety filtering (default false)""",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "model": {
                                "type": "string",
                                "description": "Model name (e.g., llama3.1:8b, mistral)"
                            },
                            "prompt": {
                                "type": "string",
                                "description": "The prompt text for generation"
                            },
                            "temperature": {
                                "type": "number",
                                "description": "Temperature for generation (0.0-2.0)",
                                "default": 0.7
                            },
                            "top_p": {
                                "type": "number",
                                "description": "Top-p sampling parameter (0.0-1.0)",
                                "default": 0.9
                            },
                            "max_tokens": {
                                "type": "integer",
                                "description": "Maximum tokens to generate",
                                "default": 2048
                            },
                            "indices": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Document indices for RAG",
                                "default": []
                            },
                            "search_type": {
                                "type": "string",
                                "enum": ["hybrid", "semantic", "lexical"],
                                "description": "Search type for RAG",
                                "default": "hybrid"
                            },
                            "search_top_k": {
                                "type": "integer",
                                "description": "Top K results per index",
                                "default": 5
                            },
                            "search_min_score": {
                                "type": "number",
                                "description": "Minimum relevance score",
                                "default": 0.0
                            },
                            "output_format": {
                                "type": "string",
                                "enum": ["TEXT", "JSON", "CSV", "PDF", "DOCX", "PPT"],
                                "description": "Output format",
                                "default": "TEXT"
                            },
                            "enable_guardrails": {
                                "type": "boolean",
                                "description": "Enable content safety",
                                "default": False
                            }
                        },
                        "required": ["model", "prompt"]
                    }
                ),
                Tool(
                    name="list_models",
                    description="""List all available LLM models.
                    
Returns information about installed models including:
- Model name
- Size
- Family
- Parameter count
- Quantization level

No parameters required.""",
                    inputSchema={
                        "type": "object",
                        "properties": {}
                    }
                ),
                Tool(
                    name="check_health",
                    description="""Check the health status of the LLM-365 service.
                    
Returns:
- Service status
- Ollama connection status
- API version
- Timestamp

No parameters required.""",
                    inputSchema={
                        "type": "object",
                        "properties": {}
                    }
                ),
                Tool(
                    name="download_model",
                    description="""Download a new LLM model from Ollama library.
                    
Parameters:
- model_name: Name of the model to download (required)
  Examples: llama3.1:8b, mistral:7b, codellama:13b
  
Note: This operation may take several minutes depending on model size.""",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "model_name": {
                                "type": "string",
                                "description": "Model name to download"
                            }
                        },
                        "required": ["model_name"]
                    }
                )
            ]
        
        @self.server.call_tool()
        async def call_tool(name: str, arguments: Any) -> Sequence[TextContent | ImageContent | EmbeddedResource]:
            """Handle tool execution"""
            
            try:
                if name == "generate_text":
                    return await self._generate_text(arguments)
                elif name == "list_models":
                    return await self._list_models()
                elif name == "check_health":
                    return await self._check_health()
                elif name == "download_model":
                    return await self._download_model(arguments)
                else:
                    raise ValueError(f"Unknown tool: {name}")
                    
            except Exception as e:
                logger.error(f"Error executing tool {name}: {e}", exc_info=True)
                return [TextContent(
                    type="text",
                    text=f"Error executing {name}: {str(e)}"
                )]
    
    async def _generate_text(self, args: dict) -> Sequence[TextContent]:
        """Generate text using the LLM"""
        try:
            # Build request payload
            payload = {
                "model": args["model"],
                "prompt": args["prompt"],
                "temperature": args.get("temperature", 0.7),
                "top_p": args.get("top_p", 0.9),
                "max_tokens": args.get("max_tokens", 2048),
                "stream": False
            }
            
            # Add optional RAG parameters
            if args.get("indices"):
                payload["indices"] = args["indices"]
                payload["search_type"] = args.get("search_type", "hybrid")
                payload["search_top_k"] = args.get("search_top_k", 5)
                payload["search_min_score"] = args.get("search_min_score", 0.0)
            
            # Add output format
            if args.get("output_format"):
                payload["output_format"] = args["output_format"]
            
            # Add guardrails
            if args.get("enable_guardrails"):
                payload["enable_guardrails"] = True
            
            logger.info(f"Generating text with model: {args['model']}")
            
            # Make request
            response = await self.client.post(
                f"{self.base_url}/generate",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            response.raise_for_status()
            result = response.json()
            
            # Format response
            response_text = result.get("response", "")
            model = result.get("model", args["model"])
            
            # Add metadata
            metadata = {
                "model": model,
                "eval_count": result.get("eval_count", 0),
                "total_duration_ms": result.get("total_duration", 0) // 1000000,
            }
            
            # Add RAG sources if available
            if result.get("sources"):
                sources = result["sources"]
                sources_text = "\n\n--- Sources ---\n"
                for i, source in enumerate(sources, 1):
                    if source.get("source_type") == "document":
                        sources_text += f"{i}. {source['source_name']}"
                        if source.get("page_number"):
                            sources_text += f" (Page {source['page_number']})"
                        sources_text += f" - Score: {source.get('relevance_score', 0):.3f}\n"
                        if source.get("excerpt"):
                            sources_text += f"   Excerpt: {source['excerpt'][:100]}...\n"
                
                metadata["sources_count"] = len([s for s in sources if s.get("source_type") == "document"])
                response_text += sources_text
            
            # Add guardrails info
            if result.get("guardrails_applied"):
                metadata["guardrails_applied"] = True
                if result.get("input_filtered") or result.get("output_filtered"):
                    metadata["content_filtered"] = True
            
            metadata_text = f"\n\n--- Metadata ---\n{json.dumps(metadata, indent=2)}"
            
            return [TextContent(
                type="text",
                text=response_text + metadata_text
            )]
            
        except httpx.HTTPStatusError as e:
            error_detail = e.response.json().get("detail", str(e))
            logger.error(f"HTTP error in generate_text: {error_detail}")
            return [TextContent(
                type="text",
                text=f"Error generating text: {error_detail}"
            )]
        except Exception as e:
            logger.error(f"Unexpected error in generate_text: {e}", exc_info=True)
            return [TextContent(
                type="text",
                text=f"Error generating text: {str(e)}"
            )]
    
    async def _list_models(self) -> Sequence[TextContent]:
        """List available models"""
        try:
            response = await self.client.get(f"{self.base_url}/models")
            response.raise_for_status()
            
            result = response.json()
            models = result.get("models", [])
            
            if not models:
                return [TextContent(
                    type="text",
                    text="No models available. Download models using download_model tool."
                )]
            
            # Format models list
            models_text = f"Available Models ({len(models)}):\n\n"
            for i, model in enumerate(models, 1):
                models_text += f"{i}. {model['name']}\n"
                models_text += f"   Size: {model.get('size', 0) / (1024**3):.2f} GB\n"
                models_text += f"   Family: {model.get('details', {}).get('family', 'Unknown')}\n"
                models_text += f"   Format: {model.get('details', {}).get('format', 'Unknown')}\n"
                if model.get('details', {}).get('parameter_size'):
                    models_text += f"   Parameters: {model['details']['parameter_size']}\n"
                models_text += "\n"
            
            return [TextContent(
                type="text",
                text=models_text
            )]
            
        except Exception as e:
            logger.error(f"Error listing models: {e}")
            return [TextContent(
                type="text",
                text=f"Error listing models: {str(e)}"
            )]
    
    async def _check_health(self) -> Sequence[TextContent]:
        """Check service health"""
        try:
            response = await self.client.get(f"{self.base_url}/health")
            response.raise_for_status()
            
            result = response.json()
            
            health_text = "LLM-365 Service Health:\n\n"
            health_text += f"Status: {result.get('status', 'unknown').upper()}\n"
            health_text += f"Ollama Connected: {result.get('ollama_connected', False)}\n"
            health_text += f"Version: {result.get('version', 'unknown')}\n"
            health_text += f"Timestamp: {result.get('timestamp', datetime.utcnow().isoformat())}\n"
            
            return [TextContent(
                type="text",
                text=health_text
            )]
            
        except Exception as e:
            logger.error(f"Error checking health: {e}")
            return [TextContent(
                type="text",
                text=f"Service appears to be down: {str(e)}"
            )]
    
    async def _download_model(self, args: dict) -> Sequence[TextContent]:
        """Download a model"""
        try:
            model_name = args["model_name"]
            
            logger.info(f"Starting download for model: {model_name}")
            
            response = await self.client.post(
                f"{self.base_url}/models/download",
                json={"model_name": model_name},
                timeout=1800.0  # 30 minute timeout for downloads
            )
            
            response.raise_for_status()
            result = response.json()
            
            download_text = f"Model Download: {model_name}\n\n"
            download_text += f"Status: {result.get('status', 'unknown')}\n"
            download_text += f"Message: {result.get('message', 'Download initiated')}\n"
            
            return [TextContent(
                type="text",
                text=download_text
            )]
            
        except Exception as e:
            logger.error(f"Error downloading model: {e}")
            return [TextContent(
                type="text",
                text=f"Error downloading model: {str(e)}"
            )]
    
    async def run(self):
        """Run the MCP server"""
        async with stdio_server() as (read_stream, write_stream):
            logger.info("MCP Server started on stdio")
            await self.server.run(
                read_stream,
                write_stream,
                self.server.create_initialization_options()
            )
    
    async def cleanup(self):
        """Cleanup resources"""
        await self.client.aclose()
        logger.info("MCP Server cleaned up")


async def main():
    """Main entry point"""
    import sys
    
    # Get base URL from environment or command line
    import os
    base_url = os.getenv("LLM365_BASE_URL", "http://192.168.1.7:8000")
    
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    
    server = LLM365MCPServer(base_url=base_url)
    
    try:
        await server.run()
    except KeyboardInterrupt:
        logger.info("Shutting down MCP server...")
    finally:
        await server.cleanup()


if __name__ == "__main__":
    asyncio.run(main())
