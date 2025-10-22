import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import type { ModelsListResponse, ModelInfo } from '../types/api';

export function useModels() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response: ModelsListResponse = await apiService.listModels();
      setModels(response.models);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch models');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const downloadModel = async (modelName: string) => {
    try {
      setError(null);
      await apiService.downloadModel({ model_name: modelName });
      // Refresh models list after download
      await fetchModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download model');
      throw err;
    }
  };

  const deleteModel = async (modelName: string) => {
    try {
      setError(null);
      await apiService.deleteModel(modelName);
      // Refresh models list after deletion
      await fetchModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete model');
      throw err;
    }
  };

  return {
    models,
    loading,
    error,
    fetchModels,
    downloadModel,
    deleteModel,
  };
}
