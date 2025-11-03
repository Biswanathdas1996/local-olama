import axios, { AxiosInstance } from 'axios';
import type {
  HealthResponse,
  ModelsListResponse,
  ModelDownloadRequest,
  ModelDownloadResponse,
  ModelDeleteResponse,
  GenerateRequest,
  GenerateResponse,
  ErrorResponse,
  IngestionResponse,
  SearchResponse,
  IndicesResponse,
  TrainingRequest,
  TrainingResponse,
  TrainingStatus,
  TrainingJobsListResponse,
  TechniquesListResponse,
  ModelCreateResponse,
  DatasetFromTextRequest,
  DatasetUploadResponse,
  DatasetsListResponse,
  DatasetInfo,
  TrainingDataGenerationResponse,
  TrainingDataJob,
  TrainingDataJobsListResponse
} from '../types/api';

class ApiService {
  private client: AxiosInstance;
  private skipAuthClear: boolean = false;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 300000, // 5 minutes for large model operations
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.log('[ApiService] Response error:', {
          status: error.response?.status,
          url: error.config?.url,
          skipAuthClear: this.skipAuthClear
        });
        
        if (error.response?.status === 401 && !this.skipAuthClear) {
          console.log('[ApiService] 401 Unauthorized - checking if should clear auth');
          
          // Don't auto-logout if we're already on the login page
          const currentPath = window.location.pathname;
          if (currentPath === '/login') {
            console.log('[ApiService] Already on login page - not clearing auth');
          } else {
            // Check if token exists before clearing
            const hasToken = localStorage.getItem('auth_token');
            const hasUser = localStorage.getItem('auth_user');
            
            console.log('[ApiService] Current state:', { hasToken: !!hasToken, hasUser: !!hasUser, currentPath });
            
            // Only clear and redirect if NOT on /auth/me endpoint (which AuthContext handles)
            if (error.config?.url?.includes('/auth/me')) {
              console.log('[ApiService] 401 on /auth/me - AuthContext will handle this');
            } else {
              console.log('[ApiService] 401 Unauthorized - clearing auth and redirecting');
              localStorage.removeItem('auth_token');
              localStorage.removeItem('auth_user');
              window.location.href = '/login';
            }
          }
        } else if (error.response?.status === 401 && this.skipAuthClear) {
          console.log('[ApiService] 401 Unauthorized - but skipAuthClear is true, not clearing');
        }
        
