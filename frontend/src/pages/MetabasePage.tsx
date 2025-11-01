import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUploadCloud,
  FiDatabase,
  FiBarChart2,
  FiRefreshCw,
  FiTrash2,
  FiEye,
  FiCheckCircle,
  FiDownload,
  FiX,
  FiFileText,
  FiZap,
  FiTrendingUp,
  FiLayers,
} from 'react-icons/fi';
import metabaseService, { type Dataset, type AIInsight, type DatasetPreview } from '../services/metabase';

export function MetabasePage() {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [preview, setPreview] = useState<DatasetPreview | null>(null);
  const [insights, setInsights] = useState<AIInsight | null>(null);
  const [showInsights, setShowInsights] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [creatingDashboard, setCreatingDashboard] = useState(false);
  const [dashboardUrl, setDashboardUrl] = useState<string | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      setLoading(true);
      const data = await metabaseService.getDatasets();
      setDatasets(data);
    } catch (error) {
      console.error('Failed to load datasets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!metabaseService.isValidFileType(file)) {
      alert('Please upload a valid Excel (.xlsx, .xls) or CSV file');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const dataset = await metabaseService.uploadDataset(file, (progress) => {
        setUploadProgress(progress);
      });

      // Reload datasets
      await loadDatasets();
      
      // Show success message
      alert(`Dataset "${dataset.filename}" uploaded successfully!`);
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error.response?.data?.detail || error.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleViewPreview = async (dataset: Dataset) => {
    try {
      setSelectedDataset(dataset);
      const previewData = await metabaseService.getDatasetPreview(dataset.id, 10);
      setPreview(previewData);
      setShowPreview(true);
    } catch (error) {
      console.error('Failed to load preview:', error);
      alert('Failed to load preview');
    }
  };

  const handleGenerateInsights = async (dataset: Dataset) => {
    try {
      setGeneratingInsights(true);
      setSelectedDataset(dataset);
      const insightData = await metabaseService.generateInsights(dataset.id);
      setInsights(insightData);
      setShowInsights(true);
    } catch (error: any) {
      console.error('Failed to generate insights:', error);
      alert(`Failed to generate insights: ${error.response?.data?.detail || error.message}`);
    } finally {
      setGeneratingInsights(false);
    }
  };

  const handleCreateDashboard = async (dataset: Dataset) => {
    try {
      setCreatingDashboard(true);
      const response = await metabaseService.createDashboard(dataset.id);
      
      if (response.success && response.dashboard_url) {
        // Navigate to the dashboard view page with the URL encoded as a route parameter
        const encodedUrl = encodeURIComponent(response.dashboard_url);
        navigate(`/dashboard/${encodedUrl}`);
      } else {
        alert(`Dashboard creation failed: ${response.message}`);
      }
    } catch (error: any) {
      console.error('Failed to create dashboard:', error);
      alert(`Failed to create dashboard: ${error.response?.data?.detail || error.message}`);
    } finally {
      setCreatingDashboard(false);
    }
  };

  const handleDeleteDataset = async (dataset: Dataset) => {
    if (!confirm(`Are you sure you want to delete "${dataset.filename}"?`)) {
      return;
    }

    try {
      await metabaseService.deleteDataset(dataset.id);
      await loadDatasets();
      alert('Dataset deleted successfully');
    } catch (error) {
      console.error('Failed to delete dataset:', error);
      alert('Failed to delete dataset');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading datasets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-3xl blur-2xl"></div>
          <div className="relative bg-white/40 backdrop-blur-md border border-white/50 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl blur-lg opacity-30"></div>
                  <div className="relative bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-2xl">
                    <FiDatabase className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
                    Metabase Analytics
                  </h1>
                  <p className="text-gray-600">Upload datasets and generate AI-powered dashboards</p>
                </div>
              </div>
              <button
                onClick={loadDatasets}
                className="group relative bg-white/70 backdrop-blur-sm border border-white/50 rounded-xl p-3 text-gray-600 hover:text-blue-600 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                <FiRefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl blur-xl"></div>
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative bg-white/60 backdrop-blur-md border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
              dragActive
                ? 'border-blue-500 bg-blue-50/50 scale-105'
                : 'border-gray-300 hover:border-blue-400 hover:bg-white/70'
            } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {uploading ? (
              <div className="space-y-4">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                <div>
                  <p className="text-lg font-medium text-gray-700 mb-2">Uploading...</p>
                  <div className="w-full max-w-md mx-auto bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{uploadProgress}% complete</p>
                </div>
              </div>
            ) : (
              <div>
                <FiUploadCloud className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  {dragActive ? 'Drop your file here' : 'Upload Dataset'}
                </h3>
                <p className="text-gray-600 mb-6">
                  Drag and drop your Excel or CSV file, or click to browse
                </p>
                <label className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105">
                  <FiFileText className="w-5 h-5" />
                  <span>Choose File</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileInput}
                    disabled={uploading}
                  />
                </label>
                <p className="text-sm text-gray-500 mt-4">
                  Supports Excel (.xlsx, .xls) and CSV files up to 2GB
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Datasets Grid */}
        {datasets.length === 0 ? (
          <div className="text-center py-16">
            <FiDatabase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No datasets uploaded yet</p>
            <p className="text-gray-500 text-sm">Upload your first dataset to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {datasets.map((dataset) => (
              <div key={dataset.id} className="group relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative bg-white/70 backdrop-blur-md border border-white/50 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1 truncate" title={dataset.original_filename}>
                        {dataset.original_filename}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {metabaseService.formatDate(dataset.upload_date)}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${metabaseService.getStatusBgColor(dataset.status)} ${metabaseService.getStatusColor(dataset.status)}`}>
                      {dataset.status}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center space-x-2">
                      <FiLayers className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Rows</p>
                        <p className="text-sm font-semibold text-gray-900">{dataset.row_count.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FiBarChart2 className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Columns</p>
                        <p className="text-sm font-semibold text-gray-900">{dataset.column_count}</p>
                      </div>
                    </div>
                    <div className="col-span-2 flex items-center space-x-2">
                      <FiDownload className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Size</p>
                        <p className="text-sm font-semibold text-gray-900">{metabaseService.formatFileSize(dataset.file_size)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleViewPreview(dataset)}
                      className="flex-1 flex items-center justify-center space-x-1 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                    >
                      <FiEye className="w-4 h-4" />
                      <span>Preview</span>
                    </button>
                    <button
                      onClick={() => handleGenerateInsights(dataset)}
                      disabled={generatingInsights}
                      className="flex-1 flex items-center justify-center space-x-1 bg-purple-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors disabled:opacity-50"
                    >
                      <FiZap className="w-4 h-4" />
                      <span>Insights</span>
                    </button>
                    <button
                      onClick={() => handleCreateDashboard(dataset)}
                      disabled={creatingDashboard}
                      className="flex-1 flex items-center justify-center space-x-1 bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      <FiBarChart2 className="w-4 h-4" />
                      <span>Dashboard</span>
                    </button>
                    <button
                      onClick={() => handleDeleteDataset(dataset)}
                      className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && preview && selectedDataset && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedDataset.original_filename}</h2>
                  <p className="text-sm text-gray-500">Showing {preview.sample_rows.length} of {preview.total_rows} rows</p>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 overflow-auto max-h-[70vh]">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {preview.columns.map((column, idx) => (
                          <th key={idx} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {preview.sample_rows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-gray-50">
                          {preview.columns.map((column, colIdx) => (
                            <td key={colIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {String(row[column] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Insights Modal */}
        {showInsights && insights && selectedDataset && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-500 to-pink-500">
                <div>
                  <h2 className="text-2xl font-bold text-white">AI Insights</h2>
                  <p className="text-purple-100">{selectedDataset.original_filename}</p>
                </div>
                <button
                  onClick={() => setShowInsights(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 overflow-auto max-h-[70vh] space-y-6">
                {/* Summary */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Summary</h3>
                  <p className="text-gray-700">{insights.summary}</p>
                </div>

                {/* Key Findings */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Findings</h3>
                  <ul className="space-y-2">
                    {insights.key_findings.map((finding, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <FiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{finding}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Data Quality */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Data Quality</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-600 mb-1">Completeness</p>
                      <p className="text-2xl font-bold text-blue-600">{(insights.data_quality.completeness * 100).toFixed(0)}%</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-600 mb-1">Consistency</p>
                      <p className="text-2xl font-bold text-green-600">{(insights.data_quality.consistency * 100).toFixed(0)}%</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-600 mb-1">Accuracy</p>
                      <p className="text-2xl font-bold text-purple-600">{(insights.data_quality.accuracy * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Recommendations</h3>
                  <ul className="space-y-2">
                    {insights.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <FiTrendingUp className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Modal */}
        {showDashboard && dashboardUrl && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-500 to-emerald-500 flex-shrink-0">
                <div className="flex items-center space-x-3">
                  <FiBarChart2 className="w-6 h-6 text-white" />
                  <h2 className="text-xl font-bold text-white">Metabase Dashboard</h2>
                </div>
                <button
                  onClick={() => setShowDashboard(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
                <div className="flex-1 min-h-0">
                <iframe
                  src={dashboardUrl}
                  className="w-full h-full border-0"
                  title="Metabase Dashboard"
                />
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
