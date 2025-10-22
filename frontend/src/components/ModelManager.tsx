import { useState } from 'react';
import { FiDownload, FiTrash2, FiRefreshCw } from 'react-icons/fi';
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
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Model Management</h2>
        <button
          onClick={fetchModels}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          <FiRefreshCw className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Download Form */}
      <form onSubmit={handleDownload} className="mb-6">
        <div className="flex space-x-2">
          <input
            type="text"
            value={downloadName}
            onChange={(e) => setDownloadName(e.target.value)}
            placeholder="Enter model name (e.g., llama3, mistral)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={downloading}
          />
          <button
            type="submit"
            disabled={downloading || !downloadName.trim()}
            className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <FiDownload />
            <span>{downloading ? 'Downloading...' : 'Download'}</span>
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Popular models: llama3, mistral, codellama, phi3
        </p>
      </form>

      {/* Models List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-700">
          Available Models ({models.length})
        </h3>
        {loading && models.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Loading models...</div>
        ) : models.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No models available. Download one to get started!
          </div>
        ) : (
          <div className="space-y-2">
            {models.map((model) => (
              <div
                key={model.name}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800">{model.name}</h4>
                  <p className="text-sm text-gray-500">
                    Size: {formatSize(model.size)}
                    {model.modified_at && (
                      <> • Modified: {new Date(model.modified_at).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(model.name)}
                  className="flex items-center space-x-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete model"
                >
                  <FiTrash2 />
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
