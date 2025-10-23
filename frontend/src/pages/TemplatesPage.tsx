import { useState, useEffect, useRef } from 'react';
import { FiPlus, FiPlay, FiSave, FiTrash2, FiLoader, FiEye, FiEdit2, FiCheck, FiX, FiUpload, FiDownload, FiList } from 'react-icons/fi';
import { apiService } from '../services/api';
import type { IndexInfo } from '../types/api';
import { HtmlPreviewModal } from '../components/HtmlPreviewModal';
import { templateStorage, type SavedTemplate, type TemplateBox } from '../utils/templateStorage';

const sizeClasses = {
  small: 'col-span-1 row-span-1',
  medium: 'col-span-2 row-span-1',
  large: 'col-span-2 row-span-2',
  xlarge: 'col-span-3 row-span-2',
};

export function TemplatesPage() {
  const [boxes, setBoxes] = useState<TemplateBox[]>([
    { id: '1', prompt: '', response: '', size: 'medium', isGenerating: false },
  ]);
  const [selectedIndices, setSelectedIndices] = useState<string[]>([]);
  const [availableIndices, setAvailableIndices] = useState<IndexInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [models, setModels] = useState<string[]>([]);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [templateName, setTemplateName] = useState('Untitled Template');
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [showTemplateList, setShowTemplateList] = useState(false);
  const [previewContent, setPreviewContent] = useState<{ content: string; title: string } | null>(null);
  const [editingBoxId, setEditingBoxId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadIndices();
    loadModels();
    loadSavedTemplates();
    loadActiveTemplate();
  }, []);

  const loadSavedTemplates = () => {
    const templates = templateStorage.getAllTemplates();
    setSavedTemplates(templates);
  };

  const loadActiveTemplate = () => {
    const activeId = templateStorage.getActiveTemplateId();
    if (activeId) {
      const template = templateStorage.getTemplate(activeId);
      if (template) {
        loadTemplate(template);
      }
    }
  };

  const loadIndices = async () => {
    try {
      const response = await apiService.listIndices();
      setAvailableIndices(response.indices);
    } catch (error) {
      console.error('Failed to load indices:', error);
    }
  };

  const loadModels = async () => {
    try {
      const response = await apiService.listModels();
      const modelNames = response.models.map((m) => m.name);
      setModels(modelNames);
      if (modelNames.length > 0) {
        setSelectedModel(modelNames[0]);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const addBox = (size: 'small' | 'medium' | 'large' | 'xlarge') => {
    const newBox: TemplateBox = {
      id: Date.now().toString(),
      prompt: '',
      response: '',
      size,
      isGenerating: false,
    };
    setBoxes([...boxes, newBox]);
  };

  const removeBox = (id: string) => {
    setBoxes(boxes.filter((box) => box.id !== id));
  };

  const updateBoxPrompt = (id: string, prompt: string) => {
    setBoxes(boxes.map((box) => (box.id === id ? { ...box, prompt } : box)));
  };

  const updateBoxSize = (id: string, size: 'small' | 'medium' | 'large' | 'xlarge') => {
    setBoxes(boxes.map((box) => (box.id === id ? { ...box, size } : box)));
  };

  const updateBoxResponse = (id: string, response: string) => {
    setBoxes(boxes.map((box) => (box.id === id ? { ...box, response } : box)));
  };

  const toggleIndex = (indexName: string) => {
    setSelectedIndices((prev) =>
      prev.includes(indexName)
        ? prev.filter((name) => name !== indexName)
        : [...prev, indexName]
    );
  };

  const generateForBox = async (boxId: string) => {
    // Use functional setState to avoid stale state issues
    setBoxes((prevBoxes) => {
      const box = prevBoxes.find((b) => b.id === boxId);
      if (!box || !box.prompt.trim() || !selectedModel) return prevBoxes;
      
      return prevBoxes.map((b) => (b.id === boxId ? { ...b, isGenerating: true } : b));
    });

    const box = boxes.find((b) => b.id === boxId);
    if (!box || !box.prompt.trim() || !selectedModel) return;

    try {
      const response = await apiService.generateText({
        model: selectedModel,
        prompt: box.prompt,
        indices: selectedIndices.length > 0 ? selectedIndices : undefined,
      });

      setBoxes((prevBoxes) =>
        prevBoxes.map((b) =>
          b.id === boxId
            ? { ...b, response: response.response, isGenerating: false }
            : b
        )
      );
    } catch (error) {
      console.error('Generation failed:', error);
      setBoxes((prevBoxes) =>
        prevBoxes.map((b) =>
          b.id === boxId
            ? { ...b, response: 'Error: Failed to generate content', isGenerating: false }
            : b
        )
      );
    }
  };

  const generateAll = async () => {
    if (!selectedModel) {
      alert('Please select a model first');
      return;
    }

    // Get current boxes snapshot
    const currentBoxes = boxes.filter((box) => box.prompt.trim());
    if (currentBoxes.length === 0) {
      alert('Please add prompts to at least one box');
      return;
    }

    setIsGeneratingAll(true);

    // Generate content for each box sequentially
    for (const box of currentBoxes) {
      await generateForBox(box.id);
    }

    setIsGeneratingAll(false);
  };

  const clearAll = () => {
    setBoxes(boxes.map((box) => ({ ...box, response: '' })));
  };

  const exportTemplate = () => {
    const template = {
      name: templateName,
      boxes: boxes.map((box) => ({
        id: box.id,
        prompt: box.prompt,
        response: box.response,
        size: box.size,
      })),
      selectedIndices,
      model: selectedModel,
    };

    const blob = new Blob([JSON.stringify(template, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${templateName.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // New template management functions
  const saveCurrentTemplate = () => {
    const template = templateStorage.saveTemplate({
      id: currentTemplateId || undefined,
      name: templateName,
      boxes: boxes.map(box => ({
        id: box.id,
        prompt: box.prompt,
        response: box.response,
        size: box.size,
        isGenerating: false,
      })),
      selectedIndices,
      model: selectedModel,
    });
    
    setCurrentTemplateId(template.id);
    templateStorage.setActiveTemplateId(template.id);
    loadSavedTemplates();
    alert('Template saved successfully!');
  };

  const loadTemplate = (template: SavedTemplate) => {
    setTemplateName(template.name);
    setBoxes(template.boxes.map(box => ({ ...box, isGenerating: false })));
    setSelectedIndices(template.selectedIndices);
    setSelectedModel(template.model);
    setCurrentTemplateId(template.id);
    templateStorage.setActiveTemplateId(template.id);
    setShowTemplateList(false);
  };

  const createNewTemplate = () => {
    setTemplateName('Untitled Template');
    setBoxes([{ id: Date.now().toString(), prompt: '', response: '', size: 'medium', isGenerating: false }]);
    setSelectedIndices([]);
    setCurrentTemplateId(null);
    templateStorage.setActiveTemplateId(null);
  };

  const deleteTemplate = (templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      templateStorage.deleteTemplate(templateId);
      loadSavedTemplates();
      if (currentTemplateId === templateId) {
        createNewTemplate();
      }
    }
  };

  const handleImportTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const template = await templateStorage.importTemplate(file);
      loadTemplate(template);
      loadSavedTemplates();
      alert('Template imported successfully!');
    } catch (error) {
      alert('Failed to import template: ' + (error as Error).message);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openHtmlPreview = (boxId: string) => {
    const box = boxes.find(b => b.id === boxId);
    if (box && box.response) {
      setPreviewContent({
        content: box.response,
        title: `Preview: ${box.prompt.slice(0, 50)}${box.prompt.length > 50 ? '...' : ''}`,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportTemplate}
        className="hidden"
      />

      {/* HTML Preview Modal */}
      {previewContent && (
        <HtmlPreviewModal
          isOpen={!!previewContent}
          onClose={() => setPreviewContent(null)}
          content={previewContent.content}
          title={previewContent.title}
        />
      )}

      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="text-2xl font-bold text-gray-900 bg-transparent border-b-2 border-transparent hover:border-blue-300 focus:border-blue-500 focus:outline-none transition-colors w-full"
              placeholder="Template Name"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={createNewTemplate}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2 text-sm"
              title="New Template"
            >
              <FiPlus className="w-4 h-4" />
              <span>New</span>
            </button>
            <button
              onClick={() => setShowTemplateList(!showTemplateList)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 text-sm"
              title="View Saved Templates"
            >
              <FiList className="w-4 h-4" />
              <span>Templates ({savedTemplates.length})</span>
            </button>
            <button
              onClick={saveCurrentTemplate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 text-sm"
              title="Save Current Template"
            >
              <FiSave className="w-4 h-4" />
              <span>Save</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 text-sm"
              title="Import Template"
            >
              <FiUpload className="w-4 h-4" />
              <span>Import</span>
            </button>
            <button
              onClick={exportTemplate}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 text-sm"
              title="Export Template"
            >
              <FiDownload className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Saved Templates List */}
      {showTemplateList && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Saved Templates</h3>
            <button
              onClick={() => setShowTemplateList(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiX className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          
          {savedTemplates.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No saved templates yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`p-4 border-2 rounded-lg transition-all cursor-pointer ${
                    currentTemplateId === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1" onClick={() => loadTemplate(template)}>
                      <h4 className="font-semibold text-gray-900 truncate">{template.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {template.boxes.length} boxes • {template.model}
                      </p>
                      <p className="text-xs text-gray-400">
                        Updated: {new Date(template.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTemplate(template.id);
                      }}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors ml-2"
                      title="Delete template"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {currentTemplateId === template.id && (
                    <div className="mt-2 flex items-center text-xs text-blue-600">
                      <FiCheck className="w-3 h-3 mr-1" />
                      <span>Currently Active</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Box Buttons */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Template Box</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => addBox('small')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 text-sm"
          >
            <FiPlus className="w-4 h-4" />
            <span>Small</span>
          </button>
          <button
            onClick={() => addBox('medium')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 text-sm"
          >
            <FiPlus className="w-4 h-4" />
            <span>Medium</span>
          </button>
          <button
            onClick={() => addBox('large')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 text-sm"
          >
            <FiPlus className="w-4 h-4" />
            <span>Large</span>
          </button>
          <button
            onClick={() => addBox('xlarge')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 text-sm"
          >
            <FiPlus className="w-4 h-4" />
            <span>XLarge</span>
          </button>
        </div>
      </div>

      {/* Configuration Panel */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>

          {/* Indices Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Knowledge Indices (Optional)
            </label>
            <div className="border border-gray-300 rounded-lg p-3 max-h-32 overflow-y-auto">
              {availableIndices.length === 0 ? (
                <p className="text-sm text-gray-500">No indices available</p>
              ) : (
                <div className="space-y-2">
                  {availableIndices.map((index) => (
                    <label key={index.name} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedIndices.includes(index.name)}
                        onChange={() => toggleIndex(index.name)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        {index.name} ({index.document_count} docs)
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={generateAll}
            disabled={isGeneratingAll}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center space-x-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingAll ? (
              <>
                <FiLoader className="w-5 h-5 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <FiPlay className="w-5 h-5" />
                <span>Generate All</span>
              </>
            )}
          </button>
          
          <button
            onClick={clearAll}
            className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 font-medium"
          >
            <FiTrash2 className="w-5 h-5" />
            <span>Clear Responses</span>
          </button>

          <button
            onClick={saveCurrentTemplate}
            className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 font-medium"
          >
            <FiSave className="w-5 h-5" />
            <span>Save to Storage</span>
          </button>
        </div>
      </div>

      {/* Template Grid */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Template Boxes</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-auto">
          {boxes.map((box) => (
            <div
              key={box.id}
              className={`${sizeClasses[box.size]} bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-all p-4 flex flex-col`}
            >
              {/* Box Header */}
              <div className="flex items-center justify-between mb-3">
                <select
                  value={box.size}
                  onChange={(e) => updateBoxSize(box.id, e.target.value as any)}
                  className="text-xs px-2 py-1 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="xlarge">XLarge</option>
                </select>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => generateForBox(box.id)}
                    disabled={box.isGenerating || !box.prompt.trim()}
                    className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Generate for this box"
                  >
                    {box.isGenerating ? (
                      <FiLoader className="w-4 h-4 animate-spin" />
                    ) : (
                      <FiPlay className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => removeBox(box.id)}
                    className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    title="Remove box"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Prompt Input */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Prompt
                </label>
                <textarea
                  value={box.prompt}
                  onChange={(e) => updateBoxPrompt(box.id, e.target.value)}
                  placeholder="Enter your prompt here..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                  rows={3}
                />
              </div>

              {/* Response Display */}
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-700">
                    Response
                  </label>
                  {box.response && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setEditingBoxId(editingBoxId === box.id ? null : box.id)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title={editingBoxId === box.id ? "View mode" : "Edit mode"}
                      >
                        {editingBoxId === box.id ? (
                          <FiEye className="w-3.5 h-3.5" />
                        ) : (
                          <FiEdit2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => openHtmlPreview(box.id)}
                        className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                        title="Preview as HTML"
                      >
                        <FiEye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {editingBoxId === box.id ? (
                  <textarea
                    value={box.response}
                    onChange={(e) => updateBoxResponse(box.id, e.target.value)}
                    className="w-full h-full border border-gray-300 rounded-lg p-3 text-sm text-gray-800 font-mono resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Response will appear here..."
                  />
                ) : (
                  <div className="h-full bg-white border border-gray-300 rounded-lg p-3 overflow-y-auto text-sm text-gray-800 whitespace-pre-wrap">
                    {box.isGenerating ? (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <FiLoader className="w-6 h-6 animate-spin" />
                      </div>
                    ) : box.response ? (
                      box.response
                    ) : (
                      <span className="text-gray-400 italic">No response yet</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {boxes.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No boxes yet. Click a button above to add one!</p>
          </div>
        )}
      </div>
    </div>
  );
}
