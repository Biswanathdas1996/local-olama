@echo off
REM Start the MCP Server for LLM-365

echo ========================================
echo LLM-365 MCP Server Startup
echo ========================================

REM Set the base URL (change this to your server's IP)
set LLM365_BASE_URL=http://192.168.1.7:8000

echo Base URL: %LLM365_BASE_URL%
echo Starting MCP server...
echo ========================================

REM Start the MCP server
python mcp_server\start_mcp.py

pause
