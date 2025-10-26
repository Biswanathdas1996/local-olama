import { useState, useRef, useEffect } from 'react';
import { FiSend, FiTrash2, FiSettings, FiCheck, FiMenu } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useModels } from '../hooks/useModels';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useSessions } from '../hooks/useSessions';
import { apiService } from '../services/api';
import { Modal } from './Modal';
import { SessionSidebar } from './SessionSidebar';
import type { GenerationOptions, IndexInfo } from '../types/api';
import type { ChatMessage } from '../types/session';

const CodeBlock = SyntaxHighlighter as any;

export function ChatInterface() {
  const { models } = useModels();
  const {
    sessions,
    currentSession,
    messages,
    createSession,
    switchSession,
    deleteSession,
    renameSession,
    addMessage,
    clearMessages,
  } = useSessions();

  const [prompt, setPrompt] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [availableIndices, setAvailableIndices] = useState<IndexInfo[]>([]);
  const [loadingIndices, setLoadingIndices] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Debug log
  useEffect(() => {
    console.log('ChatInterface: Messages changed:', messages);
    console.log('ChatInterface: Current session:', currentSession);
  }, [messages, currentSession]);

  // Persist settings in localStorage
  const [selectedModel, setSelectedModel] = useLocalStorage<string>('chat-selected-model', '');
  const [selectedIndices, setSelectedIndices] = useLocalStorage<string[]>('chat-selected-indices', []);
  const [options, setOptions] = useLocalStorage<GenerationOptions>('chat-generation-options', {
    max_tokens: 2000,
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40,
    repeat_penalty: 1.1,
    output_format: 'TEXT',
    output_template: '',
    search_top_k: 5,
    search_min_score: 0.0,
    search_type: 'hybrid',
    enable_keyword_extraction: true,
    keyword_top_n: 10,
  });

  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].name);
    }
  }, [models, selectedModel]); 

  useEffect(() => {
    const fetchIndices = async () => {
      setLoadingIndices(true);
      try {
        const response = await apiService.listIndices();
        setAvailableIndices(response.indices);
      } catch (err) {
        console.error('Failed to fetch indices:', err);
      } finally {
        setLoadingIndices(false);
      }
    };
    fetchIndices();
  }, []);

  // Scroll to bottom only when new message is added
  useEffect(() => {
    if (messages.length > 0) {
      const container = messagesContainerRef.current;
      if (container) {
        // Small delay to ensure DOM is updated
        setTimeout(() => {
          container.scrollTop = container.scrollHeight;
        }, 100);
      }
    }
  }, [messages.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !selectedModel || loading) return;

    const userPrompt = prompt;
    setPrompt('');
    
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userPrompt,
      timestamp: new Date(),
    };
    console.log('ChatInterface: Adding user message:', userMessage);
    console.log('ChatInterface: Current session:', currentSession);
    addMessage(userMessage);

    setLoading(true);
    setError(null);

    try {
      // Build request payload
      const requestPayload: any = {
        model: selectedModel,
        prompt: userPrompt,
        max_tokens: options.max_tokens,
        temperature: options.temperature,
        top_p: options.top_p,
        top_k: options.top_k,
        repeat_penalty: options.repeat_penalty,
        output_format: options.output_format,
        output_template: options.output_template,
      };

      // Add search parameters only if indices are selected
      if (selectedIndices.length > 0) {
        requestPayload.indices = selectedIndices;
        requestPayload.search_top_k = options.search_top_k;
        requestPayload.search_min_score = options.search_min_score;
        requestPayload.search_type = options.search_type;
        requestPayload.enable_keyword_extraction = options.enable_keyword_extraction;
        requestPayload.keyword_top_n = options.keyword_top_n;
      }

      const response = await apiService.generateText(requestPayload);

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-response`,
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        model: response.model,
        sources: response.sources,
        stats: {
          total_duration: response.total_duration,
          load_duration: response.load_duration,
          prompt_eval_count: response.prompt_eval_count,
          eval_count: response.eval_count,
        },
      };
      console.log('ChatInterface: Adding assistant message:', assistantMessage);
      addMessage(assistantMessage);
    } catch (err) {
      console.error('Generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate response');
    } finally {
      setLoading(false);
    }
  };

  const toggleIndexSelection = (indexName: string) => {
    setSelectedIndices(prev => 
      prev.includes(indexName) 
        ? prev.filter(name => name !== indexName)
        : [...prev, indexName]
    );
  };

  const formatDuration = (ns?: number) => {
    if (!ns) return 'N/A';
    const seconds = ns / 1_000_000_000;
    return `${seconds.toFixed(2)}s`;
  };

  // Auto-resize textarea as user types
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    
    // Auto-resize
    e.target.style.height = 'auto';
    const newHeight = Math.min(e.target.scrollHeight, 120);
    e.target.style.height = `${newHeight}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div id="chat-interface-root" className="flex h-[100dvh] lg:h-full overflow-hidden bg-gradient-to-br from-slate-50 via-teal-50/30 to-slate-100">
      {/* Session Sidebar */}
      <SessionSidebar
        sessions={sessions}
        currentSessionId={currentSession?.id}
        onCreateSession={createSession}
        onSwitchSession={switchSession}
        onDeleteSession={deleteSession}
        onRenameSession={renameSession}
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
      />

      {/* Main Chat Area */}
      <div id="main-chat-area" className="flex-1 min-w-0 bg-transparent flex flex-col overflow-hidden h-full">
        {/* Modern Compact Header */}
        <div id="chat-header" className="px-3 sm:px-4 py-3 bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-600 flex items-center justify-between shadow-lg border-b border-teal-400/20 flex-shrink-0 backdrop-blur-sm">
          <div id="header-left-section" className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            {/* Menu Button for Mobile */}
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="lg:hidden p-2 rounded-xl hover:bg-white/15 active:bg-white/25 transition-all duration-200 text-white shadow-sm hover:shadow-md"
              title="Toggle sessions"
            >
              <FiMenu className="w-5 h-5" />
            </button>
            <div id="ai-logo" className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-xl flex items-center justify-center text-teal-600 font-bold text-sm sm:text-base flex-shrink-0 shadow-md ring-2 ring-white/20">
              AI
            </div>
          <div id="model-selector-container" className="min-w-0 flex-1 max-w-xs">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-white/95 text-teal-900 border-0 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-white/50 transition-all w-full truncate cursor-pointer shadow-sm hover:bg-white"
              disabled={loading}
            >
              {models.length === 0 ? (
                <option value="">No models</option>
              ) : (
                models.map((model) => (
                  <option key={model.name} value={model.name} className="text-gray-900">
                    {model.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
        <div id="header-right-section" className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-xl hover:bg-white/15 active:bg-white/25 transition-all duration-200 text-white shadow-sm hover:shadow-md"
            title="Settings"
            aria-label="Toggle settings"
          >
            <FiSettings className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={clearMessages}
            className="p-2 rounded-xl hover:bg-white/15 active:bg-white/25 transition-all duration-200 text-white shadow-sm hover:shadow-md"
            disabled={loading}
            title="Clear chat"
          >
            <FiTrash2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="⚙️ Chat Settings"
        maxWidth="3xl"
      >
        <div className="space-y-6">
          {/* Generation Parameters */}
          <div id="generation-parameters-section">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <span className="mr-2">🎛️</span>
              Generation Parameters
            </h4>
            <div id="generation-parameters-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div id="max-tokens-input" className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Tokens
                </label>
                <input
                  type="number"
                  value={options.max_tokens}
                  onChange={(e) => setOptions({ ...options, max_tokens: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  max="100000"
                />
                <p className="mt-1 text-xs text-gray-500">Maximum number of tokens to generate</p>
              </div>
              
              <div id="temperature-input" className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temperature
                </label>
                <input
                  type="number"
                  value={options.temperature}
                  onChange={(e) => setOptions({ ...options, temperature: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  max="2"
                  step="0.1"
                />
                <p className="mt-1 text-xs text-gray-500">Controls randomness (0 = focused, 2 = creative)</p>
              </div>
              
              <div id="top-p-input" className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Top P
                </label>
                <input
                  type="number"
                  value={options.top_p}
                  onChange={(e) => setOptions({ ...options, top_p: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  max="1"
                  step="0.1"
                />
                <p className="mt-1 text-xs text-gray-500">Nucleus sampling threshold</p>
              </div>
              
              <div id="top-k-input" className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Top K
                </label>
                <input
                  type="number"
                  value={options.top_k}
                  onChange={(e) => setOptions({ ...options, top_k: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  max="100"
                />
                <p className="mt-1 text-xs text-gray-500">Limits the next token selection</p>
              </div>
              
              <div id="repeat-penalty-input" className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Repeat Penalty
                </label>
                <input
                  type="number"
                  value={options.repeat_penalty}
                  onChange={(e) => setOptions({ ...options, repeat_penalty: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  max="2"
                  step="0.1"
                />
                <p className="mt-1 text-xs text-gray-500">Penalizes repetition in output</p>
              </div>
            </div>
          </div>

          {/* Output Format and Template */}
          <div id="output-configuration-section">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <span className="mr-2">📄</span>
              Output Configuration
            </h4>
            <div id="output-configuration-grid" className="grid grid-cols-1 lg:grid-cols-1 gap-4">
              <div id="output-format-type" className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Output Format Type
                </label>
                <select
                  value={options.output_format || 'TEXT'}
                  onChange={(e) => setOptions({ ...options, output_format: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm font-medium transition-all hover:border-gray-400"
                >
                  <option value="TEXT">Text (Default)</option>
                  <option value="JSON">JSON</option>
                  <option value="CSV">CSV</option>
                  <option value="PDF">PDF</option>
                  <option value="DOCX">DOCX</option>
                  <option value="PPT">PPT</option>
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  Select the desired output format for responses
                </p>
              </div>
              
              <div id="output-template" className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Output Format
                </label>
                <textarea
                  value={options.output_template || ''}
                  onChange={(e) => setOptions({ ...options, output_template: e.target.value })}
                  placeholder="Enter template structure (optional)&#10;Example: &#10;{&#10;  &quot;title&quot;: &quot;&quot;,&#10;  &quot;summary&quot;: &quot;&quot;&#10;}"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm font-mono"
                  rows={6}
                />
                <p className="mt-2 text-xs text-gray-500">
                  Provide a template to structure the output
                </p>
              </div>
            </div>
          </div>

          {/* RAG Index Selection */}
          <div id="rag-index-section">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <span className="mr-2">📚</span>
              Search Indices (Optional)
            </h4>
            <div id="rag-index-container" className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              {loadingIndices ? (
                <div id="indices-loading" className="text-sm text-gray-500 flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                  Loading indices...
                </div>
              ) : availableIndices.length === 0 ? (
                <div id="no-indices" className="text-sm text-gray-500 text-center py-4">
                  No indices available. Upload documents to create indices.
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-3">
                    Select indices to search through your documents for relevant context
                  </p>
                  <div id="indices-list" className="flex flex-wrap gap-2">
                    {availableIndices.map((index) => (
                      <button
                        key={index.name}
                        onClick={() => toggleIndexSelection(index.name)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedIndices.includes(index.name)
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg'
                            : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50'
                        }`}
                      >
                        {index.name} <span className="text-xs opacity-75">({index.document_count})</span>
                      </button>
                    ))}
                  </div>
                  {selectedIndices.length > 0 && (
                    <>
                      <div id="indices-selected-info" className="mt-3 p-3 text-sm text-blue-700 font-medium bg-blue-100 border border-blue-200 rounded-lg">
                        ✓ {selectedIndices.length} index{selectedIndices.length > 1 ? 'es' : ''} selected
                      </div>
                      
                      {/* Search Configuration - Only shown when indices are selected */}
                      <div id="search-configuration" className="mt-4 pt-4 border-t border-gray-300">
                        <h5 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                          <span className="mr-2">🔍</span>
                          Search Configuration
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Number of chunks to consider */}
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Number of Chunks
                            </label>
                            <input
                              type="number"
                              value={options.search_top_k ?? 5}
                              onChange={(e) => setOptions({ ...options, search_top_k: parseInt(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              min="1"
                              max="50"
                            />
                            <p className="mt-1 text-xs text-gray-500">Chunks to retrieve per index</p>
                          </div>
                          
                          {/* Minimum match percentage */}
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Min Match % ({((options.search_min_score ?? 0) * 100).toFixed(0)}%)
                            </label>
                            <input
                              type="range"
                              value={options.search_min_score ?? 0}
                              onChange={(e) => setOptions({ ...options, search_min_score: parseFloat(e.target.value) })}
                              className="w-full"
                              min="0"
                              max="1"
                              step="0.05"
                            />
                            <p className="mt-1 text-xs text-gray-500">Minimum relevance threshold</p>
                          </div>
                          
                          {/* Search Type */}
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Search Type
                            </label>
                            <select
                              value={options.search_type ?? 'hybrid'}
                              onChange={(e) => setOptions({ ...options, search_type: e.target.value as 'hybrid' | 'semantic' | 'lexical' })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            >
                              <option value="hybrid">Hybrid (Best)</option>
                              <option value="semantic">Semantic Only</option>
                              <option value="lexical">Keyword Only</option>
                            </select>
                            <p className="mt-1 text-xs text-gray-500">Combines meaning & keywords</p>
                          </div>
                          
                          {/* Keyword Extraction Toggle */}
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <label className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">
                                Smart Keywords
                              </span>
                              <input
                                type="checkbox"
                                checked={options.enable_keyword_extraction ?? true}
                                onChange={(e) => setOptions({ ...options, enable_keyword_extraction: e.target.checked })}
                                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                              />
                            </label>
                            <p className="mt-1 text-xs text-gray-500">
                              Auto-extract key terms from your query
                            </p>
                          </div>
                          
                          {/* Keyword Count (only show if extraction is enabled) */}
                          {options.enable_keyword_extraction && (
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Keywords to Extract
                              </label>
                              <input
                                type="number"
                                value={options.keyword_top_n ?? 10}
                                onChange={(e) => setOptions({ ...options, keyword_top_n: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                min="1"
                                max="20"
                              />
                              <p className="mt-1 text-xs text-gray-500">Number of key terms to find</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Info banner for keyword extraction */}
                        {options.enable_keyword_extraction && (
                          <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                            <p className="text-xs text-blue-800 font-medium flex items-center">
                              <span className="mr-2">💡</span>
                              Smart Keywords enabled: AI will automatically identify key concepts from your question for better search results
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div id="settings-action-buttons" className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setOptions({
                  max_tokens: 2000,
                  temperature: 0.7,
                  top_p: 0.9,
                  top_k: 40,
                  repeat_penalty: 1.1,
                  output_format: 'TEXT',
                  output_template: '',
                  search_top_k: 5,
                  search_min_score: 0.0,
                  search_type: 'hybrid',
                  enable_keyword_extraction: true,
                  keyword_top_n: 10,
                });
                setSelectedIndices([]);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Reset to Defaults
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-md transition-all"
            >
              Apply Settings
            </button>
          </div>
        </div>
      </Modal>

      {/* Modern Compact Chat Background - Scrollable */}
      <div 
        id="messages-container"
        ref={messagesContainerRef}
        className="chat-messages-container flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 sm:px-4 py-3 sm:py-4 space-y-2 sm:space-y-3 relative"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 50%, rgba(20, 184, 166, 0.03) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(6, 182, 212, 0.03) 0%, transparent 50%),
            url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2314b8a6' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
          `,
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(20, 184, 166, 0.3) transparent',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {error && (
          <div id="error-message-wrapper" className="mx-auto max-w-2xl">
            <div id="error-message" className="p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-xl shadow-md text-sm">
              <p className="font-semibold flex items-center">
                <span className="mr-2">⚠️</span> Error
              </p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {messages.length === 0 ? (
          <div id="empty-messages-wrapper" className="flex items-center justify-center h-full">
            <div id="empty-messages-content" className="text-center py-8 px-4">
              <div id="empty-messages-icon" className="inline-flex p-5 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl shadow-lg mb-4 ring-4 ring-teal-100">
                <FiSend className="w-8 h-8 text-white" />
              </div>
              <p className="text-base font-semibold text-gray-800 mb-1">Start a Conversation</p>
              <p className="text-sm text-gray-500">Send a message to begin chatting with your AI assistant</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-slideDown`}
            >
              <div
                className={`relative max-w-[85%] sm:max-w-[75%] md:max-w-2xl rounded-2xl px-4 py-3 shadow-md hover:shadow-lg transition-all duration-200 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-600 text-white rounded-tr-sm'
                    : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100'
                }`}
              >
                {/* Message content */}
                <div id={`message-content-${message.id}`} className={`text-sm sm:text-base leading-relaxed ${message.role === 'user' ? 'prose-invert' : ''}`}>
                  {message.role === 'user' ? (
                    <p className="whitespace-pre-wrap break-words m-0">{message.content}</p>
                  ) : (
                    <ReactMarkdown
                      className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-800 prose-strong:text-gray-900"
                      components={{
                        p: ({ children }) => <p className="m-0 mb-3 last:mb-0">{children}</p>,
                        code({ node, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          const inline = !match;
                          return !inline && match ? (
                            <CodeBlock
                              style={vscDarkPlus}
                              language={match[1]}
                              PreTag="div"
                              className="text-sm my-3 rounded-xl overflow-hidden shadow-md"
                              {...props}
                            >
                              {String(children).replace(/\n$/, '')}
                            </CodeBlock>
                          ) : (
                            <code className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md text-sm font-mono border border-teal-100" {...props}>
                              {children}
                            </code>
                          );
                        },
                        ul: ({ children }) => <ul className="my-2 ml-5 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="my-2 ml-5 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="text-sm">{children}</li>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  )}
                </div>

                {/* Source Citations for assistant messages */}
                {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                  <div id={`message-sources-${message.id}`} className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center">
                      <span className="mr-1">📚</span>
                      Sources:
                    </p>
                    <div className="space-y-1.5">
                      {message.sources
                        .filter((source: any) => source.source_type === 'document')
                        .map((source: any, idx: number) => (
                          <div key={idx} className="text-xs text-gray-600 bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-200">
                            <span className="font-medium text-gray-700">
                              {idx + 1}. {source.source_name}
                            </span>
                            {source.page_number && (
                              <span className="text-teal-600 ml-1">
                                (Page {source.page_number})
                              </span>
                            )}
                            {source.relevance_score && (
                              <span className="text-gray-500 ml-1 text-[10px]">
                                • Relevance: {(source.relevance_score * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>
                        ))
                      }
                      {message.sources.some((s: any) => s.source_type === 'model') && (
                        <div className="text-[10px] text-gray-500 italic mt-1">
                          Generated by {message.sources.find((s: any) => s.source_type === 'model')?.source_name || message.model}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Compact timestamp and status */}
                <div id={`message-meta-${message.id}`} className={`flex items-center justify-end gap-1 mt-2 text-xs ${
                  message.role === 'user' ? 'text-white/80' : 'text-gray-500'
                }`}>
                  <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {message.role === 'user' && (
                    <FiCheck className="w-3 h-3" />
                  )}
                </div>

                {/* Subtle stats for assistant messages */}
                {message.role === 'assistant' && message.stats && (
                  <div id={`message-stats-${message.id}`} className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 bg-teal-400 rounded-full"></span>
                    {formatDuration(message.stats.total_duration)}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Compact typing indicator */}
        {loading && (
          <div id="typing-indicator-wrapper" className="flex justify-start animate-slideDown">
            <div id="typing-indicator" className="bg-white rounded-2xl rounded-tl-sm px-5 py-3 shadow-md border border-gray-100">
              <div id="typing-dots" className="flex space-x-1.5">
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Compact Modern Input Area */}
      <form id="chat-input-form" onSubmit={handleSubmit} className="px-3 sm:px-4 py-3 sm:py-4 bg-white/80 backdrop-blur-md border-t border-gray-200 flex-shrink-0 safe-bottom shadow-lg">
        <div id="input-container" className="flex items-end space-x-2 sm:space-x-3 max-w-5xl mx-auto">
          <div id="textarea-wrapper" className="flex-1 bg-white rounded-2xl shadow-md border-2 border-gray-200 focus-within:border-teal-500 focus-within:shadow-xl transition-all duration-200">
            <textarea
              ref={inputRef}
              value={prompt}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="w-full px-4 py-3 bg-transparent focus:outline-none resize-none text-base rounded-2xl text-gray-800 placeholder-gray-400"
              rows={1}
              disabled={loading || !selectedModel}
              style={{
                maxHeight: '120px',
                minHeight: '48px',
                height: 'auto',
                fontSize: '16px'
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !prompt.trim() || !selectedModel}
            className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-600 text-white rounded-2xl hover:from-teal-600 hover:via-teal-700 hover:to-cyan-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl flex-shrink-0 ring-2 ring-teal-100"
            aria-label="Send message"
          >
            <FiSend className="w-5 h-5" />
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}
