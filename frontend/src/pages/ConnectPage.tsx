import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FiWifi, FiSmartphone, FiCopy, FiCheck } from 'react-icons/fi';
import { apiService } from '../services/api';

export function ConnectPage() {
  const [serverUrl, setServerUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchServerUrl();
  }, []);

  const fetchServerUrl = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.getServerInfo();
      setServerUrl(response.url);
    } catch (err) {
      console.error('Failed to fetch server URL:', err);
      setError('Failed to load server URL. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(serverUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <FiWifi className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Connect to Server
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-0.5">
                Scan QR code to access from your mobile device
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="glass-card rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
            <p className="text-gray-600 font-medium">Loading server information...</p>
          </div>
        ) : error ? (
          <div className="glass-card rounded-2xl p-8 sm:p-12">
            <div className="text-center">
              <div className="inline-block p-4 bg-red-100 rounded-full mb-4">
                <FiWifi className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Connection Error</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchServerUrl}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* QR Code Card */}
            <div className="glass-card rounded-2xl p-6 sm:p-8 lg:p-10">
              <div className="flex flex-col lg:flex-row items-center gap-8">
                {/* QR Code */}
                <div className="flex-shrink-0">
                  <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xl border-2 border-blue-100">
                    <QRCodeSVG
                      value={serverUrl}
                      size={window.innerWidth < 640 ? 200 : 256}
                      level="H"
                      includeMargin={true}
                      bgColor="#ffffff"
                      fgColor="#1e40af"
                    />
                  </div>
                </div>

                {/* Instructions */}
                <div className="flex-1 text-center lg:text-left">
                  <div className="inline-block p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full mb-4">
                    <FiSmartphone className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
                    Scan with Your Phone
                  </h2>
                  <ul className="space-y-2 text-sm sm:text-base text-gray-700">
                    <li className="flex items-start">
                      <span className="inline-block w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0 font-semibold text-xs">
                        1
                      </span>
                      <span>Open your phone's camera app</span>
                    </li>
                    <li className="flex items-start">
                      <span className="inline-block w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0 font-semibold text-xs">
                        2
                      </span>
                      <span>Point it at the QR code</span>
                    </li>
                    <li className="flex items-start">
                      <span className="inline-block w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0 font-semibold text-xs">
                        3
                      </span>
                      <span>Tap the notification to open</span>
                    </li>
                  </ul>
                  <div className="mt-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs sm:text-sm text-blue-800 font-medium">
                      💡 Make sure your phone is connected to the same network
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* URL Card */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <span className="mr-2">🔗</span>
                Server Address
              </h3>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 font-mono text-sm sm:text-base text-gray-800 break-all">
                  {serverUrl}
                </div>
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md flex items-center gap-2 font-medium flex-shrink-0"
                  title="Copy URL"
                >
                  {copied ? (
                    <>
                      <FiCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden sm:inline">Copied!</span>
                    </>
                  ) : (
                    <>
                      <FiCopy className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden sm:inline">Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-3">
                You can also manually enter this URL in your browser
              </p>
            </div>

            {/* Tips Card */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">💡</span>
                Connection Tips
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm">Same Network</h4>
                  <p className="text-xs text-gray-700">
                    Ensure both devices are on the same network for the connection to work
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm">Firewall</h4>
                  <p className="text-xs text-gray-700">
                    If the connection fails, check if your firewall is blocking port 5000
                  </p>
                </div>
                <div className="bg-gradient-to-br from-cyan-50 to-teal-50 rounded-lg p-4 border border-cyan-100">
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm">Camera Permission</h4>
                  <p className="text-xs text-gray-700">
                    Allow camera access when prompted by your browser or QR scanner app
                  </p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-100">
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm">Bookmark It</h4>
                  <p className="text-xs text-gray-700">
                    Add the page to your home screen for quick access in the future
                  </p>
                </div>
              </div>
            </div>

            {/* API Documentation Card */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">📚</span>
                API Documentation
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Use the Ollama server as an API to integrate with your applications
              </p>

              {/* API Endpoints */}
              <div className="space-y-4">
                {/* Text Generation */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm flex items-center">
                    <span className="px-2 py-0.5 bg-green-600 text-white rounded text-xs mr-2">POST</span>
                    Generate Text
                  </h4>
                  <p className="text-xs text-gray-600 mb-2">
                    Endpoint: <code className="bg-white px-2 py-0.5 rounded text-green-700 font-mono">/generate</code>
                  </p>
                  <div className="bg-white rounded p-3 font-mono text-xs overflow-x-auto">
                    <pre className="text-gray-800">
{`curl -X POST "${serverUrl.replace('5000', '8000')}/generate" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "llama3.2:1b",
    "prompt": "Explain quantum computing",
    "temperature": 0.7
  }'`}
                    </pre>
                  </div>
                </div>

                {/* List Models */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm flex items-center">
                    <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-xs mr-2">GET</span>
                    List Models
                  </h4>
                  <p className="text-xs text-gray-600 mb-2">
                    Endpoint: <code className="bg-white px-2 py-0.5 rounded text-blue-700 font-mono">/models</code>
                  </p>
                  <div className="bg-white rounded p-3 font-mono text-xs overflow-x-auto">
                    <pre className="text-gray-800">
{`curl -X GET "${serverUrl.replace('5000', '8000')}/models"`}
                    </pre>
                  </div>
                </div>

                {/* RAG Search */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm flex items-center">
                    <span className="px-2 py-0.5 bg-purple-600 text-white rounded text-xs mr-2">GET</span>
                    RAG Search
                  </h4>
                  <p className="text-xs text-gray-600 mb-2">
                    Endpoint: <code className="bg-white px-2 py-0.5 rounded text-purple-700 font-mono">/rag/search</code>
                  </p>
                  <div className="bg-white rounded p-3 font-mono text-xs overflow-x-auto">
                    <pre className="text-gray-800">
{`curl -X GET "${serverUrl.replace('5000', '8000')}/rag/search?query=your+search&index_name=your_index&top_k=5"`}
                    </pre>
                  </div>
                </div>

                {/* Document Ingestion */}
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-200">
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm flex items-center">
                    <span className="px-2 py-0.5 bg-orange-600 text-white rounded text-xs mr-2">POST</span>
                    Ingest Document
                  </h4>
                  <p className="text-xs text-gray-600 mb-2">
                    Endpoint: <code className="bg-white px-2 py-0.5 rounded text-orange-700 font-mono">/rag/ingest-doc</code>
                  </p>
                  <div className="bg-white rounded p-3 font-mono text-xs overflow-x-auto">
                    <pre className="text-gray-800">
{`curl -X POST "${serverUrl.replace('5000', '8000')}/rag/ingest-doc" \\
  -F "file=@document.pdf" \\
  -F "index_name=my_index"`}
                    </pre>
                  </div>
                </div>

                {/* Health Check */}
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg p-4 border border-teal-200">
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm flex items-center">
                    <span className="px-2 py-0.5 bg-teal-600 text-white rounded text-xs mr-2">GET</span>
                    Health Check
                  </h4>
                  <p className="text-xs text-gray-600 mb-2">
                    Endpoint: <code className="bg-white px-2 py-0.5 rounded text-teal-700 font-mono">/health</code>
                  </p>
                  <div className="bg-white rounded p-3 font-mono text-xs overflow-x-auto">
                    <pre className="text-gray-800">
{`curl -X GET "${serverUrl.replace('5000', '8000')}/health"`}
                    </pre>
                  </div>
                </div>
              </div>

              {/* API Documentation Links */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-700 mb-2 font-medium">📖 Full API Documentation:</p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`${serverUrl.replace('5000', '8000')}/docs`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm text-xs font-medium"
                  >
                    Swagger UI
                  </a>
                  <a
                    href={`${serverUrl.replace('5000', '8000')}/redoc`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-sm text-xs font-medium"
                  >
                    ReDoc
                  </a>
                  <a
                    href={`${serverUrl.replace('5000', '8000')}/openapi.json`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-gradient-to-r from-gray-600 to-slate-600 text-white rounded-lg hover:from-gray-700 hover:to-slate-700 transition-all shadow-sm text-xs font-medium"
                  >
                    OpenAPI JSON
                  </a>
                </div>
              </div>

              {/* Base URL Note */}
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800 font-medium">
                  ⚠️ Note: API server runs on port <strong>8000</strong>, while the UI runs on port <strong>5000</strong>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
