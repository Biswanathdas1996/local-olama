import { useState, useEffect } from 'react';
import { FiCpu, FiPlay, FiRefreshCw, FiInfo, FiCheckCircle, FiXCircle, FiClock, FiDatabase, FiTrash2 } from 'react-icons/fi';
import { apiService } from '../services/api';
import { DatasetCreator } from '../components/DatasetCreator';
import { TrainingDataCreator } from '../components/TrainingDataCreator';
import type {
  TrainingTechnique,
  TrainingRequest,
  TrainingJobInfo,
  DatasetInfo,
} from '../types/api';

type TabType = 'create-data' | 'train' | 'jobs';

export function TrainingPage() {
  const [activeTab, setActiveTab] = useState<TabType>('create-data');
  const [techniques, setTechniques] = useState<TrainingTechnique[]>([]);
  const [jobs, setJobs] = useState<TrainingJobInfo[]>([]);
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewTrainingForm, setShowNewTrainingForm] = useState(false);
  const [showDatasetCreator, setShowDatasetCreator] = useState(false);
  const [uploadedJSONL, setUploadedJSONL] = useState<File | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<TrainingRequest>>({
    base_model: '',
    new_model_name: '',
    technique: 'lora',
    data_config: {
      dataset_name: '',
      text_column: 'text',
      validation_split: 0.1,
    },
    training_params: {
      num_epochs: 3,
      batch_size: 4,
      learning_rate: 0.0002,
      max_seq_length: 512,
      gradient_accumulation_steps: 4,
      use_fp16: true,
    },
  });

  useEffect(() => {
    loadTechniques();
    loadJobs();
    loadDatasets();
  }, []);

  const loadTechniques = async () => {
    try {
      const response = await apiService.listTrainingTechniques();
      setTechniques(response.techniques);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load techniques');
    }
  };

  const loadJobs = async () => {
    try {
      const response = await apiService.listTrainingJobs();
      setJobs(response.jobs);
    } catch (err) {
      console.error('Failed to load jobs:', err);
    }
  };

  const loadDatasets = async () => {
    try {
      const response = await apiService.listDatasets();
      setDatasets(response.datasets);
    } catch (err) {
      console.error('Failed to load datasets:', err);
    }
  };

  const handleDeleteDataset = async (datasetName: string) => {
    if (!confirm(`Delete dataset "${datasetName}"?`)) return;

    try {
      await apiService.deleteDataset(datasetName);
      loadDatasets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete dataset');
    }
  };

  const handleStartTraining = async () => {
    if (!formData.base_model || !formData.new_model_name) {
      setError('Please fill in all required fields');
      return;
    }

    // Check if we have either a dataset or an uploaded JSONL file
    if (!formData.data_config?.dataset_name && !uploadedJSONL) {
      setError('Please select a dataset or upload a JSONL file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let datasetName = formData.data_config?.dataset_name || '';

      // If JSONL file is uploaded, first create a dataset from it
      if (uploadedJSONL) {
        const datasetNameFromFile = uploadedJSONL.name.replace(/\.(jsonl|json)$/i, '');
        const uploadResponse = await apiService.uploadDataset(
          uploadedJSONL,
          datasetNameFromFile,
          `Dataset created from ${uploadedJSONL.name}`,
          'text' // Default text column
        );
        datasetName = uploadResponse.dataset_name;
      }

      // Start training with the dataset
      const trainingRequest = {
        ...formData,
        data_config: {
          ...formData.data_config!,
          dataset_name: datasetName,
        },
      } as TrainingRequest;

      await apiService.startTraining(trainingRequest);
      setShowNewTrainingForm(false);
      setUploadedJSONL(null);
      loadJobs();
      // Reset form
      setFormData({
        base_model: '',
        new_model_name: '',
        technique: 'lora',
        data_config: {
          dataset_name: '',
          text_column: 'text',
          validation_split: 0.1,
        },
        training_params: {
          num_epochs: 3,
          batch_size: 4,
          learning_rate: 0.0002,
          max_seq_length: 512,
          gradient_accumulation_steps: 4,
          use_fp16: true,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start training');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOllamaModel = async (jobId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.createModelFromTraining(jobId, true);
      
      if (response.status === 'success') {
        alert(
          `✅ ${response.message}\n\n` +
          `Model: ${response.ollama_model || response.model_name}\n` +
          `The model should now be available in your Ollama model list.`
        );
      } else {
        alert(
          `⚠️ ${response.message}\n\n` +
          `Model created at: ${response.model_path}\n` +
          `Please check the message for manual registration instructions.`
        );
      }
      
      // Refresh jobs list
      loadJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create Ollama model');
    } finally {
      setLoading(false);
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
        return <FiInfo className="text-gray-500" />;
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
    <div className="h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Model Training</h1>
        <p className="text-base text-gray-600">
          Fine-tune models using various parameter-efficient techniques
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('create-data')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'create-data'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Create Training Data
            </button>
            <button
              onClick={() => setActiveTab('train')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'train'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Train Model
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'jobs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Training Jobs
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'create-data' && (
        <TrainingDataCreator />
      )}

      {activeTab === 'train' && (
        <div className="space-y-6">{/* Training Techniques */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <FiCpu className="mr-2" />
          Available Training Techniques
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {techniques.map((technique) => (
            <div
              key={technique.name}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors"
            >
              <h3 className="font-semibold text-lg text-gray-900 mb-2">{technique.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{technique.description}</p>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Memory:</span>
                  <span className="font-medium text-gray-700">{technique.memory_requirement}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">GPU Required:</span>
                  <span className="font-medium text-gray-700">
                    {technique.gpu_required ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Speed:</span>
                  <span className="font-medium text-gray-700">{technique.training_speed}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Start New Training */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Start New Training</h2>
          <button
            onClick={() => setShowNewTrainingForm(!showNewTrainingForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <FiPlay className="mr-2" />
            {showNewTrainingForm ? 'Hide Form' : 'New Training'}
          </button>
        </div>

        {showNewTrainingForm && (
          <div className="space-y-4 border-t pt-4">
            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <FiInfo className="text-blue-600 mt-1 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">Model Training Requirements</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Use full HuggingFace model identifiers (e.g., <code className="bg-blue-100 px-1 rounded">mistralai/Mistral-7B-v0.1</code>)</li>
                    <li>• Some models require HuggingFace authentication (use <code className="bg-blue-100 px-1 rounded">huggingface-cli login</code>)</li>
                    <li>• Recommended beginner models: TinyLlama/TinyLlama-1.1B-Chat-v1.0, microsoft/phi-2</li>
                    <li>• <strong>QLoRA requires a GPU</strong> - use LoRA, Adapter, or BitFit for CPU training</li>
                    <li>• CPU training is very slow - GPU highly recommended for production use</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base Model *
                  <span className="text-xs font-normal text-gray-500 ml-2">
                    (HuggingFace model identifier)
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.base_model || ''}
                  onChange={(e) => setFormData({ ...formData, base_model: e.target.value })}
                  placeholder="e.g., TinyLlama/TinyLlama-1.1B-Chat-v1.0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-xs text-gray-600">Quick select:</span>
                  {[
                    { name: 'TinyLlama 1.1B', value: 'TinyLlama/TinyLlama-1.1B-Chat-v1.0' },
                    { name: 'Phi-2', value: 'microsoft/phi-2' },
                    { name: 'Mistral 7B', value: 'mistralai/Mistral-7B-v0.1' },
                  ].map((model) => (
                    <button
                      key={model.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, base_model: model.value })}
                      className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-300 transition-colors"
                    >
                      {model.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Model Name *
                </label>
                <input
                  type="text"
                  value={formData.new_model_name || ''}
                  onChange={(e) => setFormData({ ...formData, new_model_name: e.target.value })}
                  placeholder="my-finetuned-model"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Training Technique *
                </label>
                <select
                  value={formData.technique || 'lora'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      technique: e.target.value as TrainingRequest['technique'],
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="lora">LoRA</option>
                  <option value="qlora">QLoRA</option>
                  <option value="adapter">Adapter</option>
                  <option value="prefix_tuning">Prefix Tuning</option>
                  <option value="bitfit">BitFit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dataset Name *
                </label>
                <div className="flex space-x-2">
                  <select
                    value={formData.data_config?.dataset_name || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        data_config: { ...formData.data_config!, dataset_name: e.target.value },
                      })
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!!uploadedJSONL}
                  >
                    <option value="">Select or enter dataset name</option>
                    <optgroup label="Custom Datasets">
                      {datasets.map((ds) => (
                        <option key={ds.name} value={ds.name}>
                          {ds.name} ({ds.num_samples} samples)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="HuggingFace Datasets">
                      <option value="wikitext-2-raw-v1">wikitext-2-raw-v1</option>
                      <option value="imdb">imdb</option>
                      <option value="ag_news">ag_news</option>
                    </optgroup>
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowDatasetCreator(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center whitespace-nowrap"
                    disabled={!!uploadedJSONL}
                  >
                    <FiDatabase className="mr-2" />
                    Create Dataset
                  </button>
                </div>
                
                {/* JSONL File Upload */}
                <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Or upload JSONL file for training
                    </label>
                  </div>
                  <input
                    type="file"
                    accept=".jsonl,.json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadedJSONL(file);
                        // Clear dataset selection when JSONL is uploaded
                        setFormData({
                          ...formData,
                          data_config: { ...formData.data_config!, dataset_name: '' },
                        });
                      }
                    }}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {uploadedJSONL && (
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm text-gray-600">Selected: {uploadedJSONL.name}</span>
                      <button
                        type="button"
                        onClick={() => setUploadedJSONL(null)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Upload a JSONL file with training data in LoRA format (instruction, input, output)
                  </p>
                </div>

                <input
                  type="text"
                  value={formData.data_config?.dataset_name || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      data_config: { ...formData.data_config!, dataset_name: e.target.value },
                    })
                  }
                  placeholder="Or type HuggingFace dataset name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mt-2"
                  disabled={!!uploadedJSONL}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Text Column Name
                  <span className="text-xs font-normal text-gray-500 ml-2">
                    (which column contains the text to train on)
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.data_config?.text_column || 'text'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      data_config: { ...formData.data_config!, text_column: e.target.value },
                    })
                  }
                  placeholder="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Common values: text, content, input, prompt, instruction
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Epochs</label>
                <input
                  type="number"
                  value={formData.training_params?.num_epochs || 3}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      training_params: {
                        ...formData.training_params!,
                        num_epochs: parseInt(e.target.value),
                      },
                    })
                  }
                  min="1"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch Size</label>
                <input
                  type="number"
                  value={formData.training_params?.batch_size || 4}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      training_params: {
                        ...formData.training_params!,
                        batch_size: parseInt(e.target.value),
                      },
                    })
                  }
                  min="1"
                  max="128"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              onClick={handleStartTraining}
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <FiRefreshCw className="animate-spin mr-2" />
                  Starting Training...
                </>
              ) : (
                <>
                  <FiPlay className="mr-2" />
                  Start Training
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Custom Datasets Section */}
      {datasets.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <FiDatabase className="mr-2" />
              Custom Datasets ({datasets.length})
            </h2>
            <button
              onClick={loadDatasets}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiRefreshCw className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {datasets.map((dataset) => (
              <div
                key={dataset.name}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{dataset.name}</h3>
                  <button
                    onClick={() => handleDeleteDataset(dataset.name)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
                {dataset.description && (
                  <p className="text-sm text-gray-600 mb-2">{dataset.description}</p>
                )}
                <div className="text-xs text-gray-500 space-y-1">
                  <div>Samples: {dataset.num_samples}</div>
                  <div>Column: {dataset.text_column}</div>
                  <div>Created: {new Date(dataset.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dataset Creator Modal */}
      {showDatasetCreator && (
        <DatasetCreator
          onDatasetCreated={() => {
            loadDatasets();
            setShowDatasetCreator(false);
          }}
          onClose={() => setShowDatasetCreator(false)}
        />
      )}
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="space-y-6">
          {/* Training Jobs */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Training Jobs</h2>
              <button
                onClick={loadJobs}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiRefreshCw className="w-5 h-5" />
              </button>
            </div>

            {jobs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FiCpu className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No training jobs yet</p>
                <p className="text-sm">Start your first model fine-tuning in the Train Model tab</p>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <div
                    key={job.job_id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          {getStatusIcon(job.status)}
                          <h3 className="font-semibold text-lg text-gray-900 ml-2">
                            {job.model_name}
                          </h3>
                          <span
                            className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              job.status
                            )}`}
                          >
                            {job.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>
                            <span className="font-medium">Base Model:</span> {job.base_model}
                          </div>
                          <div>
                            <span className="font-medium">Technique:</span> {job.technique}
                          </div>
                          <div>
                            <span className="font-medium">Created:</span>{' '}
                            {new Date(job.created_at).toLocaleString()}
                          </div>
                        </div>
                        {job.status === 'running' && (
                          <div className="mt-3">
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                              <span>Progress</span>
                              <span>{job.progress.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${job.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {job.status === 'completed' && (
                          <div className="mt-3">
                            <button
                              onClick={() => handleCreateOllamaModel(job.job_id)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center"
                            >
                              <FiCheckCircle className="mr-2" />
                              Create Ollama Model
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
