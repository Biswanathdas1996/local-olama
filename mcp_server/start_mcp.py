#!/usr/bin/env python
"""
Start the MCP Server for LLM-365
"""

import os
import sys
import asyncio
import logging

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mcp_server.server import main

if __name__ == "__main__":
    # Configure logging to stderr only (stdout is reserved for JSON-RPC)
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        stream=sys.stderr
    )
    
    # Log to stderr (not stdout)
    logger = logging.getLogger(__name__)
    logger.info("=" * 60)
    logger.info("LLM-365 MCP Server")
    logger.info("=" * 60)
    logger.info(f"Base URL: {os.getenv('LLM365_BASE_URL', 'http://192.168.1.7:8000')}")
    logger.info("Starting MCP server on stdio...")
    logger.info("=" * 60)
    
    asyncio.run(main())
