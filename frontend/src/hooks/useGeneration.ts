import { useState, useCallback } from 'react';
import { apiService } from '../services/api';
import type { GenerateRequest, Message } from '../types/api';

export function useGeneration() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<number[] | undefined>(undefined);

  const generateResponse = useCallback(async (
    model: string,
    prompt: string,
    options?: Partial<GenerateRequest>,
    indices?: string[]
  ) => {
    try {
      setLoading(true);
      setError(null);

      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: prompt,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Call API
      const request: GenerateRequest = {
        model,
        prompt,
        context,
        ...options,
        indices,
      };

      const response = await apiService.generateText(request);

      // Add assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        model: response.model,
        stats: {
          total_duration: response.total_duration,
          prompt_eval_count: response.prompt_eval_count,
          eval_count: response.eval_count,
        },
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Update context for multi-turn conversations
      if (response.context) {
        setContext(response.context);
      }

      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate response');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [context]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setContext(undefined);
    setError(null);
  }, []);

  return {
    messages,
    loading,
    error,
    generateResponse,
    clearMessages,
  };
}
