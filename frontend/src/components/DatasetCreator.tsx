import { useState } from 'react';
import { FiUpload, FiPlus, FiTrash2, FiSave, FiX, FiFile, FiEdit3 } from 'react-icons/fi';
import { apiService } from '../services/api';
import type { DatasetTextEntry } from '../types/api';

interface DatasetCreatorProps {
  onDatasetCreated: () => void;
  onClose: () => void;
}

export function DatasetCreator({ onDatasetCreated, onClose }: DatasetCreatorProps) {
  const [mode, setMode] = useState<'upload' | 'manual'>('upload');
  const [datasetName, setDatasetName] = useState('');
  const [description, setDescription] = useState('');
  const [textColumn, setTextColumn] = useState('text');
  const [file, setFile] = useState<File | null>(null);
  const [textEntries, setTextEntries] = useState<DatasetTextEntry[]>([{ text: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleAddEntry = () => {
    setTextEntries([...textEntries, { text: '' }]);
  };

  const handleRemoveEntry = (index: number) => {
    setTextEntries(textEntries.filter((_, i) => i !== index));
  };

  const handleEntryChange = (index: number, text: string) => {
    const updated = [...textEntries];
    updated[index] = { text };
    setTextEntries(updated);
  };

  const handleUpload = async () => {
    if (!datasetName.trim()) {
      setError('Please provide a dataset name');
      return;
    }

    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiService.uploadDataset(file, datasetName, description, textColumn);
      setSuccess(response.message);
      setTimeout(() => {
        onDatasetCreated();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload dataset');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromText = async () => {
    if (!datasetName.trim()) {
      setError('Please provide a dataset name');
      return;
    }

    const validEntries = textEntries.filter((e) => e.text.trim() !== '');
    if (validEntries.length === 0) {
      setError('Please add at least one text entry');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiService.createDatasetFromText({
        dataset_name: datasetName,
        entries: validEntries,
        description: description || undefined,
        text_column: textColumn,
      });
      setSuccess(response.message);
      setTimeout(() => {
        onDatasetCreated();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create dataset');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (mode === 'upload') {
      handleUpload();
    } else {
      handleCreateFromText();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Create Training Dataset</h2>
            <p className="text-blue-100 text-sm mt-1">
              Upload a file or create dataset manually
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
              {success}
            </div>
          )}

          {/* Mode Selection */}
          <div className="flex space-x-2 mb-6">
            <button
              onClick={() => setMode('upload')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center ${
                mode === 'upload'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FiUpload className="mr-2" />
              Upload File
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center ${
                mode === 'manual'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FiEdit3 className="mr-2" />
              Manual Entry
            </button>
          </div>

          {/* Common Fields */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dataset Name *
              </label>
              <input
                type="text"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                placeholder="my-custom-dataset"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your dataset..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Text Column Name
              </label>
              <input
                type="text"
                value={textColumn}
                onChange={(e) => setTextColumn(e.target.value)}
                placeholder="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Upload Mode */}
          {mode === 'upload' && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
              <div className="text-center">
                <FiFile className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <label className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-700 font-medium">
                    Click to upload
                  </span>
                  <input
                    type="file"
                    accept=".txt,.csv,.json,.jsonl"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <p className="text-sm text-gray-500 mt-2">
                  Supported formats: TXT, CSV, JSON, JSONL
                </p>
                {file && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">{file.name}</p>
                    <p className="text-xs text-blue-700">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Manual Mode */}
          {mode === 'manual' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Text Entries</label>
                <button
                  onClick={handleAddEntry}
                  className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FiPlus className="mr-1" />
                  Add Entry
                </button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {textEntries.map((entry, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div className="flex-1">
                      <textarea
                        value={entry.text}
                        onChange={(e) => handleEntryChange(index, e.target.value)}
                        placeholder={`Entry ${index + 1}...`}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    {textEntries.length > 1 && (
                      <button
                        onClick={() => handleRemoveEntry(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-500 mt-2">
                {textEntries.filter((e) => e.text.trim()).length} valid entries
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              <>
                <FiUpload className="animate-pulse mr-2" />
                Creating...
              </>
            ) : (
              <>
                <FiSave className="mr-2" />
                Create Dataset
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
