import { FiCpu, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { useHealth } from '../hooks/useHealth';

export function Header() {
  const { health } = useHealth();

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg shadow-blue-500/30">
              <FiCpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Local LLM Platform
              </h1>
              <p className="text-xs text-gray-500">
                Powered by Ollama - Fully Offline
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {health && (
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${
                health.ollama_connected 
                  ? 'bg-green-50 text-green-700' 
                  : 'bg-red-50 text-red-700'
              }`}>
                {health.ollama_connected ? (
                  <>
                    <FiCheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Connected</span>
                  </>
                ) : (
                  <>
                    <FiAlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Disconnected</span>
                  </>
                )}
              </div>
            )}
            <div className="text-xs text-gray-400 font-mono">
              v{health?.version || '1.0.0'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
