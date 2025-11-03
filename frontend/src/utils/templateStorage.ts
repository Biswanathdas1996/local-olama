// Template Storage Utility for localStorage management

export interface TemplateBox {
  id: string;
  prompt: string;
  response: string;
  size: 'small' | 'medium' | 'large' | 'xlarge';
  isGenerating: boolean;
}

export interface SavedTemplate {
  id: string;
  name: string;
  boxes: Omit<TemplateBox, 'isGenerating'>[];
  selectedIndices: string[];
  model: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'LLM-365_templates';
const ACTIVE_TEMPLATE_KEY = 'LLM-365_active_template';

class TemplateStorage {
  // Save a template to localStorage
  saveTemplate(template: Omit<SavedTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): SavedTemplate {
    const templates = this.getAllTemplates();
    const now = new Date().toISOString();
    
    const savedTemplate: SavedTemplate = {
      id: template.id || `template_${Date.now()}`,
      name: template.name,
      boxes: template.boxes.map(box => ({
        id: box.id,
        prompt: box.prompt,
        response: box.response,
        size: box.size,
        isGenerating: false,
      })),
      selectedIndices: template.selectedIndices,
      model: template.model,
      createdAt: template.id ? (templates.find(t => t.id === template.id)?.createdAt || now) : now,
      updatedAt: now,
    };

    const existingIndex = templates.findIndex(t => t.id === savedTemplate.id);
    if (existingIndex >= 0) {
      templates[existingIndex] = savedTemplate;
    } else {
      templates.push(savedTemplate);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    return savedTemplate;
  }

  // Get all saved templates
  getAllTemplates(): SavedTemplate[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to parse templates from localStorage:', error);
      return [];
    }
  }

  // Get a specific template by ID
  getTemplate(id: string): SavedTemplate | null {
    const templates = this.getAllTemplates();
    return templates.find(t => t.id === id) || null;
  }

  // Delete a template
  deleteTemplate(id: string): boolean {
    const templates = this.getAllTemplates();
    const filtered = templates.filter(t => t.id !== id);
    
    if (filtered.length === templates.length) {
      return false; // Template not found
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    
    // Clear active template if it was deleted
    const activeId = this.getActiveTemplateId();
    if (activeId === id) {
      this.setActiveTemplateId(null);
    }
    
    return true;
  }

  // Set active template ID
  setActiveTemplateId(id: string | null): void {
    if (id === null) {
      localStorage.removeItem(ACTIVE_TEMPLATE_KEY);
    } else {
      localStorage.setItem(ACTIVE_TEMPLATE_KEY, id);
    }
  }

  // Get active template ID
  getActiveTemplateId(): string | null {
    return localStorage.getItem(ACTIVE_TEMPLATE_KEY);
  }

  // Update response for a specific box in a template
  updateBoxResponse(templateId: string, boxId: string, response: string): boolean {
    const template = this.getTemplate(templateId);
    if (!template) return false;

    const boxIndex = template.boxes.findIndex(b => b.id === boxId);
    if (boxIndex < 0) return false;

    template.boxes[boxIndex].response = response;
    template.updatedAt = new Date().toISOString();

    const templates = this.getAllTemplates();
    const templateIndex = templates.findIndex(t => t.id === templateId);
    if (templateIndex < 0) return false;

    templates[templateIndex] = template;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    return true;
  }

  // Export template as JSON file
  exportTemplate(template: SavedTemplate): void {
    const blob = new Blob([JSON.stringify(template, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, '_')}_${template.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Import template from JSON file
  async importTemplate(file: File): Promise<SavedTemplate> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const template = JSON.parse(content) as SavedTemplate;
          
          // Generate new ID and timestamps for imported template
          const newTemplate: SavedTemplate = {
            ...template,
            id: `template_${Date.now()}`,
            name: `${template.name} (Imported)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          const saved = this.saveTemplate(newTemplate);
          resolve(saved);
        } catch (error) {
          reject(new Error('Failed to parse template file'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  // Clear all templates
  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACTIVE_TEMPLATE_KEY);
  }
}

export const templateStorage = new TemplateStorage();
