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

  useEffect(() => {
    loadIndices();
  }, []);

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
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white rounded-t-2xl">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl">
            <FiDatabase className="w-6 h-6 text-purple-600" />
          </div>
          <span>Document Management</span>
        </h2>
        <p className="text-sm text-gray-600">
          Upload documents and search using hybrid retrieval (semantic + keyword)
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mx-8 mt-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg flex items-start space-x-3 shadow-sm">
          <FiAlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}
      {success && (
        <div className="mx-8 mt-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-lg shadow-sm">
          <span className="text-sm font-medium">{success}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 px-8 mt-4">
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-6 py-3 font-medium transition-all relative ${
            activeTab === 'upload'
              ? 'text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <FiUpload className="inline w-4 h-4 mr-2" />
          Upload Documents
          {activeTab === 'upload' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`px-6 py-3 font-medium transition-all relative ${
            activeTab === 'search'
              ? 'text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <FiSearch className="inline w-4 h-4 mr-2" />
          Search Documents
          {activeTab === 'search' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-8">
        {activeTab === 'upload' ? (
          <div className="space-y-6">
            {/* Index Selection */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Select or Create Index
              </label>
              <div className="flex space-x-3">
                <select
                  value={selectedIndex}
                  onChange={(e) => {
                    setSelectedIndex(e.target.value);
                    setNewIndexName('');
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                  disabled={uploading}
                >
                  <option value="">Select existing index...</option>
                  {indices.map((index) => (
                    <option key={index.name} value={index.name}>
                      {index.name} ({index.document_count} docs)
                    </option>
                  ))}
                </select>
                <span className="flex items-center text-gray-500 font-medium">or</span>
                <input
                  type="text"
                  placeholder="New index name"
                  value={newIndexName}
                  onChange={(e) => {
                    setNewIndexName(e.target.value);
                    setSelectedIndex('');
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                  disabled={uploading}
                />
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Upload Document
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-blue-500 hover:bg-blue-50/30 transition-all cursor-pointer bg-gradient-to-br from-gray-50 to-white">
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
                  className="cursor-pointer flex flex-col items-center space-y-3"
                >
                  <div className="p-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl">
                    <FiUpload className="w-10 h-10 text-blue-600" />
                  </div>
                  <span className="text-gray-900 font-semibold text-lg">
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
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Existing Indices</h3>
              {indices.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8 bg-gray-50 rounded-xl">No indices created yet</p>
              ) : (
                <div className="grid gap-3">
                  {indices.map((index) => (
                    <div
                      key={index.name}
                      className="group flex items-center justify-between p-4 bg-gradient-to-r from-white to-gray-50 rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg">
                          <FiDatabase className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{index.name}</p>
                          <p className="text-sm text-gray-500">
                            {index.document_count} document{index.document_count !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteIndex(index.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-red-200"
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
          <div className="space-y-6">
            {/* Index Selection for Search */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Search in Index
              </label>
              <select
                value={selectedIndex}
                onChange={(e) => setSelectedIndex(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
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
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Search Type
              </label>
              <div className="flex space-x-3">
                {(['hybrid', 'semantic', 'lexical'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSearchType(type)}
                    className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all shadow-sm ${
                      searchType === type
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Hybrid = Semantic + Keyword | Semantic = Vector similarity | Lexical = Keyword matching
              </p>
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearch}>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Search Query
              </label>
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter your search query..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  disabled={searching || !selectedIndex}
                />
                <button
                  type="submit"
                  disabled={searching || !searchQuery.trim() || !selectedIndex}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2 font-medium shadow-lg shadow-blue-500/30"
                >
                  <FiSearch className="w-4 h-4" />
                  <span>{searching ? 'Searching...' : 'Search'}</span>
                </button>
              </div>
            </form>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Search Results ({searchResults.length})
                </h3>
                <div className="space-y-3">
                  {searchResults.map((result, index) => (
                    <div
                      key={result.chunk_id}
                      className="p-5 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <FiFile className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-semibold text-gray-900">
                            Result #{index + 1}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                          Score: {result.score.toFixed(3)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed mb-3">
                        {result.text}
                      </p>
                      {result.metadata && Object.keys(result.metadata).length > 0 && (
                        <div className="text-xs text-gray-500 border-t border-gray-200 pt-3 mt-3">
                          <strong className="text-gray-700">Metadata:</strong>{' '}
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
