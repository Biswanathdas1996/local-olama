import { useState, useEffect } from 'react';
import { FiTrash2, FiEdit2, FiDownload, FiUpload, FiSearch, FiGrid, FiList, FiClock, FiBox, FiX, FiFileText, FiPlay, FiCopy, FiEye } from 'react-icons/fi';
import { templateStorage, type SavedTemplate } from '../utils/templateStorage';
import { useNavigate } from 'react-router-dom';

type ViewMode = 'grid' | 'list';
type SortBy = 'updated' | 'created' | 'name' | 'boxes';

export function SavedTemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('updated');
  const [selectedTemplate, setSelectedTemplate] = useState<SavedTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    const allTemplates = templateStorage.getAllTemplates();
    setTemplates(allTemplates);
  };

  const filteredAndSortedTemplates = templates
    .filter(template => 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.model.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'boxes':
          return b.boxes.length - a.boxes.length;
        default:
          return 0;
      }
    });

  const deleteTemplate = (templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      templateStorage.deleteTemplate(templateId);
      loadTemplates();
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null);
        setShowPreview(false);
      }
    }
  };

  const loadTemplateInEditor = (template: SavedTemplate) => {
    templateStorage.setActiveTemplateId(template.id);
    navigate('/templates');
  };

  const duplicateTemplate = (template: SavedTemplate) => {
    const duplicated = templateStorage.saveTemplate({
      name: `${template.name} (Copy)`,
      boxes: template.boxes.map(box => ({
        ...box,
        id: Date.now().toString() + Math.random(),
        isGenerating: false,
      })),
      selectedIndices: template.selectedIndices,
      model: template.model,
    });
    loadTemplates();
    alert(`Template duplicated as "${duplicated.name}"`);
  };

  const exportTemplate = (template: SavedTemplate) => {
    const blob = new Blob([JSON.stringify(template, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const template = await templateStorage.importTemplate(file);
      loadTemplates();
      alert(`Template "${template.name}" imported successfully!`);
    } catch (error) {
      alert('Failed to import template: ' + (error as Error).message);
    }
    
    // Reset file input
    e.target.value = '';
  };

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes === 0 ? 'Just now' : `${minutes}m ago`;
      }
      return `${hours}h ago`;
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days}d ago`;
    } else {
      return d.toLocaleDateString();
    }
  };

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 rounded-lg shadow-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FiFileText className="w-6 h-6" />
              Saved Templates
            </h1>
            <p className="text-white/80 text-sm mt-1">
              {templates.length} template{templates.length !== 1 ? 's' : ''} saved
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all flex items-center gap-2 text-sm font-medium cursor-pointer backdrop-blur-sm border border-white/30">
              <FiUpload className="w-4 h-4" />
              <span>Import</span>
              <input
                type="file"
                accept=".json"
                onChange={importTemplate}
                className="hidden"
              />
            </label>
            <button
              onClick={() => navigate('/templates')}
              className="px-4 py-2 bg-white text-purple-600 hover:bg-gray-100 rounded-lg transition-all flex items-center gap-2 text-sm font-medium shadow-lg"
            >
              <FiEdit2 className="w-4 h-4" />
              <span>Create New</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[200px] max-w-md relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            >
              <option value="updated">Recently Updated</option>
              <option value="created">Recently Created</option>
              <option value="name">Name (A-Z)</option>
              <option value="boxes">Box Count</option>
            </select>

            {/* View Mode */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-all ${
                  viewMode === 'grid' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Grid View"
              >
                <FiGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-all ${
                  viewMode === 'list' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-700'
                }`}
                title="List View"
              >
                <FiList className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Templates Display */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-purple-50/30 rounded-lg border border-gray-200 p-4">
        {filteredAndSortedTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <FiFileText className="w-16 h-16 mb-3 opacity-50" />
            <p className="text-lg font-medium">
              {searchQuery ? 'No templates found' : 'No saved templates yet'}
            </p>
            <p className="text-sm">
              {searchQuery ? 'Try a different search term' : 'Create your first template to get started'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAndSortedTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-lg border-2 border-gray-200 hover:border-purple-400 transition-all shadow-sm hover:shadow-lg group"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate text-base mb-1">
                        {template.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <FiBox className="w-3 h-3" />
                        <span>{template.boxes.length} boxes</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <FiPlay className="w-3 h-3" />
                      <span className="truncate">{template.model.split(':')[0]}</span>
                    </div>
                    {template.selectedIndices.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <FiFileText className="w-3 h-3" />
                        <span className="truncate">{template.selectedIndices.length} indices</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <FiClock className="w-3 h-3" />
                      <span>{formatDate(template.updatedAt)}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => loadTemplateInEditor(template)}
                      className="flex-1 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center gap-1.5 text-xs font-medium shadow-sm"
                      title="Load in Editor"
                    >
                      <FiEdit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowPreview(true);
                      }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Preview"
                    >
                      <FiEye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => duplicateTemplate(template)}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                      title="Duplicate"
                    >
                      <FiCopy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => exportTemplate(template)}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      title="Export"
                    >
                      <FiDownload className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Delete"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAndSortedTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-lg border border-gray-200 hover:border-purple-400 transition-all p-4 shadow-sm hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-gray-900 text-base">
                        {template.name}
                      </h3>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                        {template.boxes.length} boxes
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <FiPlay className="w-3 h-3" />
                        {template.model.split(':')[0]}
                      </span>
                      {template.selectedIndices.length > 0 && (
                        <span className="flex items-center gap-1">
                          <FiFileText className="w-3 h-3" />
                          {template.selectedIndices.length} indices
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <FiClock className="w-3 h-3" />
                        {formatDate(template.updatedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadTemplateInEditor(template)}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all flex items-center gap-2 text-sm font-medium shadow-sm"
                    >
                      <FiEdit2 className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowPreview(true);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Preview"
                    >
                      <FiEye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => duplicateTemplate(template)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                      title="Duplicate"
                    >
                      <FiCopy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => exportTemplate(template)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      title="Export"
                    >
                      <FiDownload className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Delete"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col animate-scaleUp">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedTemplate.name}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedTemplate.boxes.length} boxes • {selectedTemplate.model}
                </p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {selectedTemplate.boxes.map((box, index) => (
                  <div key={box.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                        Box {index + 1}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        {box.size.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="mb-3">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Prompt
                      </label>
                      <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-800">
                        {box.prompt || <span className="text-gray-400 italic">No prompt</span>}
                      </div>
                    </div>

                    {box.response && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Response
                        </label>
                        <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-800 max-h-40 overflow-y-auto">
                          {box.response}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  loadTemplateInEditor(selectedTemplate);
                  setShowPreview(false);
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all flex items-center gap-2 font-medium"
              >
                <FiEdit2 className="w-4 h-4" />
                Edit Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
