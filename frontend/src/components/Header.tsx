import { FiCpu, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { useHealth } from '../hooks/useHealth';

export function Header() {
  const { health } = useHealth();

  return (
    <header className="hidden lg:block bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
      <div className="mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-2.5 md:py-3">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 md:gap-3">
          {/* Logo and Title Section */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0 flex-1">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-1.5 sm:p-2 rounded-lg shadow-md shadow-blue-500/30 flex-shrink-0">
              <FiCpu className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xs sm:text-sm md:text-base lg:text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent truncate leading-tight">
                Local LLM Platform
              </h1>
              <p className="text-[9px] sm:text-[10px] md:text-xs text-gray-500 truncate hidden sm:block leading-tight mt-0.5">
                Fully Offline and most secure LLM Hosting and Management
              </p>
            </div>
          </div>

          {/* Status and Version Section */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
            {health && (
              <div className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 md:py-1.5 rounded-full transition-colors ${
                health.ollama_connected 
                  ? 'bg-green-50 text-green-700' 
                  : 'bg-red-50 text-red-700'
              }`}>
                {health.ollama_connected ? (
                  <>
                    <FiCheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 flex-shrink-0" />
                    <span className="text-[9px] sm:text-[10px] md:text-xs font-medium whitespace-nowrap">
                      <span className="hidden md:inline">Connected</span>
                      <span className="md:hidden">OK</span>
                    </span>
                  </>
                ) : (
                  <>
                    <FiAlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 flex-shrink-0" />
                    <span className="text-[9px] sm:text-[10px] md:text-xs font-medium whitespace-nowrap">
                      <span className="hidden md:inline">Disconnected</span>
                      <span className="md:hidden hidden xs:inline">Error</span>
                      <span className="xs:hidden">!</span>
                    </span>
                  </>
                )}
              </div>
            )}
            <div className="text-[9px] sm:text-[10px] md:text-xs text-gray-400 font-mono hidden md:block whitespace-nowrap">
              v{health?.version || '1.0.0'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
