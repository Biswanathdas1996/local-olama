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
  IndicesResponse
} from '../types/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 300000, // 5 minutes for large model operations
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.data) {
          const errorData = error.response.data as ErrorResponse;
          throw new Error(errorData.message || 'An error occurred');
        }
        throw error;
      }
    );
  }

  // Health Check
  async checkHealth(): Promise<HealthResponse> {
    const response = await this.client.get<HealthResponse>('/health');
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
}

export const apiService = new ApiService();
