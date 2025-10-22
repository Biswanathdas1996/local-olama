import { ModelManager } from '../components/ModelManager';

export function ModelsPage() {
  return (
    <div className="h-full">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Models</h1>
        <p className="text-sm sm:text-base text-gray-600">Download and manage your local LLM models</p>
      </div>
      <ModelManager />
    </div>
  );
}
