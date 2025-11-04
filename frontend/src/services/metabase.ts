import axios from 'axios';

// Use relative URLs so requests go through Vite proxy
const API_BASE_URL = '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Dataset {
  id: number;
  filename: string;
  original_filename: string;
  file_size: number;
  row_count: number;
  column_count: number;
  columns: string[];
  upload_date: string;
  status: string;
  file_path: string;
  sample_data?: any[];
}

export interface DatasetPreview {
  columns: string[];
  sample_rows: any[];
  total_rows: number;
}

export interface AIInsight {
  summary: string;
  key_findings: string[];
  data_quality: {
    completeness: number;
    consistency: number;
    accuracy: number;
  };
  recommendations: string[];
  generated_at: string;
}

export interface DashboardResponse {
  success: boolean;
  dataset_id: number;
  dashboard_id: number;
  dashboard_url: string;
  message: string;
}

export interface MetabaseStatus {
  status: string;
  url: string;
  version?: string;
  authenticated: boolean;
}

class MetabaseService {
  /**
   * Upload a dataset (Excel/CSV file)
   */
  async uploadDataset(file: File, onProgress?: (progress: number) => void): Promise<Dataset> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/metabase/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  }

  /**
   * Get all uploaded datasets
   */
  async getDatasets(): Promise<Dataset[]> {
    const response = await apiClient.get('/metabase/datasets');
    return response.data;
  }

  /**
   * Get a specific dataset by ID
   */
  async getDataset(datasetId: number): Promise<Dataset> {
    const response = await apiClient.get(`/metabase/datasets/${datasetId}`);
    return response.data;
  }

  /**
   * Get dataset preview (sample data)
   */
  async getDatasetPreview(datasetId: number, limit: number = 10): Promise<DatasetPreview> {
    try {
      const response = await apiClient.get(`/metabase/datasets/${datasetId}/preview?limit=${limit}`);
      
      // Validate response structure
      if (!response.data || !response.data.columns || !response.data.sample_rows) {
        throw new Error('Invalid preview data structure received from server');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to get dataset preview:', error);
      throw error;
    }
  }

  /**
   * Generate AI insights for a dataset
   */
  async generateInsights(datasetId: number): Promise<AIInsight> {
    try {
      const response = await apiClient.post(`/metabase/datasets/${datasetId}/generate-insights`);
      
      // Validate response structure
      if (!response.data || !response.data.summary) {
        throw new Error('Invalid insights data structure received from server');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Failed to generate insights:', error);
      
      // Provide more helpful error messages
      if (error.response?.status === 500) {
        throw new Error('Server error while generating insights. Make sure Ollama is running.');
      } else if (error.response?.status === 404) {
        throw new Error('Dataset not found');
      }
      
      throw error;
    }
  }

  /**
   * Create a Metabase dashboard for a dataset
   */
  async createDashboard(datasetId: number): Promise<DashboardResponse> {
    const response = await apiClient.post(`/metabase/datasets/${datasetId}/create-dashboard`);
    return response.data;
  }

  /**
   * Delete a dataset
   */
  async deleteDataset(datasetId: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/metabase/datasets/${datasetId}`);
    return response.data;
  }

  /**
   * Check Metabase server status
   */
  async checkStatus(): Promise<MetabaseStatus> {
    const response = await apiClient.get('/metabase/status');
    return response.data;
  }

  /**
   * Get dashboard URL for a dataset
   * Fetches the actual dashboard URL from the backend
   */
  async getDashboardUrl(datasetId: number): Promise<string> {
    const response = await apiClient.get(`/metabase/datasets/${datasetId}/dashboard-url`);
    // Use direct Metabase URL for better compatibility
    return response.data.dashboard_url;
  }

  // Helper methods
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'ready':
      case 'healthy':
        return 'text-green-600';
      case 'processing':
      case 'uploading':
        return 'text-yellow-600';
      case 'error':
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  }

  getStatusBgColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'ready':
      case 'healthy':
        return 'bg-green-100';
      case 'processing':
      case 'uploading':
        return 'bg-yellow-100';
      case 'error':
      case 'failed':
        return 'bg-red-100';
      default:
        return 'bg-gray-100';
    }
  }

  isValidFileType(file: File): boolean {
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/csv',
    ];
    return validTypes.includes(file.type) || 
           file.name.endsWith('.xlsx') || 
           file.name.endsWith('.xls') || 
           file.name.endsWith('.csv');
  }

  getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }
}

const metabaseService = new MetabaseService();
export default metabaseService;
