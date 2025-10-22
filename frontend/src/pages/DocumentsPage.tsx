import { DocumentManager } from '../components/DocumentManager';

export function DocumentsPage() {
  return (
    <div className="h-full">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Documents</h1>
        <p className="text-sm sm:text-base text-gray-600">Bring Your Own Data - Upload and manage documents for RAG</p>
      </div>
      <DocumentManager />
    </div>
  );
}
