import axios from 'axios';

// Use relative URLs so requests go through Vite proxy
const API_BASE_URL = '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface UsageSummary {
  period_days: number;
  total_requests: number;
  total_tokens: number;
  avg_response_time: number;
  success_rate: number;
  rag_usage_rate: number;
  estimated_cost_savings: number;
  top_models: Array<{
    model: string;
    count: number;
  }>;
}

export interface ModelStatistics {
  model_name: string;
  total_requests: number;
  total_tokens: number;
  avg_response_time: number;
  success_rate: number;
  last_used?: string;
  total_errors: number;
  avg_prompt_length: number;
  avg_response_length: number;
  tokens_per_second: number;
  efficiency_score: number;
}

export interface DocumentInsight {
  document_id: string;
  filename: string;
  index_name: string;
  query_count: number;
  total_retrievals: number;
  avg_relevance_score: number;
  last_accessed?: string;
  upload_date?: string;
  chunk_count: number;
  avg_chunk_retrieval: number;
  retrieval_rate: number;
  queries_per_day: number;
}

export interface UsageTrends {
  daily_requests: Array<{
    date: string;
    requests: number;
  }>;
  hourly_pattern: Array<{
    hour: number;
    requests: number;
  }>;
  hourly_response_times?: Array<{
    hour: number;
    avg_response_time: number;
    request_count: number;
  }>;
  weekly_growth_rate: number;
  peak_hour: number;
  peak_hour_requests: number;
}

export interface BusinessReport {
  report_period_days: number;
  generated_at: string;
  executive_summary: {
    total_requests: number;
    total_tokens: number;
    avg_tokens_per_request: number;
    success_rate: number;
    total_cost_savings: number;
    monthly_projected_savings: number;
    roi_percentage: number;
  };
  cost_analysis: {
    local_hosting_cost_monthly: number;
    cloud_cost_comparisons: Record<string, number>;
    total_potential_cloud_cost: number;
    savings_percentage: number;
  };
  usage_metrics: UsageSummary;
  model_performance: ModelStatistics[];
  document_insights: DocumentInsight[];
  trends: UsageTrends;
  business_insights: string[];
  recommendations: string[];
}

export interface SystemHealth {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  gpu_usage: number;
  gpu_memory: number;
  active_requests: number;
  status: string;
}

export interface RealtimeMetrics {
  timestamp: string;
  requests_last_24h: number;
  tokens_last_24h: number;
  avg_response_time: number;
  success_rate: number;
  active_sessions: number;
  system_health: {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    status: string;
  };
}

class AnalyticsService {
  async getUsageSummary(days: number = 7): Promise<UsageSummary> {
    const response = await apiClient.get(`/analytics/summary?days=${days}`);
    return response.data;
  }

  async getModelStatistics(): Promise<ModelStatistics[]> {
    const response = await apiClient.get('/analytics/models');
    return response.data;
  }

  async getDocumentInsights(limit: number = 20): Promise<DocumentInsight[]> {
    const response = await apiClient.get(`/analytics/documents?limit=${limit}`);
    return response.data;
  }

  async getUsageTrends(days: number = 30): Promise<UsageTrends> {
    const response = await apiClient.get(`/analytics/trends?days=${days}`);
    return response.data;
  }

  async getBusinessReport(days: number = 30): Promise<BusinessReport> {
    const response = await apiClient.get(`/analytics/business-report?days=${days}`);
    return response.data;
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const response = await apiClient.get('/analytics/health');
    return response.data;
  }

  async getRealtimeMetrics(): Promise<RealtimeMetrics> {
    const response = await apiClient.get('/analytics/realtime');
    return response.data;
  }

  async exportData(format: 'json' | 'csv' = 'json', days: number = 30): Promise<Blob> {
    const response = await apiClient.get(`/analytics/export?format=${format}&days=${days}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async cleanupData(daysToKeep: number = 90): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/analytics/cleanup?days_to_keep=${daysToKeep}`);
    return response.data;
  }

  // Helper methods for data processing
  processModelData(models: ModelStatistics[]): Array<{
    model: string;
    count: number;
    percentage: number;
  }> {
    const totalRequests = models.reduce((sum, model) => sum + model.total_requests, 0);
    
    return models.map(model => ({
      model: model.model_name,
      count: model.total_requests,
      percentage: totalRequests > 0 ? Math.round((model.total_requests / totalRequests) * 100) : 0
    }));
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDuration(seconds: number): string {
    if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  }

  getHealthColor(status: string): string {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  getHealthBgColor(status: string): string {
    switch (status) {
      case 'healthy': return 'bg-green-50 border-green-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'critical': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  }
}

const analyticsService = new AnalyticsService();
export default analyticsService;