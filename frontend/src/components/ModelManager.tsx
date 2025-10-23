import { useState } from 'react';
import { FiDownload, FiTrash2, FiRefreshCw, FiCpu, FiHardDrive, FiAlertCircle, FiCheckCircle, FiX } from 'react-icons/fi';
import { useModels } from '../hooks/useModels';

export function ModelManager() {
  const { models, loading, error, downloadProgress, fetchModels, downloadModel, deleteModel } = useModels();
  const [downloadName, setDownloadName] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!downloadName.trim()) return;

    const trimmedName = downloadName.trim();
    
    try {
      setDownloading(true);
      setErrorMsg(null);
      await downloadModel(trimmedName);
      setDownloadName('');
    } catch (err) {
      setErrorMsg(`Failed to download: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setDownloading(false);
    } finally {
      setTimeout(() => setDownloading(false), 500);
    }
  };

  const handleDelete = async (modelName: string) => {
    if (!confirm(`Delete "${modelName}"?`)) return;

    try {
      await deleteModel(modelName);
      setSuccessMsg(`Model "${modelName}" deleted`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(`Failed to delete: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };

  return (
    <div className="glass-card rounded-2xl tech-shadow-lg border border-blue-100/50 relative overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-cyan-400/10 to-purple-400/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* Header */}
      <div className="relative z-10 px-4 sm:px-6 py-3 sm:py-4 border-b border-blue-100/50 bg-gradient-to-r from-blue-50/50 to-cyan-50/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl tech-shadow neon-cyan">
              <FiCpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold gradient-text-cyan">Model Management</h2>
              <p className="text-xs text-slate-600">Download & manage LLMs</p>
            </div>
          </div>
          <button
            onClick={fetchModels}
            disabled={loading}
            className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all tech-shadow font-medium text-sm"
          >
            <FiRefreshCw className={loading ? 'animate-spin w-4 h-4' : 'w-4 h-4'} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      <div className="relative z-10 px-4 sm:px-6 pt-4 space-y-2">
        {error && (
          <div className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200/50 rounded-xl text-red-800 animate-slide-in-right">
            <FiAlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm flex-1">{error}</span>
            <button onClick={() => {}} className="text-red-600 hover:text-red-800">
              <FiX className="w-4 h-4" />
            </button>
          </div>
        )}
        {errorMsg && (
          <div className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200/50 rounded-xl text-red-800 animate-slide-in-right">
            <FiAlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm flex-1">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-red-600 hover:text-red-800">
              <FiX className="w-4 h-4" />
            </button>
          </div>
        )}
        {successMsg && (
          <div className="flex items-start space-x-3 p-3 bg-green-50 border border-green-200/50 rounded-xl text-green-800 animate-slide-in-right">
            <FiCheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm flex-1">{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-green-600 hover:text-green-800">
              <FiX className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 p-4 sm:p-6 space-y-4">
        {/* Download Form */}
        <div className="glass-card p-4 rounded-xl border border-blue-100/50 space-y-3">
          <div className="flex items-center space-x-2">
            <FiDownload className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-900">Download New Model</h3>
          </div>
          
          <form onSubmit={handleDownload} className="space-y-3">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <input
                type="text"
                value={downloadName}
                onChange={(e) => setDownloadName(e.target.value)}
                placeholder="Model name (e.g., llama3, mistral)"
                className="flex-1 px-3 py-2.5 border border-blue-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm transition-all"
                disabled={downloading}
              />
              <button
                type="submit"
                disabled={downloading || !downloadName.trim()}
                className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition-all font-medium tech-shadow text-sm"
              >
                <FiDownload className="w-4 h-4" />
                <span>{downloading ? 'Downloading...' : 'Download'}</span>
              </button>
            </div>
            
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs text-slate-600 font-medium">Popular:</span>
              {['llama3', 'mistral', 'codellama', 'phi3', 'gemma'].map(model => (
                <button
                  key={model}
                  type="button"
                  onClick={() => setDownloadName(model)}
                  className="px-2.5 py-1 bg-white text-slate-700 text-xs font-medium rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-all border border-blue-200/30"
                >
                  {model}
                </button>
              ))}
            </div>
          </form>
        </div>

        {/* Download Progress */}
        {Object.entries(downloadProgress).length > 0 && (
          <div className="space-y-3">
            {Object.entries(downloadProgress).map(([modelName, progress]) => (
              <div
                key={modelName}
                className="glass-card p-4 rounded-xl border border-purple-100/50 animate-slide-in-right"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-slate-900 text-sm">
                    Downloading: {modelName}
                  </h4>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                    progress.status === 'completed' 
                      ? 'bg-green-100 text-green-700' 
                      : progress.status === 'failed' 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {progress.status === 'completed' 
                      ? '✓ Complete' 
                      : progress.status === 'failed' 
                      ? '✗ Failed' 
                      : `${progress.progress}%`}
                  </span>
                </div>
                
                {progress.status !== 'failed' && (
                  <div className="w-full bg-slate-200 rounded-full h-2 mb-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        progress.status === 'completed'
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                          : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                      }`}
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                )}
                
                <p className="text-xs text-slate-600">{progress.message}</p>
                
                {progress.error && (
                  <p className="text-xs text-red-600 mt-1 font-medium">
                    Error: {progress.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Models List */}
        <div className="glass-card p-4 rounded-xl border border-blue-100/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Available Models ({models.length})
            </h3>
          </div>

          {loading && models.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center space-y-3">
                <FiRefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-sm text-slate-600">Loading models...</p>
              </div>
            </div>
          ) : models.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <FiCpu className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-sm text-slate-600">No models installed</p>
                <p className="text-xs text-slate-500">Download a model to get started</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {models.map((model) => (
                <div
                  key={model.name}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100/30 hover:border-blue-300/50 transition-all group"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
                      <FiCpu className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 text-sm truncate">{model.name}</p>
                      <div className="flex items-center space-x-2 text-xs text-slate-500">
                        <span className="flex items-center space-x-1">
                          <FiHardDrive className="w-3 h-3" />
                          <span>{formatSize(model.size)}</span>
                        </span>
                        {model.modified_at && (
                          <>
                            <span>•</span>
                            <span>{new Date(model.modified_at).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(model.name)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                    title="Delete model"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
