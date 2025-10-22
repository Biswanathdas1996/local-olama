import { ModelManager } from '../components/ModelManager';

export function ModelsPage() {
  return (
    <div className="h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Models</h1>
        <p className="text-gray-600">Download and manage your local LLM models</p>
      </div>
      <ModelManager />
    </div>
  );
}
