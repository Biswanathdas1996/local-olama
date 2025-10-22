import { useState, useRef, useEffect } from 'react';
import { FiSend, FiTrash2, FiSettings, FiX } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useGeneration } from '../hooks/useGeneration';
import { useModels } from '../hooks/useModels';
import { apiService } from '../services/api';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [options, setOptions] = useState<GenerationOptions>({
    max_tokens: 2000,
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40,
    repeat_penalty: 1.1,
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !selectedModel || loading) return;

    const userPrompt = prompt;
    setPrompt('');

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

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 flex flex-col h-[calc(100vh-16rem)]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white rounded-t-2xl">
        <div className="flex items-center space-x-3">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm font-medium transition-all hover:border-gray-400"
            disabled={loading}
          >
            {models.length === 0 ? (
              <option value="">No models available</option>
            ) : (
              models.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.name}
                </option>
              ))
            )}
          </select>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2.5 rounded-xl transition-all ${
              showSettings 
                ? 'bg-blue-100 text-blue-600 shadow-inner' 
                : 'hover:bg-gray-100 text-gray-600'
            }`}
            title="Settings"
          >
            <FiSettings className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={clearMessages}
          className="flex items-center space-x-2 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all font-medium text-sm"
          disabled={loading}
        >
          <FiTrash2 className="w-4 h-4" />
          <span>Clear Chat</span>
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="px-6 py-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Generation Settings</h3>
            <button
              onClick={() => setShowSettings(false)}
              className="p-1 hover:bg-white/50 rounded-lg transition-colors"
            >
              <FiX className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Max Tokens
              </label>
              <input
                type="number"
                value={options.max_tokens}
                onChange={(e) => setOptions({ ...options, max_tokens: parseInt(e.target.value) })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="100000"
              />
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Temperature
              </label>
              <input
                type="number"
                value={options.temperature}
                onChange={(e) => setOptions({ ...options, temperature: parseFloat(e.target.value) })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="0"
                max="2"
                step="0.1"
              />
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Top P
              </label>
              <input
                type="number"
                value={options.top_p}
                onChange={(e) => setOptions({ ...options, top_p: parseFloat(e.target.value) })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="0"
                max="1"
                step="0.1"
              />
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Top K
              </label>
              <input
                type="number"
                value={options.top_k}
                onChange={(e) => setOptions({ ...options, top_k: parseInt(e.target.value) })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="100"
              />
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Repeat Penalty
              </label>
              <input
                type="number"
                value={options.repeat_penalty}
                onChange={(e) => setOptions({ ...options, repeat_penalty: parseFloat(e.target.value) })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="0"
                max="2"
                step="0.1"
              />
            </div>
          </div>
          
          {/* RAG Index Selection */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <label className="block text-xs font-semibold text-gray-900 mb-3">
              📚 Search Indices (Optional RAG)
            </label>
            {loadingIndices ? (
              <div className="text-sm text-gray-500">Loading indices...</div>
            ) : availableIndices.length === 0 ? (
              <div className="text-sm text-gray-500">No indices available. Upload documents to create indices.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableIndices.map((index) => (
                  <button
                    key={index.name}
                    onClick={() => toggleIndexSelection(index.name)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      selectedIndices.includes(index.name)
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                    }`}
                  >
                    {index.name} ({index.document_count})
                  </button>
                ))}
              </div>
            )}
            {selectedIndices.length > 0 && (
              <div className="mt-3 text-xs text-blue-600 font-medium bg-blue-50 px-3 py-2 rounded-lg">
                ✓ {selectedIndices.length} index(es) selected - Responses will use relevant context from your documents
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50/50 to-white">
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg shadow-sm">
            <p className="font-medium">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-block p-6 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl shadow-lg mb-4">
              <FiSend className="w-12 h-12 text-blue-600" />
            </div>
            <p className="text-xl font-semibold text-gray-900 mb-2">No messages yet</p>
            <p className="text-sm text-gray-500">Start a conversation with your local LLM!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-2xl p-4 shadow-md ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
                    : 'bg-white text-gray-800 border border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <span className="font-semibold text-sm">
                    {message.role === 'user' ? 'You' : message.model || 'Assistant'}
                  </span>
                  <span className={`text-xs ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="prose prose-sm max-w-none">
                  {message.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <ReactMarkdown
                      components={{
                        code({ node, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          const inline = !match;
                          return !inline && match ? (
                            <CodeBlock
                              style={vscDarkPlus}
                              language={match[1]}
                              PreTag="div"
                              {...props}
                            >
                              {String(children).replace(/\n$/, '')}
                            </CodeBlock>
                          ) : (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  )}
                </div>
                {message.stats && (
                  <div className={`mt-2 pt-2 border-t text-xs ${
                    message.role === 'user' ? 'border-blue-400 text-blue-100' : 'border-gray-200 text-gray-500'
                  }`}>
                    Duration: {formatDuration(message.stats.total_duration)} • 
                    Prompt: {message.stats.prompt_eval_count} tokens • 
                    Response: {message.stats.eval_count} tokens
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-md">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-6 border-t border-gray-200 bg-white rounded-b-2xl">
        <div className="flex space-x-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type your message here..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all"
            rows={3}
            disabled={loading || !selectedModel}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim() || !selectedModel}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2 font-medium shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
          >
            <FiSend className="w-5 h-5" />
            <span>Send</span>
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}
