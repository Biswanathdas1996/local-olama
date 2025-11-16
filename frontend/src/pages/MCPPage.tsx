import { useState, useEffect } from 'react';
import { 
  FiServer, 
  FiCopy, 
  FiCheck, 
  FiCode, 
  FiTerminal, 
  FiZap,
  FiDatabase,
  FiShield,
  FiActivity,
  FiDownload,
  FiMessageSquare
} from 'react-icons/fi';
import { apiService } from '../services/api';

interface HealthStatus {
  status: string;
  ollama_connected: boolean;
  version: string;
}

export function MCPPage() {
  const [serverUrl, setServerUrl] = useState<string>('http://192.168.1.7:8000');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchServerInfo();
    checkHealth();
  }, []);

  const fetchServerInfo = async () => {
    try {
      const response = await apiService.getServerInfo();
      // API returns port 5000, but we need port 8000 for the API
      const apiUrl = response.url.replace('5000', '8000');
      setServerUrl(apiUrl);
    } catch (err) {
      console.error('Failed to fetch server URL:', err);
    }
  };

  const checkHealth = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${serverUrl}/health`);
      const data = await response.json();
      setHealth(data);
    } catch (err) {
      console.error('Health check failed:', err);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates({ ...copiedStates, [id]: true });
      setTimeout(() => {
        setCopiedStates({ ...copiedStates, [id]: false });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const CopyButton = ({ text, id }: { text: string; id: string }) => (
    <button
      onClick={() => copyToClipboard(text, id)}
      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
      title="Copy to clipboard"
    >
      {copiedStates[id] ? (
        <FiCheck className="w-4 h-4 text-green-600" />
      ) : (
        <FiCopy className="w-4 h-4 text-gray-600" />
      )}
    </button>
  );

  const CodeBlock = ({ code, language, copyId }: { code: string; language: string; copyId: string }) => (
    <div className="relative bg-slate-900 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <span className="text-xs font-semibold text-blue-400 uppercase">{language}</span>
        <button
          onClick={() => copyToClipboard(code, copyId)}
          className="flex items-center gap-2 px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white transition-colors"
        >
          {copiedStates[copyId] ? (
            <>
              <FiCheck className="w-3 h-3" />
              Copied!
            </>
          ) : (
            <>
              <FiCopy className="w-3 h-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm">
        <code className="text-gray-100 font-mono">{code}</code>
      </pre>
    </div>
  );

  const claudeConfig = `{
  "mcpServers": {
    "llm365": {
      "command": "python",
      "args": ["-m", "mcp_server.server"],
      "env": {
        "LLM365_BASE_URL": "${serverUrl}"
      }
    }
  }
}`;

  const pythonClient = `import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

async def main():
    server_params = StdioServerParameters(
        command="python",
        args=["-m", "mcp_server.server"],
        env={"LLM365_BASE_URL": "${serverUrl}"}
    )
    
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            # Initialize
            await session.initialize()
            
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

