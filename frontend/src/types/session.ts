import type { SourceCitation } from './api';

export interface ChatSession {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  messages: StoredChatMessage[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
  sources?: SourceCitation[];
  stats?: {
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    eval_count?: number;
  };
}

// Internal storage format (timestamps as ISO strings)
export interface StoredChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string | Date;
  model?: string;
  sources?: SourceCitation[];
  stats?: {
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    eval_count?: number;
  };
}
