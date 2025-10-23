import { useState, useEffect, useRef } from 'react';
import { FiUpload, FiDownload, FiCheckCircle, FiXCircle, FiRefreshCw, FiClock, FiFile, FiX } from 'react-icons/fi';
import { apiService } from '../services/api';
import type { TrainingDataJob, ModelInfo } from '../types/api';

interface TrainingDataCreatorProps {
  onClose?: () => void;
}

export function TrainingDataCreator({ onClose }: TrainingDataCreatorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [model, setModel] = useState('');
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [maxSamples, setMaxSamples] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentJob, setCurrentJob] = useState<TrainingDataJob | null>(null);
  const [recentJobs, setRecentJobs] = useState<TrainingDataJob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    loadAvailableModels();
    loadRecentJobs();
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const loadAvailableModels = async () => {
    try {
      const response = await apiService.listModels();
      setAvailableModels(response.models);
      // Set first model as default if available
      if (response.models.length > 0 && !model) {
        setModel(response.models[0].name);
      }
    } catch (err) {
      console.error('Failed to load models:', err);
      setError('Failed to load available models');
    }
  };

  useEffect(() => {
    if (currentJob && currentJob.status === 'running') {
      // Poll for status updates
      pollIntervalRef.current = setInterval(() => {
        pollJobStatus(currentJob.job_id);
      }, 2000);
    } else if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [currentJob?.status]);

  const loadRecentJobs = async () => {
    try {
      const response = await apiService.listTrainingDataJobs();
      setRecentJobs(response.jobs.slice(0, 5)); // Show last 5 jobs
    } catch (err) {
      console.error('Failed to load recent jobs:', err);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    try {
      const job = await apiService.getTrainingDataJobStatus(jobId);
      setCurrentJob(job);
      
      if (job.status === 'completed' || job.status === 'failed') {
        loadRecentJobs();
      }
    } catch (err) {
      console.error('Failed to poll job status:', err);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
        setError('Please select a PDF file');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a PDF file');
      return;
    }

    if (!model) {
      setError('Please select a model');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiService.generateTrainingDataFromPDF(
        file,
        model,
        maxSamples
      );

      setCurrentJob({
        job_id: response.job_id,
        filename: response.filename,
        status: 'queued',
        progress: 0,
        created_at: new Date().toISOString(),
        model: model,
        total_samples: 0,
      });

      // Start polling for status
      pollJobStatus(response.job_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (jobId: string, filename: string) => {
    try {
      const blob = await apiService.downloadTrainingData(jobId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.replace('.pdf', '_training_data.jsonl');
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download file');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <FiCheckCircle className="text-green-500" />;
      case 'failed':
        return <FiXCircle className="text-red-500" />;
      case 'running':
        return <FiRefreshCw className="text-blue-500 animate-spin" />;
      case 'queued':
        return <FiClock className="text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'queued':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Create Training Data from PDF</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Upload Form */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select PDF Document
          </label>
          <div className="flex items-center space-x-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
            >
              <FiFile className="mr-2" />
              Choose PDF
            </button>
            {file && (
              <span className="text-sm text-gray-600">{file.name}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Model to Use for Q&A Generation *
              </label>
              <button
                type="button"
                onClick={loadAvailableModels}
                className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                title="Refresh models"
              >
                <FiRefreshCw className="w-4 h-4" />
              </button>
            </div>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={availableModels.length === 0}
            >
              {availableModels.length === 0 ? (
                <option value="">No models available</option>
              ) : (
                <>
                  <option value="">Select a model</option>
                  {availableModels.map((modelInfo) => (
                    <option key={modelInfo.name} value={modelInfo.name}>
                      {modelInfo.name}
                    </option>
                  ))}
                </>
              )}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {availableModels.length === 0 
                ? 'Download models from the Models page first'
                : 'Select an Ollama model to generate question-answer pairs'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Samples (Optional)
            </label>
            <input
              type="number"
              value={maxSamples || ''}
              onChange={(e) => setMaxSamples(e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="All"
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Limit the number of training samples generated
            </p>
          </div>
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || !model || loading || availableModels.length === 0}
          className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <>
              <FiRefreshCw className="animate-spin mr-2" />
              Processing...
            </>
          ) : (
            <>
              <FiUpload className="mr-2" />
              Generate Training Data
            </>
          )}
        </button>
      </div>

      {/* Current Job Progress */}
      {currentJob && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              {getStatusIcon(currentJob.status)}
              <span className="ml-2 font-semibold text-gray-900">{currentJob.filename}</span>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(currentJob.status)}`}>
              {currentJob.status}
            </span>
          </div>

          {currentJob.status === 'running' && (
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{currentJob.progress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${currentJob.progress}%` }}
                />
              </div>
            </div>
          )}

          {currentJob.status === 'completed' && (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-gray-600">
                Successfully generated {currentJob.total_samples} training samples
              </p>
              <button
                onClick={() => handleDownload(currentJob.job_id, currentJob.filename)}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
              >
                <FiDownload className="mr-2" />
                Download JSONL File
              </button>
            </div>
          )}

          {currentJob.status === 'failed' && currentJob.error_message && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-800">{currentJob.error_message}</p>
            </div>
          )}
        </div>
      )}

      {/* Recent Jobs */}
      {recentJobs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Jobs</h3>
          <div className="space-y-2">
            {recentJobs.map((job) => (
              <div
                key={job.job_id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center flex-1">
                  {getStatusIcon(job.status)}
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">{job.filename}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(job.created_at).toLocaleString()}
                      {job.total_samples > 0 && ` • ${job.total_samples} samples`}
                    </p>
                  </div>
                </div>
                {job.status === 'completed' && (
                  <button
                    onClick={() => handleDownload(job.job_id, job.filename)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <FiDownload className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">How it works:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Make sure you have Ollama models downloaded (check Models page)</li>
          <li>• Upload a PDF document with text content</li>
          <li>• Select an Ollama model for Q&A generation</li>
          <li>• The system extracts and chunks the text</li>
          <li>• The selected LLM generates question-answer pairs from each chunk</li>
          <li>• Output is saved as JSONL in LoRA-compatible format</li>
          <li>• Download and use the JSONL file to train your model</li>
        </ul>
      </div>
    </div>
  );
}