asyncio.run(main())`;

  const curlExample = `curl -X POST "${serverUrl}/generate" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "llama3.1:8b",
    "prompt": "Explain quantum computing",
    "temperature": 0.7
  }'`;

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <FiZap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Model Context Protocol (MCP)
              </h1>
              <p className="text-gray-600 mt-1">
                Connect any MCP-compatible application to LLM-365's AI capabilities
              </p>
            </div>
          </div>

          {/* Info Banner */}
          <div className="glass-card rounded-xl p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-purple-200">
            <div className="flex items-start gap-3">
              <FiServer className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-700">
                  <strong className="text-purple-700">MCP</strong> provides a standardized way to integrate AI capabilities into your applications without building custom integrations.
                  Configure your MCP client and start leveraging local LLM infrastructure.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MCP Connection Details Card */}
        <div className="glass-card rounded-2xl p-6 mb-6 border-2 border-purple-200 bg-gradient-to-br from-white to-purple-50">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FiServer className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">MCP Connection Details</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Base URL */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Base URL
              </label>
              <div className="flex items-center gap-2 bg-white border-2 border-gray-200 rounded-lg px-4 py-3">
                <code className="flex-1 text-sm font-mono text-green-600 break-all">
                  {serverUrl}
                </code>
                <CopyButton text={serverUrl} id="base-url" />
              </div>
            </div>

            {/* Protocol */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Protocol
              </label>
              <div className="bg-white border-2 border-gray-200 rounded-lg px-4 py-3">
                <code className="text-sm font-mono text-blue-600">stdio</code>
              </div>
            </div>

            {/* Command */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Command
              </label>
              <div className="flex items-center gap-2 bg-white border-2 border-gray-200 rounded-lg px-4 py-3">
                <code className="flex-1 text-sm font-mono text-purple-600">
                  python -m mcp_server.server
                </code>
                <CopyButton text="python -m mcp_server.server" id="command" />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </label>
              <div className="bg-white border-2 border-gray-200 rounded-lg px-4 py-3">
                {loading ? (
                  <span className="text-sm text-gray-500">Checking...</span>
                ) : health ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-sm font-medium text-green-600">
                      {health.status === 'healthy' ? 'Online' : 'Degraded'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <span className="text-sm font-medium text-red-600">Offline</span>
                  </div>
                )}
              </div>
            </div>

            {/* Environment Variable */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Environment Variable
              </label>
              <div className="flex items-center gap-2 bg-white border-2 border-gray-200 rounded-lg px-4 py-3">
                <code className="flex-1 text-sm font-mono text-yellow-600">
                  LLM365_BASE_URL={serverUrl}
                </code>
                <CopyButton text={`LLM365_BASE_URL=${serverUrl}`} id="env-var" />
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>💡 Quick Tip:</strong> Use the configuration examples below to integrate with Claude Desktop, VS Code, or any MCP-compatible application.
            </p>
          </div>
        </div>

        {/* Available Tools */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <FiCode className="w-6 h-6 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Available MCP Tools</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <FiMessageSquare className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-900">generate_text</h3>
              </div>
              <p className="text-sm text-gray-600">
                Generate text with LLM models. Supports RAG, guardrails, and multiple output formats.
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <FiDatabase className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">list_models</h3>
              </div>
              <p className="text-sm text-gray-600">
                List all available LLM models with details about size, family, and parameters.
              </p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <FiActivity className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-gray-900">check_health</h3>
              </div>
              <p className="text-sm text-gray-600">
                Check service health, Ollama connection status, and API version.
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-violet-50 border-2 border-purple-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <FiDownload className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">download_model</h3>
              </div>
              <p className="text-sm text-gray-600">
                Download new LLM models from Ollama library (llama3.1:8b, mistral, etc.).
              </p>
            </div>
          </div>
        </div>

        {/* Configuration Examples */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FiTerminal className="w-6 h-6 text-purple-600" />
            </div>
            Configuration Examples
          </h2>

          {/* Claude Desktop */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-blue-600">🖥️</span>
              Claude Desktop - MCP Configuration
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Add this MCP server configuration to your Claude Desktop config file:
              <br />
              <code className="text-purple-600 bg-purple-50 px-2 py-1 rounded mt-1 inline-block">
                ~/Library/Application Support/Claude/claude_desktop_config.json
              </code> (macOS)
              <br />
              <code className="text-purple-600 bg-purple-50 px-2 py-1 rounded mt-1 inline-block">
                %APPDATA%\Claude\claude_desktop_config.json
              </code> (Windows)
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded mb-4">
              <p className="text-sm text-blue-800">
                ⭐ This enables Claude to use your local LLM-365 server as an MCP tool provider.
              </p>
            </div>
            <CodeBlock code={claudeConfig} language="JSON" copyId="claude-config" />
          </div>

          {/* Python Client */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-green-600">🐍</span>
              Generic MCP Client (Python)
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Use this Python code to connect to the LLM-365 MCP server and call its tools:
            </p>
            <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded mb-4">
              <p className="text-sm text-green-800">
                ℹ️ This example shows how to connect via MCP stdio protocol and use the generate_text tool.
              </p>
            </div>
            <CodeBlock code={pythonClient} language="Python" copyId="python-client" />
          </div>

          {/* Direct API */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-yellow-600">⚡</span>
              Direct REST API (Without MCP)
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              You can also bypass MCP and call the REST API directly using cURL or any HTTP client:
            </p>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded mb-4">
              <p className="text-sm text-yellow-800">
                ⚠️ This method doesn't use MCP but provides direct access to the same LLM capabilities.
              </p>
            </div>
            <CodeBlock code={curlExample} language="Bash" copyId="curl-example" />
          </div>
        </div>

        {/* Features */}
        <div className="glass-card rounded-2xl p-6 mt-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FiZap className="w-6 h-6 text-purple-600" />
            </div>
            Key Features
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
              <FiDatabase className="w-8 h-8 text-blue-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">RAG Support</h3>
              <p className="text-sm text-gray-600">
                Augment responses with document context using hybrid search across your indexed data.
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200">
              <FiCode className="w-8 h-8 text-green-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Customizable</h3>
              <p className="text-sm text-gray-600">
                Control temperature, top_p, max_tokens, and output formats (JSON, CSV, PDF, etc.).
              </p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-5 border border-red-200">
              <FiShield className="w-8 h-8 text-red-600 mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Guardrails</h3>
              <p className="text-sm text-gray-600">
                Optional content safety filters for input and output validation.
              </p>
            </div>
          </div>
        </div>

        {/* Getting Started */}
        <div className="glass-card rounded-2xl p-6 mt-6 bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <span className="text-2xl">🚀</span>
            Getting Started with MCP Connection
          </h2>

          <ol className="space-y-4">
            <li className="flex items-start gap-4">
              <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Install MCP Package</h3>
                <code className="text-sm bg-white px-3 py-1 rounded border border-gray-200">
                  pip install mcp
                </code>
              </div>
            </li>

            <li className="flex items-start gap-4">
              <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Start the LLM-365 Server</h3>
                <code className="text-sm bg-white px-3 py-1 rounded border border-gray-200">
                  python main.py
                </code>
                <p className="text-xs text-gray-500 mt-1">
                  Backend must be running on {serverUrl}
                </p>
              </div>
            </li>

            <li className="flex items-start gap-4">
              <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Configure Your MCP Client</h3>
                <p className="text-sm text-gray-600">
                  Use the configuration examples above (Claude Desktop, Python client, etc.)
                </p>
              </div>
            </li>

            <li className="flex items-start gap-4">
              <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                4
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Start Using LLM-365</h3>
                <p className="text-sm text-gray-600">
                  Your MCP-compatible application can now access all LLM-365 tools and capabilities!
                </p>
              </div>
            </li>
          </ol>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <span>📚</span>
              Need Help?
            </h4>
            <div className="space-y-1 text-sm text-blue-800">
              <p>• Read the full <a href="/MCP_README.md" className="underline hover:text-blue-600">MCP Documentation</a></p>
              <p>• Check the <a href={`${serverUrl}/docs`} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">API Documentation</a></p>
              <p>• View <a href="/analytics" className="underline hover:text-blue-600">Usage Analytics</a></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
