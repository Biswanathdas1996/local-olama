import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../services/api';
import type { ModelsListResponse, ModelInfo } from '../types/api';

interface DownloadProgress {
  status: 'downloading' | 'completed' | 'failed' | 'initiated';
  progress: number;
  message: string;
  error?: string;
}

export function useModels() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, DownloadProgress>>({});
  const progressIntervalRef = useRef<Record<string, number>>({});

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
    
    // Cleanup progress intervals on unmount
    return () => {
      Object.values(progressIntervalRef.current).forEach(clearInterval);
    };
  }, [fetchModels]);

  const pollDownloadProgress = async (modelName: string) => {
    try {
      const progress = await apiService.getDownloadProgress(modelName);
      
      setDownloadProgress(prev => ({
        ...prev,
        [modelName]: progress
      }));
      
      // If download is complete or failed, stop polling
      if (progress.status === 'completed' || progress.status === 'failed') {
        if (progressIntervalRef.current[modelName]) {
          clearInterval(progressIntervalRef.current[modelName]);
          delete progressIntervalRef.current[modelName];
        }
        
        // Refresh models list if completed successfully
        if (progress.status === 'completed') {
          await fetchModels();
        }
        
        // Clear progress after a delay
        setTimeout(() => {
          setDownloadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[modelName];
            return newProgress;
          });
          apiService.clearDownloadProgress(modelName).catch(() => {});
        }, 3000);
      }
    } catch (err) {
      // If progress endpoint returns 404, the download might be complete
      console.error('Failed to poll progress:', err);
    }
  };

  const downloadModel = async (modelName: string) => {
    try {
      setError(null);
      
      // Initialize progress state
      setDownloadProgress(prev => ({
        ...prev,
        [modelName]: {
          status: 'downloading',
          progress: 0,
          message: 'Initiating download...'
        }
      }));
      
      await apiService.downloadModel({ model_name: modelName });
      
      // Start polling for progress
      const intervalId = setInterval(() => {
        pollDownloadProgress(modelName);
      }, 1000); // Poll every second
      
      progressIntervalRef.current[modelName] = intervalId;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download model');
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[modelName];
        return newProgress;
      });
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
    downloadProgress,
    fetchModels,
    downloadModel,
    deleteModel,
  };
}
