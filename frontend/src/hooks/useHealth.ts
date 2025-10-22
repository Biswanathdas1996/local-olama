import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import type { HealthResponse } from '../types/api';

export function useHealth() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiService.checkHealth();
        setHealth(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check health');
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  return { health, loading, error };
}
