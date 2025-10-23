import { useState, useEffect } from 'react';
import { FiPlus, FiPlay, FiSave, FiTrash2, FiLoader } from 'react-icons/fi';
import { apiService } from '../services/api';
import type { IndexInfo } from '../types/api';

interface TemplateBox {
  id: string;
  prompt: string;
  response: string;
  size: 'small' | 'medium' | 'large' | 'xlarge';
  isGenerating: boolean;
}

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

  useEffect(() => {
    loadIndices();
    loadModels();
  }, []);

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

  return (
    <div className="space-y-6">
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
            onClick={exportTemplate}
            className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 font-medium"
          >
            <FiSave className="w-5 h-5" />
            <span>Export Template</span>
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
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Response
                </label>
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
