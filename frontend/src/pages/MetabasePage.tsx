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
  FiX,
  FiFileText,
  FiZap,
  FiTrendingUp,
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading datasets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="relative mb-6">
          <div className="relative glass-card border border-blue-100/50 rounded-2xl p-6 tech-shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-md shadow-blue-500/30">
                  <FiDatabase className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Metabase Analytics
                  </h1>
                  <p className="text-sm text-gray-600">Upload & visualize datasets with AI</p>
                </div>
              </div>
              <button
                onClick={loadDatasets}
                className="group bg-white hover:bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-gray-600 hover:text-blue-600 tech-shadow hover:tech-shadow-lg transition-all duration-200"
              >
                <FiRefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative glass-card border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 mb-6 ${
            dragActive
              ? 'border-blue-500 bg-blue-50/50 scale-[1.02]'
              : 'border-blue-200 hover:border-blue-400 hover:bg-white/90'
          } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {uploading ? (
            <div className="space-y-3">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
              <div>
                <p className="text-base font-medium text-gray-700 mb-2">Uploading dataset...</p>
                <div className="w-full max-w-md mx-auto bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{uploadProgress}%</p>
              </div>
            </div>
          ) : (
            <div>
              <FiUploadCloud className="w-12 h-12 text-blue-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-800 mb-1">
                {dragActive ? '✨ Drop file here' : 'Upload Dataset'}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Drag & drop or click to browse
              </p>
              <label className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 text-sm font-medium">
                <FiFileText className="w-4 h-4" />
                <span>Choose File</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileInput}
                  disabled={uploading}
                />
              </label>
              <p className="text-xs text-gray-500 mt-3">
                Excel (.xlsx, .xls) or CSV • Max 2GB
              </p>
            </div>
          )}
        </div>

        {/* Datasets Grid */}
        {datasets.length === 0 ? (
          <div className="text-center py-12 glass-card rounded-2xl border border-blue-100/50">
            <FiDatabase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No datasets yet</p>
            <p className="text-gray-500 text-sm">Upload your first dataset to begin</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {datasets.map((dataset) => (
              <div key={dataset.id} className="group relative">
                <div className="relative glass-card border border-blue-100/50 rounded-2xl p-4 tech-shadow hover:tech-shadow-lg transition-all duration-300 hover:border-blue-300">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="text-base font-semibold text-gray-900 mb-0.5 truncate" title={dataset.original_filename}>
                        {dataset.original_filename}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {metabaseService.formatDate(dataset.upload_date)}
                      </p>
                    </div>
                    <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${metabaseService.getStatusBgColor(dataset.status)} ${metabaseService.getStatusColor(dataset.status)}`}>
                      {dataset.status}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-3 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 rounded-xl p-2 border border-blue-100/50">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Rows</p>
                      <p className="text-sm font-bold text-blue-600">{dataset.row_count.toLocaleString()}</p>
                    </div>
                    <div className="text-center border-x border-blue-100">
                      <p className="text-xs text-gray-500">Cols</p>
                      <p className="text-sm font-bold text-blue-600">{dataset.column_count}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Size</p>
                      <p className="text-sm font-bold text-blue-600">{metabaseService.formatFileSize(dataset.file_size)}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleViewPreview(dataset)}
                      className="flex-1 flex items-center justify-center space-x-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 hover:shadow-md hover:scale-105"
                      title="Preview"
                    >
                      <FiEye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                    <button
                      onClick={() => handleGenerateInsights(dataset)}
                      disabled={generatingInsights}
                      className="flex-1 flex items-center justify-center space-x-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                      title="AI Insights"
                    >
                      <FiZap className="w-3.5 h-3.5" />
                      <span>AI</span>
                    </button>
                    <button
                      onClick={() => handleCreateDashboard(dataset)}
                      disabled={creatingDashboard}
                      className="flex-1 flex items-center justify-center space-x-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                      title="Create Dashboard"
                    >
                      <FiBarChart2 className="w-3.5 h-3.5" />
                      <span>Chart</span>
                    </button>
                    <button
                      onClick={() => handleDeleteDataset(dataset)}
                      className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 hover:shadow-md hover:scale-105"
                      title="Delete"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && preview && selectedDataset && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FiEye className="w-5 h-5" />
                    {selectedDataset.original_filename}
                  </h2>
                  <p className="text-xs text-blue-100">Preview: {preview.sample_rows.length} of {preview.total_rows} rows</p>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 overflow-auto max-h-[75vh]">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {preview.columns.map((column, idx) => (
                          <th key={idx} className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {preview.sample_rows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-blue-50/50 transition-colors">
                          {preview.columns.map((column, colIdx) => (
                            <td key={colIdx} className="px-4 py-2 whitespace-nowrap text-xs text-gray-900">
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-600 to-pink-600">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FiZap className="w-5 h-5" />
                    AI Insights
                  </h2>
                  <p className="text-xs text-purple-100">{selectedDataset.original_filename}</p>
                </div>
                <button
                  onClick={() => setShowInsights(false)}
                  className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 overflow-auto max-h-[75vh] space-y-5">
                {/* Summary */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                  <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <FiFileText className="w-4 h-4 text-blue-600" />
                    Summary
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{insights.summary}</p>
                </div>

                {/* Key Findings */}
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <FiCheckCircle className="w-4 h-4 text-green-600" />
                    Key Findings
                  </h3>
                  <ul className="space-y-2">
                    {insights.key_findings.map((finding, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                        <span className="text-gray-700">{finding}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Data Quality */}
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Data Quality Metrics</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 text-center border border-blue-200">
                      <p className="text-xs text-gray-600 mb-1">Completeness</p>
                      <p className="text-xl font-bold text-blue-700">{(insights.data_quality.completeness * 100).toFixed(0)}%</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 text-center border border-green-200">
                      <p className="text-xs text-gray-600 mb-1">Consistency</p>
                      <p className="text-xl font-bold text-green-700">{(insights.data_quality.consistency * 100).toFixed(0)}%</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 text-center border border-purple-200">
                      <p className="text-xs text-gray-600 mb-1">Accuracy</p>
                      <p className="text-xl font-bold text-purple-700">{(insights.data_quality.accuracy * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <FiTrendingUp className="w-4 h-4 text-orange-600" />
                    Recommendations
                  </h3>
                  <ul className="space-y-2">
                    {insights.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0"></div>
                        <span className="text-gray-700">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
