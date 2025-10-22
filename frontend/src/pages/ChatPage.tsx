import { ChatInterface } from '../components/ChatInterface';

export function ChatPage() {
  return (
    <div className="h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Chat</h1>
        <p className="text-gray-600">Interact with your local LLM models</p>
      </div>
      <ChatInterface />
    </div>
  );
}
