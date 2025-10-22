import { useState } from 'react';
import { Header } from './components/Header';
import { ChatInterface } from './components/ChatInterface';
import { ModelManager } from './components/ModelManager';
import { DocumentManager } from './components/DocumentManager';
import { FiMessageSquare, FiServer, FiBook } from 'react-icons/fi';

function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'models' | 'documents'>('chat');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-6">
        {/* Tab Navigation */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'chat'
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <FiMessageSquare className="w-5 h-5" />
            <span>Chat</span>
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'documents'
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <FiBook className="w-5 h-5" />
            <span>Documents</span>
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === 'models'
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <FiServer className="w-5 h-5" />
            <span>Models</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'chat' && <ChatInterface />}
        {activeTab === 'documents' && <DocumentManager />}
        {activeTab === 'models' && <ModelManager />}
      </div>

      {/* Footer */}
      <footer className="mt-12 py-6 text-center text-gray-600 text-sm border-t border-gray-200">
        <p>Local LLM Platform v1.0.0 - Powered by Ollama</p>
        <p className="mt-1">🔒 Fully Offline • 🚀 Fast & Private</p>
      </footer>
    </div>
  );
}

export default App;
