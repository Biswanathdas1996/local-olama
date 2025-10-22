import { useState, useRef, useEffect } from 'react';
import { FiSend, FiTrash2, FiSettings } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useGeneration } from '../hooks/useGeneration';
import { useModels } from '../hooks/useModels';
import { apiService } from '../services/api';
import type { GenerationOptions, IndexInfo } from '../types/api';

// Type-safe wrapper for SyntaxHighlighter to fix React 18 compatibility
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

  // Auto-select first model
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].name);
    }
  }, [models, selectedModel]);

  // Fetch available indices on mount
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

  // Auto-scroll to bottom
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
    <div className="bg-white rounded-lg shadow-md flex flex-col h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            className={`p-2 rounded-lg transition-colors ${
              showSettings ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100'
            }`}
            title="Settings"
          >
            <FiSettings className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={clearMessages}
          className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          disabled={loading}
        >
          <FiTrash2 />
          <span>Clear Chat</span>
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Tokens
              </label>
              <input
                type="number"
                value={options.max_tokens}
                onChange={(e) => setOptions({ ...options, max_tokens: parseInt(e.target.value) })}
                className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                min="1"
                max="100000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temperature
              </label>
              <input
                type="number"
                value={options.temperature}
                onChange={(e) => setOptions({ ...options, temperature: parseFloat(e.target.value) })}
                className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                min="0"
                max="2"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Top P
              </label>
              <input
                type="number"
                value={options.top_p}
                onChange={(e) => setOptions({ ...options, top_p: parseFloat(e.target.value) })}
                className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                min="0"
                max="1"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Top K
              </label>
              <input
                type="number"
                value={options.top_k}
                onChange={(e) => setOptions({ ...options, top_k: parseInt(e.target.value) })}
                className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                min="1"
                max="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Repeat Penalty
              </label>
              <input
                type="number"
                value={options.repeat_penalty}
                onChange={(e) => setOptions({ ...options, repeat_penalty: parseFloat(e.target.value) })}
                className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                min="0"
                max="2"
                step="0.1"
              />
            </div>
          </div>
          
          {/* RAG Index Selection */}
          <div className="border-t border-gray-300 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Indices (Optional - Enable RAG)
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
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedIndices.includes(index.name)
                        ? 'bg-primary-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {index.name} ({index.document_count})
                  </button>
                ))}
              </div>
            )}
            {selectedIndices.length > 0 && (
              <div className="mt-2 text-xs text-primary-600">
                ✓ {selectedIndices.length} index(es) selected - Responses will use relevant context from your documents
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {messages.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg font-medium mb-2">No messages yet</p>
            <p className="text-sm">Start a conversation with your local LLM!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <span className="font-semibold text-sm">
                    {message.role === 'user' ? 'You' : message.model || 'Assistant'}
                  </span>
                  <span className="text-xs opacity-70">
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
                  <div className="mt-2 pt-2 border-t border-opacity-20 border-gray-300 text-xs opacity-70">
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
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type your message here..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
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
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <FiSend />
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
