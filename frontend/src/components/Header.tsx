import { FiCpu, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { useHealth } from '../hooks/useHealth';

export function Header() {
  const { health } = useHealth();

  return (
    <header className="bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FiCpu className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Local LLM Platform</h1>
              <p className="text-sm text-primary-100">
                Powered by Ollama - Fully Offline
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {health && (
              <div className="flex items-center space-x-2">
                {health.ollama_connected ? (
                  <>
                    <FiCheckCircle className="w-5 h-5 text-green-300" />
                    <span className="text-sm">Ollama Connected</span>
                  </>
                ) : (
                  <>
                    <FiAlertCircle className="w-5 h-5 text-red-300" />
                    <span className="text-sm">Ollama Disconnected</span>
                  </>
                )}
              </div>
            )}
            <div className="text-sm text-primary-100">
              v{health?.version || '1.0.0'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
