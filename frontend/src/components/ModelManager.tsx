import { useState } from 'react';
import { FiDownload, FiTrash2, FiRefreshCw, FiCpu, FiHardDrive } from 'react-icons/fi';
import { useModels } from '../hooks/useModels';

export function ModelManager() {
  const { models, loading, error, fetchModels, downloadModel, deleteModel } = useModels();
  const [downloadName, setDownloadName] = useState('');
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!downloadName.trim()) return;

    try {
      setDownloading(true);
      await downloadModel(downloadName.trim());
      setDownloadName('');
      alert(`Model "${downloadName}" download initiated successfully!`);
    } catch (err) {
      alert(`Failed to download model: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async (modelName: string) => {
    if (!confirm(`Are you sure you want to delete "${modelName}"?`)) return;

    try {
      await deleteModel(modelName);
      alert(`Model "${modelName}" deleted successfully!`);
    } catch (err) {
      alert(`Failed to delete model: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Model Management</h2>
          <p className="text-gray-600">Download and manage your local LLM models</p>
        </div>
        <button
          onClick={fetchModels}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/30 font-medium"
        >
          <FiRefreshCw className={loading ? 'animate-spin w-4 h-4' : 'w-4 h-4'} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg shadow-sm">
          <p className="font-medium">Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Download Form */}
      <div className="mb-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <FiDownload className="w-5 h-5 text-blue-600" />
          <span>Download New Model</span>
        </h3>
        <form onSubmit={handleDownload}>
          <div className="flex space-x-3">
            <input
              type="text"
              value={downloadName}
              onChange={(e) => setDownloadName(e.target.value)}
              placeholder="Enter model name (e.g., llama3, mistral)"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
              disabled={downloading}
            />
            <button
              type="submit"
              disabled={downloading || !downloadName.trim()}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition-all font-medium shadow-lg shadow-green-500/30"
            >
              <FiDownload className="w-4 h-4" />
              <span>{downloading ? 'Downloading...' : 'Download'}</span>
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-gray-600 font-medium">Popular models:</span>
            {['llama3', 'mistral', 'codellama', 'phi3'].map(model => (
              <button
                key={model}
                type="button"
                onClick={() => setDownloadName(model)}
                className="px-3 py-1 bg-white text-gray-700 text-xs font-medium rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors shadow-sm border border-gray-200"
              >
                {model}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Models List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Available Models ({models.length})
          </h3>
        </div>
        {loading && models.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-block p-6 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl shadow-lg mb-4">
              <FiRefreshCw className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
            <p className="text-gray-600 font-medium">Loading models...</p>
          </div>
        ) : models.length === 0 ? (
          <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl border-2 border-dashed border-gray-300">
            <div className="inline-block p-6 bg-white rounded-2xl shadow-md mb-4">
              <FiCpu className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium mb-2">No models available</p>
            <p className="text-gray-500 text-sm">Download a model to get started!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {models.map((model) => (
              <div
                key={model.name}
                className="group flex items-center justify-between p-5 bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl">
                    <FiCpu className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">{model.name}</h4>
                    <div className="flex items-center space-x-3 text-sm text-gray-500">
                      <span className="flex items-center space-x-1">
                        <FiHardDrive className="w-4 h-4" />
                        <span>{formatSize(model.size)}</span>
                      </span>
                      {model.modified_at && (
                        <span>• Modified: {new Date(model.modified_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(model.name)}
                  className="flex items-center space-x-1.5 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-all font-medium opacity-0 group-hover:opacity-100 border border-transparent hover:border-red-200"
                  title="Delete model"
                >
                  <FiTrash2 className="w-4 h-4" />
                  <span className="text-sm">Delete</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