        if (error.response?.data) {
          const errorData = error.response.data as ErrorResponse;
          throw new Error(errorData.message || 'An error occurred');
        }
        throw error;
      }
    );
  }

  // Method to disable auto-logout on 401 (for auth verification)
  setSkipAuthClear(skip: boolean): void {
    this.skipAuthClear = skip;
  }

  // Generic API methods for auth service
  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get<T>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put<T>(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url);
    return response.data;
  }

  // Health Check
  async checkHealth(): Promise<HealthResponse> {
    const response = await this.client.get<HealthResponse>('/health');
    return response.data;
  }

  // Server Info
  async getServerInfo(): Promise<{ hostname: string; ipv4: string; port: number; url: string }> {
    const response = await this.client.get('/server-info');
    return response.data;
  }

  // Models Management
  async listModels(): Promise<ModelsListResponse> {
    const response = await this.client.get<ModelsListResponse>('/models');
    return response.data;
  }

  async downloadModel(request: ModelDownloadRequest): Promise<ModelDownloadResponse> {
    const response = await this.client.post<ModelDownloadResponse>(
      '/models/download',
      request
    );
    return response.data;
  }

  async deleteModel(modelName: string): Promise<ModelDeleteResponse> {
    const response = await this.client.delete<ModelDeleteResponse>(
      `/models/${encodeURIComponent(modelName)}`
    );
    return response.data;
  }

  async getDownloadProgress(modelName: string): Promise<any> {
    const response = await this.client.get(
      `/models/download/${encodeURIComponent(modelName)}/progress`
    );
    return response.data;
  }

  async clearDownloadProgress(modelName: string): Promise<any> {
    const response = await this.client.delete(
      `/models/download/${encodeURIComponent(modelName)}/progress`
    );
    return response.data;
  }

  // Text Generation
  async generateText(request: GenerateRequest): Promise<GenerateResponse> {
    const response = await this.client.post<GenerateResponse>(
      '/generate',
      request
    );
    return response.data;
  }

  // Document Management / RAG
  async uploadDocument(file: File, indexName: string): Promise<IngestionResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('index_name', indexName);

    const response = await this.client.post<IngestionResponse>(
      '/rag/ingest-doc',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  async searchDocuments(
    query: string,
    indexName: string,
    topK: number = 5,
    searchType: 'hybrid' | 'semantic' | 'lexical' = 'hybrid'
  ): Promise<SearchResponse> {
    const response = await this.client.get<SearchResponse>('/rag/search', {
      params: { query, index_name: indexName, top_k: topK, search_type: searchType },
    });
    return response.data;
  }

  async listIndices(): Promise<IndicesResponse> {
    const response = await this.client.get<IndicesResponse>('/rag/indices');
    return response.data;
  }

  async deleteIndex(indexName: string): Promise<{ success: boolean; message: string }> {
    const response = await this.client.delete(`/rag/indices/${encodeURIComponent(indexName)}`);
    return response.data;
  }

  // Model Training
  async listTrainingTechniques(): Promise<TechniquesListResponse> {
    const response = await this.client.get<TechniquesListResponse>('/training/techniques');
    return response.data;
  }

  async startTraining(request: TrainingRequest): Promise<TrainingResponse> {
    // Training jobs run in background, but the initial setup might take time
    // Set a longer timeout for the initial response (10 minutes)
    const response = await this.client.post<TrainingResponse>('/training/start', request, {
      timeout: 600000, // 10 minutes
    });
    return response.data;
  }

  async listTrainingJobs(): Promise<TrainingJobsListResponse> {
    const response = await this.client.get<TrainingJobsListResponse>('/training/jobs');
    return response.data;
  }

  async getTrainingStatus(jobId: string): Promise<TrainingStatus> {
    const response = await this.client.get<TrainingStatus>(`/training/jobs/${jobId}`);
    return response.data;
  }

  async cancelTraining(jobId: string): Promise<{ status: string; message: string }> {
    const response = await this.client.post(`/training/jobs/${jobId}/cancel`);
    return response.data;
  }

  async createModelFromTraining(jobId: string, pushToOllama: boolean = false): Promise<ModelCreateResponse> {
    const response = await this.client.post<ModelCreateResponse>('/training/create-model', {
      job_id: jobId,
      push_to_ollama: pushToOllama
    });
    return response.data;
  }

  // Dataset Management
  async uploadDataset(
    file: File,
    datasetName: string,
    description?: string,
    textColumn: string = 'text'
  ): Promise<DatasetUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dataset_name', datasetName);
    if (description) {
      formData.append('description', description);
    }
    formData.append('text_column', textColumn);

    const response = await this.client.post<DatasetUploadResponse>(
      '/training/datasets/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  async createDatasetFromText(request: DatasetFromTextRequest): Promise<DatasetUploadResponse> {
    const response = await this.client.post<DatasetUploadResponse>(
      '/training/datasets/from-text',
      request
    );
    return response.data;
  }

  async listDatasets(): Promise<DatasetsListResponse> {
    const response = await this.client.get<DatasetsListResponse>('/training/datasets');
    return response.data;
  }

  async getDataset(datasetName: string): Promise<DatasetInfo> {
    const response = await this.client.get<DatasetInfo>(`/training/datasets/${datasetName}`);
    return response.data;
  }

  async deleteDataset(datasetName: string): Promise<{ success: boolean; message: string }> {
    const response = await this.client.delete(`/training/datasets/${datasetName}`);
    return response.data;
  }

  // Training Data Generation from PDF
  async generateTrainingDataFromPDF(
    file: File,
    model: string = 'llama2',
    maxSamples?: number,
    chunkSize: number = 500,
    chunkOverlap: number = 50
  ): Promise<TrainingDataGenerationResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', model);
    if (maxSamples) {
      formData.append('max_samples', maxSamples.toString());
    }
    formData.append('chunk_size', chunkSize.toString());
    formData.append('chunk_overlap', chunkOverlap.toString());

    const response = await this.client.post<TrainingDataGenerationResponse>(
      '/training/training-data/from-pdf',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 600000, // 10 minutes
      }
    );
    return response.data;
  }

  async getTrainingDataJobStatus(jobId: string): Promise<TrainingDataJob> {
    const response = await this.client.get<TrainingDataJob>(
      `/training/training-data/jobs/${jobId}`
    );
    return response.data;
  }

  async listTrainingDataJobs(): Promise<TrainingDataJobsListResponse> {
    const response = await this.client.get<TrainingDataJobsListResponse>(
      '/training/training-data/jobs'
    );
    return response.data;
  }

  async downloadTrainingData(jobId: string): Promise<Blob> {
    const response = await this.client.get(`/training/training-data/download/${jobId}`, {
      responseType: 'blob',
    });
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;
