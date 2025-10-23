import { useState, useRef, useEffect } from 'react';
import { FiSend, FiTrash2, FiSettings, FiCheck, FiChevronDown } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useGeneration } from '../hooks/useGeneration';
import { useModels } from '../hooks/useModels';
import { apiService } from '../services/api';
import { Modal } from './Modal';
import type { GenerationOptions, IndexInfo } from '../types/api';

const CodeBlock = SyntaxHighlighter as any;

export function ChatInterface() {
  const { messages, loading, error, generateResponse, clearMessages } = useGeneration();
  const { models } = useModels();
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [availableIndices, setAvailableIndices] = useState<IndexInfo[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<string[]>([]);
  const [loadingIndices, setLoadingIndices] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [options, setOptions] = useState<GenerationOptions>({
    max_tokens: 2000,
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40,
    repeat_penalty: 1.1,
    output_format: 'TEXT',
    output_template: '',
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

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom('auto');
  }, [messages, loading]);

  // Detect if user has scrolled up
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom && messages.length > 0);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [messages.length]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !selectedModel || loading) return;

    const userPrompt = prompt;
    setPrompt('');
    
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    try {
      await generateResponse(selectedModel, userPrompt, options, selectedIndices.length > 0 ? selectedIndices : undefined);
    } catch (err) {
      console.error('Generation error:', err);
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
    <div className="bg-gradient-to-b from-gray-100 to-gray-50 flex flex-col h-[100dvh] sm:h-[calc(100vh-8rem)] rounded-none sm:rounded-lg shadow-lg overflow-hidden">
      {/* WhatsApp-style Header - Fixed */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-teal-600 to-teal-700 flex items-center justify-between shadow-md flex-shrink-0">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center text-teal-600 font-bold text-sm sm:text-base flex-shrink-0 shadow-sm">
            AI
          </div>
          <div className="min-w-0 flex-1">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-white/20 text-white border-0 rounded-md px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium focus:outline-none focus:bg-white/30 transition-all w-full truncate"
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
        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-all text-white"
            title="Settings"
            aria-label="Toggle settings"
          >
            <FiSettings className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={clearMessages}
            className="p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-all text-white"
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
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <span className="mr-2">🎛️</span>
              Generation Parameters
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
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
              
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
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
              
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
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
              
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
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
              
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
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
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <span className="mr-2">📄</span>
              Output Configuration
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
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
              
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
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
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
              <span className="mr-2">📚</span>
              Search Indices (Optional)
            </h4>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              {loadingIndices ? (
                <div className="text-sm text-gray-500 flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                  Loading indices...
                </div>
              ) : availableIndices.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-4">
                  No indices available. Upload documents to create indices.
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-3">
                    Select indices to search through your documents for relevant context
                  </p>
                  <div className="flex flex-wrap gap-2">
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
                    <div className="mt-3 p-3 text-sm text-blue-700 font-medium bg-blue-100 border border-blue-200 rounded-lg">
                      ✓ {selectedIndices.length} index{selectedIndices.length > 1 ? 'es' : ''} selected
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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

      {/* WhatsApp-style Chat Background - Scrollable */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-4 py-3 sm:py-4 space-y-1.5 sm:space-y-2 scroll-smooth"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d1d5db' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin'
        }}
      >
        {error && (
          <div className="mx-auto max-w-md">
            <div className="p-2.5 sm:p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg shadow-sm text-xs sm:text-sm">
              <p className="font-medium">Error</p>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center py-8">
              <div className="inline-block p-4 bg-white rounded-full shadow-md mb-3">
                <FiSend className="w-8 h-8 text-teal-600" />
              </div>
              <p className="text-base sm:text-lg font-medium text-gray-700 mb-1">No messages yet</p>
              <p className="text-xs sm:text-sm text-gray-500">Start a conversation with your AI!</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-slideDown`}
            >
              <div
                className={`relative max-w-[85%] sm:max-w-[75%] md:max-w-2xl rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 shadow-sm ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-tr-none'
                    : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'
                }`}
              >
                {/* Message content */}
                <div className={`text-sm sm:text-base leading-relaxed ${message.role === 'user' ? 'prose-invert' : ''}`}>
                  {message.role === 'user' ? (
                    <p className="whitespace-pre-wrap break-words m-0">{message.content}</p>
                  ) : (
                    <ReactMarkdown
                      className="prose prose-sm max-w-none"
                      components={{
                        p: ({ children }) => <p className="m-0 mb-2 last:mb-0">{children}</p>,
                        code({ node, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          const inline = !match;
                          return !inline && match ? (
                            <CodeBlock
                              style={vscDarkPlus}
                              language={match[1]}
                              PreTag="div"
                              className="text-xs sm:text-sm my-2 rounded-lg overflow-hidden"
                              {...props}
                            >
                              {String(children).replace(/\n$/, '')}
                            </CodeBlock>
                          ) : (
                            <code className="bg-gray-100 text-teal-700 px-1.5 py-0.5 rounded text-xs sm:text-sm font-mono" {...props}>
                              {children}
                            </code>
                          );
                        },
                        ul: ({ children }) => <ul className="my-1 ml-4 space-y-0.5">{children}</ul>,
                        ol: ({ children }) => <ol className="my-1 ml-4 space-y-0.5">{children}</ol>,
                        li: ({ children }) => <li className="text-sm">{children}</li>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  )}
                </div>

                {/* WhatsApp-style timestamp and status */}
                <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${
                  message.role === 'user' ? 'text-white/70' : 'text-gray-500'
                }`}>
                  <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {message.role === 'user' && (
                    <FiCheck className="w-3 h-3" />
                  )}
                </div>

                {/* Subtle stats for assistant messages */}
                {message.role === 'assistant' && message.stats && (
                  <div className="text-xs text-gray-400 mt-1 italic">
                    {formatDuration(message.stats.total_duration)}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start animate-slideDown">
            <div className="bg-white rounded-lg rounded-tl-none px-3 py-2.5 shadow-sm border border-gray-200">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={() => scrollToBottom('smooth')}
          className="fixed bottom-20 sm:bottom-24 right-4 sm:right-8 bg-teal-600 text-white rounded-full p-3 shadow-lg hover:bg-teal-700 active:bg-teal-800 transition-all z-10 animate-fadeIn"
          aria-label="Scroll to bottom"
        >
          <FiChevronDown className="w-5 h-5" />
        </button>
      )}

      {/* WhatsApp-style Input Area - Fixed */}
      <form onSubmit={handleSubmit} className="px-2 sm:px-3 py-2 sm:py-2.5 bg-gray-100 border-t border-gray-200 flex-shrink-0 safe-bottom">
        <div className="flex items-end space-x-2 max-w-5xl mx-auto">
          <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-200 focus-within:border-teal-500 transition-all">
            <textarea
              ref={inputRef}
              value={prompt}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="w-full px-4 py-2.5 sm:py-3 bg-transparent focus:outline-none resize-none text-base rounded-3xl"
              rows={1}
              disabled={loading || !selectedModel}
              style={{
                maxHeight: '120px',
                minHeight: '44px',
                height: 'auto'
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !prompt.trim() || !selectedModel}
            className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-full hover:from-teal-600 hover:to-teal-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-md hover:shadow-lg flex-shrink-0"
            aria-label="Send message"
          >
            <FiSend className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
