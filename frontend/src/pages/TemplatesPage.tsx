import { useState, useEffect, useRef } from 'react';
import { FiPlus, FiPlay, FiSave, FiTrash2, FiLoader, FiEye, FiEdit2, FiCheck, FiUpload, FiDownload, FiFileText, FiSettings, FiGrid, FiMaximize2, FiMinimize2, FiBookmark } from 'react-icons/fi';
import { apiService } from '../services/api';
import type { IndexInfo } from '../types/api';
import { HtmlPreviewModal } from '../components/HtmlPreviewModal';
import { templateStorage, type SavedTemplate, type TemplateBox } from '../utils/templateStorage';
// @ts-ignore - html2pdf.js doesn't have perfect types
import html2pdf from 'html2pdf.js';
import { useNavigate } from 'react-router-dom';

const sizeClasses = {
  small: 'col-span-1 row-span-1 min-h-[200px]',
  medium: 'col-span-1 md:col-span-2 row-span-1 min-h-[200px]',
  large: 'col-span-1 md:col-span-2 row-span-2 min-h-[400px]',
  xlarge: 'col-span-1 md:col-span-2 lg:col-span-3 row-span-2 min-h-[400px]',
};

export function TemplatesPage() {
  const navigate = useNavigate();
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
  const [previewContent, setPreviewContent] = useState<{ content: string; title: string } | null>(null);
  const [editingBoxId, setEditingBoxId] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [compactMode, setCompactMode] = useState(true);
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

  const exportToPDF = async () => {
    try {
      console.log('Starting PDF export...');
      
      // Validate html2pdf is available
      if (typeof html2pdf !== 'function') {
        console.error('html2pdf is not loaded correctly');
        alert('PDF library not loaded. Please refresh the page and try again.');
        return;
      }

      // Show loading indicator
      const loadingMsg = document.createElement('div');
      loadingMsg.id = 'pdf-loading';
      loadingMsg.style.position = 'fixed';
      loadingMsg.style.top = '50%';
      loadingMsg.style.left = '50%';
      loadingMsg.style.transform = 'translate(-50%, -50%)';
      loadingMsg.style.padding = '20px 40px';
      loadingMsg.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      loadingMsg.style.color = 'white';
      loadingMsg.style.borderRadius = '8px';
      loadingMsg.style.zIndex = '10000';
      loadingMsg.style.fontSize = '16px';
      loadingMsg.style.fontWeight = 'bold';
      loadingMsg.textContent = 'Generating PDF...';
      document.body.appendChild(loadingMsg);

      // Create a container optimized for PDF rendering
      const pdfContainer = document.createElement('div');
      pdfContainer.id = 'pdf-export-container';
      pdfContainer.style.position = 'fixed';
      pdfContainer.style.top = '0';
      pdfContainer.style.left = '0';
      pdfContainer.style.width = '794px'; // A4 width in pixels (210mm at 96 DPI)
      pdfContainer.style.minHeight = '1123px'; // A4 height in pixels (297mm at 96 DPI)
      pdfContainer.style.padding = '60px';
      pdfContainer.style.backgroundColor = '#ffffff';
      pdfContainer.style.fontFamily = "'Segoe UI', Arial, sans-serif";
      pdfContainer.style.color = '#000000';
      pdfContainer.style.boxSizing = 'border-box';
      pdfContainer.style.zIndex = '9999';
      pdfContainer.style.overflow = 'auto';
      
      // Create header with template information
      const headerDiv = document.createElement('div');
      headerDiv.style.marginBottom = '30px';
      headerDiv.style.paddingBottom = '20px';
      headerDiv.style.borderBottom = '3px solid #3B82F6';
      
      const title = document.createElement('h1');
      title.style.fontSize = '28px';
      title.style.fontWeight = 'bold';
      title.style.color = '#1F2937';
      title.style.margin = '0 0 8px 0';
      title.style.lineHeight = '1.2';
      title.textContent = templateName;
      headerDiv.appendChild(title);
      
      const metadata = document.createElement('div');
      metadata.style.fontSize = '11px';
      metadata.style.color = '#6B7280';
      metadata.style.lineHeight = '1.5';
      
      const metadataItems = [];
      metadataItems.push(`<strong>Model:</strong> ${selectedModel}`);
      if (selectedIndices.length > 0) {
        metadataItems.push(`<strong>Indices:</strong> ${selectedIndices.join(', ')}`);
      }
      metadataItems.push(`<strong>Generated:</strong> ${new Date().toLocaleString()}`);
      metadataItems.push(`<strong>Total Boxes:</strong> ${boxes.length}`);
      
      metadata.innerHTML = metadataItems.join(' &nbsp;|&nbsp; ');
      headerDiv.appendChild(metadata);
      pdfContainer.appendChild(headerDiv);

      // Create content area with all boxes
      const contentDiv = document.createElement('div');
      contentDiv.style.width = '100%';
      
      // Sort boxes for better PDF flow (optional - maintains order)
      const sortedBoxes = [...boxes];
      
      // Render each box sequentially for better PDF layout
      sortedBoxes.forEach((box, index) => {
        const boxContainer = document.createElement('div');
        boxContainer.style.marginBottom = '20px';
        boxContainer.style.pageBreakInside = 'avoid';
        boxContainer.style.border = '2px solid #E5E7EB';
        boxContainer.style.borderRadius = '6px';
        boxContainer.style.padding = '15px';
        boxContainer.style.backgroundColor = '#FAFAFA';
        boxContainer.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        
        // Box number and size badge
        const boxHeader = document.createElement('div');
        boxHeader.style.display = 'flex';
        boxHeader.style.justifyContent = 'space-between';
        boxHeader.style.alignItems = 'center';
        boxHeader.style.marginBottom = '12px';
        boxHeader.style.paddingBottom = '8px';
        boxHeader.style.borderBottom = '1px solid #D1D5DB';
        
        const boxNumber = document.createElement('span');
        boxNumber.style.fontSize = '12px';
        boxNumber.style.fontWeight = 'bold';
        boxNumber.style.color = '#374151';
        boxNumber.textContent = `Box ${index + 1}`;
        boxHeader.appendChild(boxNumber);
        
        const sizeBadge = document.createElement('span');
        sizeBadge.style.fontSize = '10px';
        sizeBadge.style.fontWeight = '600';
        sizeBadge.style.padding = '3px 8px';
        sizeBadge.style.borderRadius = '4px';
        sizeBadge.style.backgroundColor = '#E0E7FF';
        sizeBadge.style.color = '#4338CA';
        sizeBadge.style.textTransform = 'uppercase';
        sizeBadge.textContent = box.size;
        boxHeader.appendChild(sizeBadge);
        
        boxContainer.appendChild(boxHeader);
        
        // Prompt section with better formatting
        if (box.prompt.trim()) {
          const promptSection = document.createElement('div');
          promptSection.style.marginBottom = '12px';
          
          const promptLabel = document.createElement('div');
          promptLabel.style.fontSize = '12px';
          promptLabel.style.fontWeight = '700';
          promptLabel.style.color = '#374151';
          promptLabel.style.marginBottom = '6px';
          promptLabel.textContent = 'Prompt';
          promptSection.appendChild(promptLabel);
          
          const promptContent = document.createElement('div');
          promptContent.style.fontSize = '11px';
          promptContent.style.lineHeight = '1.6';
          promptContent.style.color = '#1F2937';
          promptContent.style.padding = '12px';
          promptContent.style.backgroundColor = '#FFFFFF';
          promptContent.style.border = '1px solid #E5E7EB';
          promptContent.style.borderRadius = '4px';
          promptContent.style.whiteSpace = 'pre-wrap';
          promptContent.style.wordWrap = 'break-word';
          promptContent.textContent = box.prompt;
          promptSection.appendChild(promptContent);
          
          boxContainer.appendChild(promptSection);
        }
        
        // Response section with better formatting
        if (box.response.trim()) {
          const responseSection = document.createElement('div');
          
          const responseLabel = document.createElement('div');
          responseLabel.style.fontSize = '12px';
          responseLabel.style.fontWeight = '700';
          responseLabel.style.color = '#374151';
          responseLabel.style.marginBottom = '6px';
          responseLabel.textContent = 'Response';
          responseSection.appendChild(responseLabel);
          
          const responseContent = document.createElement('div');
          responseContent.style.fontSize = '11px';
          responseContent.style.lineHeight = '1.7';
          responseContent.style.color = '#1F2937';
          responseContent.style.padding = '12px';
          responseContent.style.backgroundColor = '#FFFFFF';
          responseContent.style.border = '1px solid #E5E7EB';
          responseContent.style.borderRadius = '4px';
          responseContent.style.whiteSpace = 'pre-wrap';
          responseContent.style.wordWrap = 'break-word';
          responseContent.style.minHeight = '60px';
          responseContent.textContent = box.response;
          responseSection.appendChild(responseContent);
          
          boxContainer.appendChild(responseSection);
        } else {
          // Empty response placeholder
          const emptyResponse = document.createElement('div');
          emptyResponse.style.fontSize = '11px';
          emptyResponse.style.color = '#9CA3AF';
          emptyResponse.style.fontStyle = 'italic';
          emptyResponse.style.padding = '12px';
          emptyResponse.style.backgroundColor = '#F9FAFB';
          emptyResponse.style.border = '1px dashed #D1D5DB';
          emptyResponse.style.borderRadius = '4px';
          emptyResponse.style.textAlign = 'center';
          emptyResponse.textContent = 'No response generated';
          boxContainer.appendChild(emptyResponse);
        }
        
        contentDiv.appendChild(boxContainer);
      });
      
      pdfContainer.appendChild(contentDiv);
      
      // Add footer
      const footerDiv = document.createElement('div');
      footerDiv.style.marginTop = '30px';
      footerDiv.style.paddingTop = '15px';
      footerDiv.style.borderTop = '1px solid #E5E7EB';
      footerDiv.style.fontSize = '9px';
      footerDiv.style.color = '#9CA3AF';
      footerDiv.style.textAlign = 'center';
      footerDiv.innerHTML = `Generated by Local LLM Template System | ${new Date().toLocaleDateString()}`;
      pdfContainer.appendChild(footerDiv);
      
      document.body.appendChild(pdfContainer);

      console.log('PDF container created with', boxes.length, 'boxes');

      // Wait for DOM to fully render
      await new Promise(resolve => setTimeout(resolve, 500));

      // Configure PDF options for best quality
      const opt = {
        margin: 10,
        filename: `${templateName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { 
          type: 'jpeg' as const, 
          quality: 0.95 
        },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: true,
          letterRendering: true,
          backgroundColor: '#ffffff',
          width: 794,
          height: pdfContainer.scrollHeight,
          windowWidth: 794,
          windowHeight: pdfContainer.scrollHeight,
          x: 0,
          y: 0,
        },
        jsPDF: { 
          unit: 'mm' as const, 
          format: 'a4' as const, 
          orientation: 'portrait' as const,
        },
      };

      console.log('Generating PDF with high-quality settings...');

      // Generate and save PDF
      await html2pdf().from(pdfContainer).set(opt).save();
      
      console.log('✅ PDF generated successfully!');
      
      // Clean up
      setTimeout(() => {
        if (document.body.contains(pdfContainer)) {
          document.body.removeChild(pdfContainer);
        }
        if (document.body.contains(loadingMsg)) {
          document.body.removeChild(loadingMsg);
        }
      }, 100);
      
      // Show success message
      const successMsg = document.createElement('div');
      successMsg.style.position = 'fixed';
      successMsg.style.top = '20px';
      successMsg.style.right = '20px';
      successMsg.style.padding = '15px 25px';
      successMsg.style.backgroundColor = '#10B981';
      successMsg.style.color = 'white';
      successMsg.style.borderRadius = '8px';
      successMsg.style.zIndex = '10000';
      successMsg.style.fontSize = '14px';
      successMsg.style.fontWeight = 'bold';
      successMsg.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
      successMsg.textContent = '✓ PDF exported successfully!';
      document.body.appendChild(successMsg);
      
      setTimeout(() => {
        if (document.body.contains(successMsg)) {
          document.body.removeChild(successMsg);
        }
      }, 3000);
      
    } catch (error) {
      console.error('❌ Failed to export PDF:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      // Clean up on error
      const container = document.getElementById('pdf-export-container');
      if (container && document.body.contains(container)) {
        document.body.removeChild(container);
      }
      
      const loading = document.getElementById('pdf-loading');
      if (loading && document.body.contains(loading)) {
        document.body.removeChild(loading);
      }
      
      alert(`Failed to export PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Please check the browser console for details.`);
    }
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
  };

  const createNewTemplate = () => {
    setTemplateName('Untitled Template');
    setBoxes([{ id: Date.now().toString(), prompt: '', response: '', size: 'medium', isGenerating: false }]);
    setSelectedIndices([]);
    setCurrentTemplateId(null);
    templateStorage.setActiveTemplateId(null);
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
    <div className="h-full flex flex-col space-y-3 p-4">
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

      {/* Compact Header Bar */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-lg shadow-xl p-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Template Name */}
          <div className="flex items-center gap-3 flex-1 min-w-[200px]">
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="text-lg font-bold bg-white/20 text-white placeholder-white/70 border-2 border-white/30 hover:border-white/50 focus:border-white focus:outline-none transition-all px-3 py-1.5 rounded-lg backdrop-blur-sm"
              placeholder="Template Name"
            />
            {currentTemplateId && (
              <span className="px-2 py-1 bg-green-500/30 text-white text-xs font-semibold rounded-full border border-green-300/50 flex items-center gap-1">
                <FiCheck className="w-3 h-3" />
                Saved
              </span>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={createNewTemplate}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium backdrop-blur-sm border border-white/30"
              title="New Template"
            >
              <FiPlus className="w-4 h-4" />
              <span className="hidden sm:inline">New</span>
            </button>
            <button
              onClick={() => navigate('/saved-templates')}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium backdrop-blur-sm border border-white/30"
              title="View Saved Templates"
            >
              <FiBookmark className="w-4 h-4" />
              <span className="hidden sm:inline">Saved</span>
              <span className="px-1.5 py-0.5 bg-white/30 rounded text-xs">{savedTemplates.length}</span>
            </button>
            <button
              onClick={saveCurrentTemplate}
              className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium shadow-lg"
              title="Save"
            >
              <FiSave className="w-4 h-4" />
              <span className="hidden sm:inline">Save</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium backdrop-blur-sm border border-white/30"
              title="Import"
            >
              <FiUpload className="w-4 h-4" />
            </button>
            <button
              onClick={exportTemplate}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium backdrop-blur-sm border border-white/30"
              title="Export JSON"
            >
              <FiDownload className="w-4 h-4" />
            </button>
            <button
              onClick={exportToPDF}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium backdrop-blur-sm border border-white/30"
              title="Export PDF"
            >
              <FiFileText className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className={`px-3 py-1.5 ${showConfig ? 'bg-white/30' : 'bg-white/20'} hover:bg-white/30 text-white rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium backdrop-blur-sm border border-white/30`}
              title="Configuration"
            >
              <FiSettings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Configuration Panel - Collapsible */}
      {showConfig && (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden animate-slideDown">
          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <FiSettings className="w-4 h-4" />
              Configuration
            </h3>
          </div>
          
          <div className="p-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Model Selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Knowledge Indices (Optional)
              </label>
              <div className="border border-gray-300 rounded-lg p-2 max-h-24 overflow-y-auto bg-gray-50">
                {availableIndices.length === 0 ? (
                  <p className="text-xs text-gray-500">No indices available</p>
                ) : (
                  <div className="space-y-1.5">
                    {availableIndices.map((index) => (
                      <label key={index.name} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedIndices.includes(index.name)}
                          onChange={() => toggleIndex(index.name)}
                          className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-700 flex-1">
                          {index.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {index.document_count}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions Toolbar */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Add Box Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600 hidden sm:inline">Add Box:</span>
            <button
              onClick={() => addBox('small')}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all flex items-center gap-1.5 text-xs font-medium shadow-sm"
              title="Add Small Box"
            >
              <FiPlus className="w-3.5 h-3.5" />
              <span>S</span>
            </button>
            <button
              onClick={() => addBox('medium')}
              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all flex items-center gap-1.5 text-xs font-medium shadow-sm"
              title="Add Medium Box"
            >
              <FiPlus className="w-3.5 h-3.5" />
              <span>M</span>
            </button>
            <button
              onClick={() => addBox('large')}
              className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-all flex items-center gap-1.5 text-xs font-medium shadow-sm"
              title="Add Large Box"
            >
              <FiPlus className="w-3.5 h-3.5" />
              <span>L</span>
            </button>
            <button
              onClick={() => addBox('xlarge')}
              className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-all flex items-center gap-1.5 text-xs font-medium shadow-sm"
              title="Add XLarge Box"
            >
              <FiPlus className="w-3.5 h-3.5" />
              <span>XL</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={generateAll}
              disabled={isGeneratingAll}
              className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingAll ? (
                <>
                  <FiLoader className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <FiPlay className="w-4 h-4" />
                  <span>Generate All</span>
                </>
              )}
            </button>
            
            <button
              onClick={clearAll}
              className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium shadow-sm"
              title="Clear All Responses"
            >
              <FiTrash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clear</span>
            </button>

            <button
              onClick={() => setCompactMode(!compactMode)}
              className={`px-3 py-1.5 ${compactMode ? 'bg-gray-600' : 'bg-gray-500'} hover:bg-gray-700 text-white rounded-lg transition-all flex items-center gap-1.5 text-sm font-medium shadow-sm`}
              title={compactMode ? "Expand View" : "Compact View"}
            >
              {compactMode ? <FiMaximize2 className="w-4 h-4" /> : <FiMinimize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Template Grid - Scrollable */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-lg border border-gray-200 p-3">
        {boxes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <FiGrid className="w-16 h-16 mb-3 opacity-50" />
            <p className="text-lg font-medium">No boxes yet</p>
            <p className="text-sm">Click an "Add Box" button above to start</p>
          </div>
        ) : (
          <div className={`grid ${compactMode ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'} gap-3 auto-rows-auto`}>
            {boxes.map((box) => (
              <div
                key={box.id}
                className={`${sizeClasses[box.size]} bg-white rounded-lg border-2 ${
                  box.isGenerating ? 'border-blue-400 shadow-lg shadow-blue-100' : 'border-gray-200 hover:border-blue-300'
                } transition-all p-3 flex flex-col group hover:shadow-xl`}
              >
                {/* Compact Box Header */}
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <select
                      value={box.size}
                      onChange={(e) => updateBoxSize(box.id, e.target.value as any)}
                      className="text-xs px-2 py-1 border border-gray-200 rounded bg-gray-50 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                    >
                      <option value="small">S</option>
                      <option value="medium">M</option>
                      <option value="large">L</option>
                      <option value="xlarge">XL</option>
                    </select>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      box.isGenerating ? 'bg-blue-100 text-blue-700' :
                      box.response ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {box.isGenerating ? 'Generating...' : box.response ? 'Done' : 'Empty'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {box.response && (
                      <>
                        <button
                          onClick={() => setEditingBoxId(editingBoxId === box.id ? null : box.id)}
                          className={`p-1 ${editingBoxId === box.id ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100 hover:text-blue-600'} rounded transition-all`}
                          title={editingBoxId === box.id ? "View" : "Edit"}
                        >
                          {editingBoxId === box.id ? <FiEye className="w-3.5 h-3.5" /> : <FiEdit2 className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => openHtmlPreview(box.id)}
                          className="p-1 text-gray-400 hover:bg-purple-100 hover:text-purple-600 rounded transition-all"
                          title="Preview"
                        >
                          <FiEye className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => generateForBox(box.id)}
                      disabled={box.isGenerating || !box.prompt.trim()}
                      className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Generate"
                    >
                      {box.isGenerating ? (
                        <FiLoader className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FiPlay className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => removeBox(box.id)}
                      className="p-1 text-gray-400 hover:bg-red-100 hover:text-red-600 rounded transition-all"
                      title="Remove"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Prompt Input - Compact */}
                <div className="mb-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Prompt
                  </label>
                  <textarea
                    value={box.prompt}
                    onChange={(e) => updateBoxPrompt(box.id, e.target.value)}
                    placeholder="Enter prompt..."
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none text-xs bg-gray-50 transition-all"
                    rows={compactMode ? 2 : 3}
                  />
                </div>

                {/* Response Display - Compact */}
                <div className="flex-1 flex flex-col min-h-0">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Response
                  </label>
                  {editingBoxId === box.id ? (
                    <textarea
                      value={box.response}
                      onChange={(e) => updateBoxResponse(box.id, e.target.value)}
                      className="flex-1 w-full border border-gray-200 rounded-lg p-2 text-xs text-gray-800 font-mono resize-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
                      placeholder="Response will appear here..."
                    />
                  ) : (
                    <div className="flex-1 bg-white border border-gray-200 rounded-lg p-2 overflow-y-auto text-xs text-gray-800 whitespace-pre-wrap">
                      {box.isGenerating ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                          <FiLoader className="w-6 h-6 animate-spin mb-2" />
                          <span className="text-xs">Generating...</span>
                        </div>
                      ) : box.response ? (
                        <div className="leading-relaxed">{box.response}</div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">No response yet</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
