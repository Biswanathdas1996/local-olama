import { useState, useEffect, useRef } from 'react';
import { FiUpload, FiSearch, FiTrash2, FiFile, FiDatabase, FiAlertCircle, FiCheckCircle, FiX } from 'react-icons/fi';
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
      setSuccess(`${response.filename} uploaded! Created ${response.chunks_created} chunks.`);
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
    if (!confirm(`Delete index "${indexName}"? This cannot be undone.`)) {
      return;
    }

    try {
      await apiService.deleteIndex(indexName);
      setSuccess(`Index "${indexName}" deleted`);
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
    <div className="glass-card rounded-2xl tech-shadow-lg border border-blue-100/50 relative overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* Header */}
      <div className="relative z-10 px-4 sm:px-6 py-3 sm:py-4 border-b border-blue-100/50 bg-gradient-to-r from-purple-50/50 to-pink-50/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl tech-shadow neon-purple">
              <FiDatabase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold gradient-text">Document Management</h2>
              <p className="text-xs text-slate-600">Upload & Search Documents</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-medium border border-blue-200/50">
              {indices.length} {indices.length === 1 ? 'Index' : 'Indices'}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mt-3">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'upload'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white tech-shadow neon-blue'
                : 'bg-white/50 text-slate-700 hover:bg-white/80'
            }`}
          >
            <FiUpload className="w-4 h-4" />
            <span>Upload</span>
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'search'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white tech-shadow neon-blue'
                : 'bg-white/50 text-slate-700 hover:bg-white/80'
            }`}
          >
            <FiSearch className="w-4 h-4" />
            <span>Search</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {(error || success) && (
        <div className="relative z-10 px-4 sm:px-6 pt-4">
          {error && (
            <div className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200/50 rounded-xl text-red-800 animate-slide-in-right">
              <FiAlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm flex-1">{error}</span>
              <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
                <FiX className="w-4 h-4" />
              </button>
            </div>
          )}
          {success && (
            <div className="flex items-start space-x-3 p-3 bg-green-50 border border-green-200/50 rounded-xl text-green-800 animate-slide-in-right">
              <FiCheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm flex-1">{success}</span>
              <button onClick={() => setSuccess(null)} className="text-green-600 hover:text-green-800">
                <FiX className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 p-4 sm:p-6 space-y-4">
        {activeTab === 'upload' ? (
          <>
            {/* Index Selection */}
            <div className="glass-card p-4 rounded-xl border border-blue-100/50 space-y-3">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700 mb-2 block">Select Index</span>
                <select
                  value={selectedIndex}
                  onChange={(e) => setSelectedIndex(e.target.value)}
                  className="w-full px-3 py-2.5 border border-blue-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm font-medium transition-all"
                  disabled={uploading}
                >
                  <option value="">-- Select Existing Index --</option>
                  {indices.map((index) => (
                    <option key={index.name} value={index.name}>
                      {index.name} ({index.document_count} docs)
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-center space-x-2">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
                <span className="text-xs font-medium text-slate-500">OR</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
              </div>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700 mb-2 block">Create New Index</span>
                <input
                  type="text"
                  value={newIndexName}
                  onChange={(e) => setNewIndexName(e.target.value)}
                  placeholder="Enter new index name"
                  className="w-full px-3 py-2.5 border border-blue-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm transition-all"
                  disabled={uploading}
                />
              </label>
            </div>

            {/* File Upload */}
            <div className="glass-card p-4 rounded-xl border border-blue-100/50">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700 mb-2 block">Upload Document</span>
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    accept=".pdf,.docx,.txt,.pptx,.html"
                    disabled={uploading}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full px-4 py-8 border-2 border-dashed border-blue-300 rounded-xl hover:border-blue-500 hover:bg-blue-50/50 transition-all text-center group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl group-hover:scale-110 transition-transform">
                        <FiUpload className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {uploading ? 'Uploading...' : 'Choose file to upload'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">PDF, DOCX, TXT, PPTX, HTML</p>
                      </div>
                    </div>
                  </button>
                </div>
              </label>
            </div>

            {/* Index Management */}
            {indices.length > 0 && (
              <div className="glass-card p-4 rounded-xl border border-blue-100/50">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Manage Indices</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {indices.map((index) => (
                    <div
                      key={index.name}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100/30 hover:border-blue-300/50 transition-all group"
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <FiDatabase className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900 text-sm truncate">{index.name}</p>
                          <p className="text-xs text-slate-500">
                            {index.document_count} documents
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteIndex(index.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                        title="Delete index"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Search Form */}
            <form onSubmit={handleSearch} className="glass-card p-4 rounded-xl border border-blue-100/50 space-y-3">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700 mb-2 block">Select Index to Search</span>
                <select
                  value={selectedIndex}
                  onChange={(e) => setSelectedIndex(e.target.value)}
                  className="w-full px-3 py-2.5 border border-blue-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm font-medium transition-all"
                  disabled={searching}
                >
                  <option value="">-- Select Index --</option>
                  {indices.map((index) => (
                    <option key={index.name} value={index.name}>
                      {index.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700 mb-2 block">Search Query</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter your search query..."
                  className="w-full px-3 py-2.5 border border-blue-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm transition-all"
                  disabled={searching}
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700 mb-2 block">Search Type</span>
                <div className="grid grid-cols-3 gap-2">
                  {(['hybrid', 'semantic', 'lexical'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSearchType(type)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        searchType === type
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white tech-shadow'
                          : 'bg-white text-slate-700 border border-blue-200/50 hover:border-blue-300'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </label>

              <button
                type="submit"
                disabled={searching || !selectedIndex || !searchQuery.trim()}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all tech-shadow neon-blue"
              >
                <FiSearch className="w-4 h-4" />
                <span>{searching ? 'Searching...' : 'Search Documents'}</span>
              </button>
            </form>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="glass-card p-4 rounded-xl border border-blue-100/50">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">
                  Results ({searchResults.length})
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <div
                      key={index}
                      className="p-4 bg-white rounded-xl border border-blue-100/30 hover:border-blue-300/50 transition-all animate-slide-in-right"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <FiFile className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span className="font-medium text-sm text-slate-900 truncate">
                            {result.metadata?.filename || 'Document'}
                          </span>
                        </div>
                        <span className="text-xs font-mono px-2 py-1 bg-blue-50 text-blue-700 rounded-lg">
                          {(result.score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{result.text}</p>
                      {result.metadata?.page && (
                        <p className="text-xs text-slate-500 mt-2">Page {result.metadata.page}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
