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
  output_format?: string;
  output_template?: string;
  // Search configuration
  search_top_k?: number;
  search_min_score?: number;
  search_type?: 'hybrid' | 'semantic' | 'lexical';
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

export interface SourceCitation {
  source_type: 'document' | 'model';
  source_name?: string;
  page_number?: number;
  relevance_score?: number;
  excerpt?: string;
}

export interface GenerateResponse {
  response: string;
  model: string;
  sources?: SourceCitation[];
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
  sources?: SourceCitation[];
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
  output_format?: string;
  output_template?: string;
  // Search configuration
  search_top_k?: number;
  search_min_score?: number;
  search_type?: 'hybrid' | 'semantic' | 'lexical';
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

// Model Training Types
export interface TrainingTechnique {
  name: string;
  description: string;
  memory_requirement: string;
  gpu_required: boolean;
  training_speed: string;
}

export interface TechniquesListResponse {
  techniques: TrainingTechnique[];
  total: number;
}

export interface LoRAConfig {
  r?: number;
  lora_alpha?: number;
  lora_dropout?: number;
  target_modules?: string[];
  use_qlora?: boolean;
}

export interface AdapterConfig {
  adapter_size?: number;
  adapter_type?: 'adapter' | 'prefix_tuning';
  prefix_length?: number;
}

export interface BitFitConfig {
  train_bias_only?: boolean;
  include_layer_norm?: boolean;
}

export interface TrainingDataConfig {
  dataset_name?: string;
  dataset_path?: string;
  text_column?: string;
  max_samples?: number;
  validation_split?: number;
}

export interface TrainingParameters {
  num_epochs?: number;
  batch_size?: number;
  learning_rate?: number;
  max_seq_length?: number;
  gradient_accumulation_steps?: number;
  warmup_steps?: number;
  logging_steps?: number;
  save_steps?: number;
  use_fp16?: boolean;
}

export interface TrainingRequest {
  base_model: string;
  new_model_name: string;
  technique: 'lora' | 'qlora' | 'adapter' | 'prefix_tuning' | 'bitfit';
  lora_config?: LoRAConfig;
  adapter_config?: AdapterConfig;
  bitfit_config?: BitFitConfig;
  data_config: TrainingDataConfig;
  training_params: TrainingParameters;
  description?: string;
}

export interface TrainingResponse {
  job_id: string;
  status: string;
  message: string;
  model_name: string;
}

export interface TrainingStatus {
  job_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  current_epoch?: number;
  total_epochs?: number;
  current_step?: number;
  total_steps?: number;
  loss?: number;
  learning_rate?: number;
  estimated_time_remaining?: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

export interface TrainingJobInfo {
  job_id: string;
  model_name: string;
  base_model: string;
  technique: string;
  status: string;
  progress: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface TrainingJobsListResponse {
  jobs: TrainingJobInfo[];
  total: number;
}

export interface ModelCreateRequest {
  job_id: string;
  push_to_ollama?: boolean;
}

export interface ModelCreateResponse {
  status: string;
  model_name: string;
  model_path: string;
  ollama_model?: string;
  message: string;
}

// Dataset Creation Types
export interface DatasetTextEntry {
  text: string;
  metadata?: Record<string, any>;
}

export interface DatasetFromTextRequest {
  dataset_name: string;
  entries: DatasetTextEntry[];
  description?: string;
  text_column?: string;
}

export interface DatasetUploadResponse {
  success: boolean;
  dataset_name: string;
  num_samples: number;
  message: string;
  dataset_path: string;
}

export interface DatasetInfo {
  name: string;
  description?: string;
  num_samples: number;
  text_column: string;
  created_at: string;
  file_path: string;
}

export interface DatasetsListResponse {
  datasets: DatasetInfo[];
  total: number;
}

// Training Data Generation from PDF
export interface TrainingDataGenerationRequest {
  file: File;
  model?: string;
  max_samples?: number;
  chunk_size?: number;
  chunk_overlap?: number;
}

export interface TrainingDataGenerationResponse {
  job_id: string;
  status: string;
  message: string;
  filename: string;
}

export interface TrainingDataJob {
  job_id: string;
  filename: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  created_at: string;
  model: string;
  total_samples: number;
  output_path?: string;
  completed_at?: string;
  error_message?: string;
}

export interface TrainingDataJobsListResponse {
  jobs: TrainingDataJob[];
  total: number;
}



