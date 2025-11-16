# MCP Server for LLM-365

![MCP](https://img.shields.io/badge/MCP-Model%20Context%20Protocol-blue)
![Python](https://img.shields.io/badge/Python-3.11+-green)
![Status](https://img.shields.io/badge/Status-Production-success)

## Overview

The **Model Context Protocol (MCP) Server** for LLM-365 exposes enterprise-grade LLM capabilities through a standardized protocol, enabling any MCP-compatible application to consume AI services without custom integrations.

## 🚀 Features

- **Text Generation**: Generate text using multiple local LLM models
- **RAG Support**: Augment responses with document context via hybrid search
- **Model Management**: List, download, and manage LLM models
- **Health Monitoring**: Check service and Ollama connection status
- **Customizable Parameters**: Control temperature, top_p, max_tokens, and more
- **Output Formatting**: Support for TEXT, JSON, CSV, PDF, DOCX, PPT formats
- **Content Safety**: Optional guardrails for input/output filtering
- **Async Architecture**: Handle concurrent requests efficiently

## 📋 Prerequisites

- Python 3.11+
- LLM-365 server running (default: http://192.168.1.7:8000)
- Ollama installed and running locally
- MCP package installed

## 🔧 Installation

### 1. Install Dependencies

```bash
pip install mcp
```

Or install all requirements:

```bash
pip install -r requirements.txt
```

### 2. Configure the Server

Update the base URL in the configuration files if needed:

**mcp_server/mcp-config.json**:
```json
{
  "mcpServers": {
    "llm365": {
      "command": "python",
      "args": ["-m", "mcp_server.server"],
      "env": {
        "LLM365_BASE_URL": "http://192.168.1.7:8000"
      }
    }
  }
}
```

You can also set the base URL via environment variable:
```bash
export LLM365_BASE_URL=http://your-server-ip:8000
```

## 🎯 Quick Start

### Option 1: Using Startup Scripts

**Windows (PowerShell)**:
```powershell
.\scripts\start-mcp.ps1
```

**Windows (Batch)**:
```bash
.\scripts\start-mcp.bat
```

### Option 2: Direct Python Execution

```bash
python mcp_server/start_mcp.py
```

Or using module syntax:
```bash
python -m mcp_server.server
```

## 🔌 Client Integration

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "llm365": {
      "command": "python",
      "args": ["-m", "mcp_server.server"],
      "env": {
        "LLM365_BASE_URL": "http://192.168.1.7:8000"
      }
    }
  }
}
```

### Python MCP Client

```python
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def main():
    server_params = StdioServerParameters(
        command="python",
        args=["-m", "mcp_server.server"],
        env={"LLM365_BASE_URL": "http://192.168.1.7:8000"}
    )
    
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            # Initialize
            await session.initialize()
            
            # List available tools
            tools = await session.list_tools()
            print(f"Available tools: {tools}")
            
            # Generate text
            result = await session.call_tool(
                "generate_text",
                arguments={
                    "model": "llama3.1:8b",
                    "prompt": "Explain quantum computing",
                    "temperature": 0.7
                }
            )
            
            print(f"Response: {result}")

asyncio.run(main())
```

### Direct API Call (Alternative)

You can also bypass MCP and call the REST API directly:

```bash
curl -X POST "http://192.168.1.7:8000/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.1:8b",
    "prompt": "Explain quantum computing",
    "temperature": 0.7
  }'
```

## 🛠️ Available Tools

### 1. generate_text

Generate text using a local LLM model.

**Parameters**:
- `model` (required): Model name (e.g., "llama3.1:8b", "mistral")
- `prompt` (required): Text prompt for generation
- `temperature` (optional): Randomness control (0.0-2.0, default: 0.7)
- `top_p` (optional): Nucleus sampling (0.0-1.0, default: 0.9)
- `max_tokens` (optional): Maximum tokens to generate (default: 2048)
- `indices` (optional): Document indices for RAG
- `search_type` (optional): "hybrid", "semantic", or "lexical" (default: "hybrid")
- `search_top_k` (optional): Top K results per index (default: 5)
- `search_min_score` (optional): Minimum relevance score (default: 0.0)
- `output_format` (optional): "TEXT", "JSON", "CSV", "PDF", "DOCX", "PPT"
- `enable_guardrails` (optional): Enable content safety (default: false)

**Example**:
```json
{
  "model": "llama3.1:8b",
  "prompt": "Explain quantum computing in simple terms",
  "temperature": 0.7,
  "max_tokens": 500
}
```

### 2. list_models

List all available LLM models.

**Parameters**: None

**Returns**: Information about installed models including name, size, family, parameters, and quantization.

### 3. check_health

Check the health status of LLM-365 service.

**Parameters**: None

**Returns**: Service status, Ollama connection status, version, and timestamp.

### 4. download_model

Download a new LLM model from Ollama library.

**Parameters**:
- `model_name` (required): Name of model to download (e.g., "llama3.1:8b", "mistral:7b")

**Note**: Downloads may take several minutes depending on model size.

## 📖 Usage Examples

### Basic Text Generation

```json
{
  "model": "llama3.1:8b",
  "prompt": "Write a Python function to calculate fibonacci numbers",
  "temperature": 0.3,
  "max_tokens": 1000
}
```

### RAG-Enhanced Generation

```json
{
  "model": "llama3.1:8b",
  "prompt": "What are the key findings in the research?",
  "indices": ["research_docs", "technical_papers"],
  "search_type": "hybrid",
  "search_top_k": 5,
  "temperature": 0.5
}
```

### JSON Output Generation

```json
{
  "model": "llama3.1:8b",
  "prompt": "List 5 programming languages with their use cases",
  "output_format": "JSON",
  "temperature": 0.3
}
```

### With Content Safety

```json
{
  "model": "llama3.1:8b",
  "prompt": "Explain machine learning",
  "enable_guardrails": true,
  "temperature": 0.7
}
```

## 🌐 Web Interface

Access the MCP connection guide at:
```
http://192.168.1.7:8000/connect
```

This page provides:
- Server status and information
- Available tools documentation
- Configuration examples
- Integration guides
- Live API examples

## 🔍 Monitoring & Analytics

- **Health Check**: `http://192.168.1.7:8000/health`
- **API Documentation**: `http://192.168.1.7:8000/docs`
- **Analytics Dashboard**: `http://192.168.1.7:8000/analytics.html`

## 🐛 Troubleshooting

### MCP Server Won't Start

1. Ensure LLM-365 main server is running:
   ```bash
   python main.py
   ```

2. Check if Ollama is running:
   ```bash
   curl http://localhost:11434/api/tags
   ```

3. Verify the base URL is correct:
   ```bash
   curl http://192.168.1.7:8000/health
   ```

### Connection Errors

- Ensure firewall allows connections on port 8000
- Verify the IP address matches your server's IP
- Check network connectivity between client and server

### Model Not Found

List available models:
```bash
curl http://192.168.1.7:8000/models
```

Download a model:
```bash
curl -X POST "http://192.168.1.7:8000/models/download" \
  -H "Content-Type: application/json" \
  -d '{"model_name": "llama3.1:8b"}'
```

## 📚 Architecture

```
┌─────────────────────┐
│  MCP Client Apps    │
│  (Claude, Custom)   │
└──────────┬──────────┘
           │ MCP Protocol (stdio)
           ▼
┌─────────────────────┐
│   MCP Server        │
│   (mcp_server/)     │
└──────────┬──────────┘
           │ HTTP/REST
           ▼
┌─────────────────────┐
│   LLM-365 API       │
│   (FastAPI)         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Ollama Service    │
│   (Local LLMs)      │
└─────────────────────┘
```

## 🔐 Security Considerations

- MCP server runs on stdio (no network exposure)
- API server can be restricted via firewall rules
- Optional content safety guardrails available
- No data leaves your infrastructure
- All processing happens locally

## 🚀 Advanced Configuration

### Custom Port

Update `utils/config.py` to change the API port:
```python
port: int = 8000  # Change this
```

### Multiple Instances

Run multiple MCP servers with different base URLs:
```bash
LLM365_BASE_URL=http://server1:8000 python -m mcp_server.server
LLM365_BASE_URL=http://server2:8000 python -m mcp_server.server
```

### Load Balancing

Configure your MCP client to use multiple servers for redundancy.

## 📄 License

Part of the LLM-365 project. See main repository for license information.

## 🤝 Support

- Documentation: `/docs` endpoint
- Connection Guide: `/connect` page
- Analytics: `/analytics.html`
- Issues: Contact your system administrator

## 🎓 Learn More

- [Model Context Protocol Specification](https://spec.modelcontextprotocol.io/)
- [Ollama Documentation](https://ollama.ai/docs)
- [LLM-365 Main README](../README.md)

---

**Made with ❤️ for seamless AI integration**
