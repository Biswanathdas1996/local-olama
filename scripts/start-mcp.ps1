# Start the MCP Server for LLM-365

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "LLM-365 MCP Server Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Set the base URL (change this to your server's IP)
$env:LLM365_BASE_URL = "http://192.168.1.7:8000"

Write-Host "Base URL: $env:LLM365_BASE_URL" -ForegroundColor Yellow
Write-Host "Starting MCP server..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

# Start the MCP server
python mcp_server\start_mcp.py
