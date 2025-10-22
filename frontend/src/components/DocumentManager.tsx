import { useState, useEffect, useRef } from 'react';
import { FiUpload, FiSearch, FiTrash2, FiFile, FiDatabase, FiAlertCircle } from 'react-icons/fi';
import { apiService } from '../services/api';
import type { IndexInfo, SearchResult } from '../types/api';

export function DocumentManager() {
  const [indices, setIndices] = useState<IndexInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<string>('');
  const [newIndexName, setNewIndexName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchType, setSearchType] = useState<'hybrid' | 'semantic' | 'lexical'>('hybrid');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'search'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load indices on mount
  useEffect(() => {
    loadIndices();
  }, []);

  // Auto-select first index
  useEffect(() => {
    if (indices.length > 0 && !selectedIndex) {
      setSelectedIndex(indices[0].name);
    }
  }, [indices, selectedIndex]);

  const loadIndices = async () => {
    try {
      const response = await apiService.listIndices();
      setIndices(response.indices);
    } catch (err) {
      setError('Failed to load indices');
      console.error(err);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedIndex && !newIndexName) {
      setError('Please select or create an index');
      return;
    }

    const indexName = newIndexName || selectedIndex;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiService.uploadDocument(file, indexName);
      setSuccess(`✓ ${response.filename} uploaded successfully! Created ${response.chunks_created} chunks.`);
      setNewIndexName('');
      await loadIndices();
      if (!selectedIndex) {
        setSelectedIndex(indexName);
      }
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !selectedIndex) return;

    setSearching(true);
    setError(null);

    try {
      const response = await apiService.searchDocuments(
        searchQuery,
        selectedIndex,
        5,
        searchType
      );
      setSearchResults(response.results);
      if (response.results.length === 0) {
        setError('No results found');
      }
    } catch (err: any) {
      setError(err.message || 'Search failed');
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleDeleteIndex = async (indexName: string) => {
    if (!confirm(`Are you sure you want to delete the index "${indexName}"? This cannot be undone.`)) {
      return;
    }

    try {
      await apiService.deleteIndex(indexName);
      setSuccess(`Index "${indexName}" deleted successfully`);
      await loadIndices();
      if (selectedIndex === indexName) {
        setSelectedIndex('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete index');
      console.error(err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
          <FiDatabase className="w-6 h-6" />
          <span>Document Management (RAG)</span>
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Upload documents and search using hybrid retrieval (semantic + keyword)
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="m-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start space-x-2">
          <FiAlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="m-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          {success}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 px-4">
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'upload'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <FiUpload className="inline w-4 h-4 mr-2" />
          Upload Documents
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'search'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <FiSearch className="inline w-4 h-4 mr-2" />
          Search Documents
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'upload' ? (
          // Upload Tab
          <div className="space-y-6">
            {/* Index Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select or Create Index
              </label>
              <div className="flex space-x-2">
                <select
                  value={selectedIndex}
                  onChange={(e) => {
                    setSelectedIndex(e.target.value);
                    setNewIndexName('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={uploading}
                >
                  <option value="">Select existing index...</option>
                  {indices.map((index) => (
                    <option key={index.name} value={index.name}>
                      {index.name} ({index.document_count} docs)
                    </option>
                  ))}
                </select>
                <span className="flex items-center text-gray-500">or</span>
                <input
                  type="text"
                  placeholder="New index name"
                  value={newIndexName}
                  onChange={(e) => {
                    setNewIndexName(e.target.value);
                    setSelectedIndex('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={uploading}
                />
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Document
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt,.pptx,.html"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  <FiUpload className="w-12 h-12 text-gray-400" />
                  <span className="text-gray-600 font-medium">
                    {uploading ? 'Uploading...' : 'Click to upload document'}
                  </span>
                  <span className="text-sm text-gray-500">
                    Supported: PDF, DOCX, TXT, PPTX, HTML
                  </span>
                </label>
              </div>
            </div>

            {/* Indices List */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Existing Indices</h3>
              {indices.length === 0 ? (
                <p className="text-gray-500 text-sm">No indices created yet</p>
              ) : (
                <div className="space-y-2">
                  {indices.map((index) => (
                    <div
                      key={index.name}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <FiDatabase className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="font-medium text-gray-800">{index.name}</p>
                          <p className="text-sm text-gray-500">
                            {index.document_count} document{index.document_count !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteIndex(index.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete index"
                      >
                        <FiTrash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Search Tab
          <div className="space-y-6">
            {/* Index Selection for Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search in Index
              </label>
              <select
                value={selectedIndex}
                onChange={(e) => setSelectedIndex(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={searching}
              >
                <option value="">Select an index...</option>
                {indices.map((index) => (
                  <option key={index.name} value={index.name}>
                    {index.name} ({index.document_count} docs)
                  </option>
                ))}
              </select>
            </div>

            {/* Search Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Type
              </label>
              <div className="flex space-x-2">
                {(['hybrid', 'semantic', 'lexical'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSearchType(type)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      searchType === type
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Hybrid = Semantic + Keyword | Semantic = Vector similarity | Lexical = Keyword matching
              </p>
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearch}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Query
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter your search query..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={searching || !selectedIndex}
                />
                <button
                  type="submit"
                  disabled={searching || !searchQuery.trim() || !selectedIndex}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  <FiSearch />
                  <span>{searching ? 'Searching...' : 'Search'}</span>
                </button>
              </div>
            </form>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Search Results ({searchResults.length})
                </h3>
                <div className="space-y-3">
                  {searchResults.map((result, index) => (
                    <div
                      key={result.chunk_id}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <FiFile className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">
                            Result #{index + 1}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-1 rounded">
                          Score: {result.score.toFixed(3)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap mb-2">
                        {result.text}
                      </p>
                      {result.metadata && Object.keys(result.metadata).length > 0 && (
                        <div className="text-xs text-gray-500 border-t border-gray-200 pt-2 mt-2">
                          <strong>Metadata:</strong>{' '}
                          {Object.entries(result.metadata)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(' • ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
