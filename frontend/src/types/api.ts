// API Request Types
export interface GenerateRequest {
  model: string;
  prompt: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  repeat_penalty?: number;
  context?: number[];
  indices?: string[];
}

export interface ModelDownloadRequest {
  model_name: string;
}

// API Response Types
export interface HealthResponse {
  status: string;
  ollama_connected: boolean;
  timestamp: string;
  version: string;
}

export interface GenerateResponse {
  response: string;
  model: string;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export interface ModelInfo {
  name: string;
  modified_at?: string;
  size?: number;
  digest?: string;
  details?: Record<string, any>;
}

export interface ModelsListResponse {
  models: ModelInfo[];
  count: number;
}

export interface ModelDownloadResponse {
  status: string;
  model_name: string;
  message: string;
}

export interface ModelDeleteResponse {
  status: string;
  model_name: string;
  message: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  detail?: string;
}

// UI State Types
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
  stats?: {
    total_duration?: number;
    prompt_eval_count?: number;
    eval_count?: number;
  };
}

export interface GenerationOptions {
  max_tokens: number;
  temperature: number;
  top_p: number;
  top_k: number;
  repeat_penalty: number;
}

// RAG / Document Management Types
export interface IngestionRequest {
  file: File;
  index_name: string;
}

export interface IngestionResponse {
  success: boolean;
  message: string;
  index_name: string;
  chunks_created: number;
  filename: string;
}

export interface SearchResult {
  text: string;
  score: number;
  metadata: Record<string, any>;
  chunk_id: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total_results: number;
  search_type: string;
}

export interface IndexInfo {
  name: string;
  document_count: number;
  metadata: Record<string, any>;
}

export interface IndicesResponse {
  indices: IndexInfo[];
  total_indices: number;
}
