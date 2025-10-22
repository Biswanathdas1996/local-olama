import { FiCpu, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { useHealth } from '../hooks/useHealth';

export function Header() {
  const { health } = useHealth();

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
      <div className="mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-3.5 md:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-3 md:gap-4">
          {/* Logo and Title Section */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-1.5 sm:p-2 rounded-lg sm:rounded-xl shadow-lg shadow-blue-500/30 flex-shrink-0">
              <FiCpu className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="min-w-0 flex-shrink">
              <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent truncate leading-tight">
                Local LLM Platform
              </h1>
              <p className="text-[10px] sm:text-xs text-gray-500 truncate hidden xs:block leading-tight mt-0.5">
                Powered by Ollama
              </p>
            </div>
          </div>

          {/* Status and Version Section */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {health && (
              <div className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full transition-colors ${
                health.ollama_connected 
                  ? 'bg-green-50 text-green-700' 
                  : 'bg-red-50 text-red-700'
              }`}>
                {health.ollama_connected ? (
                  <>
                    <FiCheckCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs font-medium whitespace-nowrap">
                      <span className="hidden sm:inline">Connected</span>
                      <span className="sm:hidden">OK</span>
                    </span>
                  </>
                ) : (
                  <>
                    <FiAlertCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs font-medium whitespace-nowrap">
                      <span className="hidden sm:inline">Disconnected</span>
                      <span className="sm:hidden">Error</span>
                    </span>
                  </>
                )}
              </div>
            )}
            <div className="text-[10px] sm:text-xs text-gray-400 font-mono hidden lg:block whitespace-nowrap">
              v{health?.version || '1.0.0'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
