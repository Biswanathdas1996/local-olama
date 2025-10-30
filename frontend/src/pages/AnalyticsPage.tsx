import { useState, useEffect } from 'react';
import { 
  FiActivity, 
  FiBarChart, 
  FiTrendingUp, 
  FiServer, 
  FiUsers, 
  FiFileText,
  FiDownload,
  FiRefreshCw,
  FiDollarSign,
  FiClock,
  FiCheckCircle,
  FiAlertTriangle,
  FiZap,
  FiTarget,
  FiTrendingDown
} from 'react-icons/fi';
import { UsageChart, ModelChart } from '../components/analytics/Charts';
import analyticsService from '../services/analytics';
import type { 
  UsageSummary, 
  ModelStatistics, 
  DocumentInsight, 
  UsageTrends, 
  SystemHealth, 
  RealtimeMetrics 
} from '../services/analytics';

export function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(7);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Data states
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [models, setModels] = useState<ModelStatistics[]>([]);
  const [documents, setDocuments] = useState<DocumentInsight[]>([]);
  const [trends, setTrends] = useState<UsageTrends | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics | null>(null);

  const loadAnalyticsData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setRefreshing(!showLoading);

      const [
        summaryData,
        modelsData,
        documentsData,
        trendsData,
        healthData,
        realtimeData
      ] = await Promise.all([
        analyticsService.getUsageSummary(selectedPeriod),
        analyticsService.getModelStatistics(),
        analyticsService.getDocumentInsights(10),
        analyticsService.getUsageTrends(selectedPeriod),
        analyticsService.getSystemHealth(),
        analyticsService.getRealtimeMetrics()
      ]);

      setSummary(summaryData);
      setModels(modelsData);
      setDocuments(documentsData);
      setTrends(trendsData);
      setSystemHealth(healthData);
      setRealtimeMetrics(realtimeData);
      setLastUpdate(new Date());
      
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadAnalyticsData(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedPeriod]);

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const blob = await analyticsService.exportData(format, selectedPeriod);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_${selectedPeriod}days.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const formatLastUpdate = () => {
    return lastUpdate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          {/* Modern Loading Animation */}
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="relative">
              {/* Animated Background Circles */}
              <div className="absolute inset-0 -m-8">
                <div className="w-16 h-16 bg-blue-400/20 rounded-full animate-ping"></div>
                <div className="w-16 h-16 bg-indigo-400/20 rounded-full animate-ping animation-delay-200"></div>
                <div className="w-16 h-16 bg-purple-400/20 rounded-full animate-ping animation-delay-400"></div>
              </div>
              
              {/* Central Loading Spinner */}
              <div className="relative z-10 flex flex-col items-center space-y-4">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Loading Analytics</h3>
                  <p className="text-sm text-gray-600">Gathering insights from your data...</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Skeleton Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-indigo-400/10 rounded-2xl blur-xl"></div>
                <div className="relative bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-6 shadow-lg">
                  <div className="animate-pulse">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-gray-300 rounded-lg"></div>
                      <div className="h-4 bg-gray-300 rounded w-24"></div>
                    </div>
                    <div className="h-8 bg-gray-300 rounded w-16 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-20"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Skeleton Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/5 to-indigo-400/5 rounded-2xl blur-xl"></div>
                <div className="relative bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-6 shadow-lg">
                  <div className="animate-pulse">
                    <div className="h-6 bg-gray-300 rounded w-32 mb-6"></div>
                    <div className="h-64 bg-gray-300 rounded-xl"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Modern Header with Glassmorphism */}
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-3xl blur-2xl"></div>
          <div className="relative bg-white/40 backdrop-blur-md border border-white/50 rounded-3xl p-8 shadow-2xl">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              {/* Header Content */}
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl blur-lg opacity-30"></div>
                  <div className="relative bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-2xl">
                    <FiBarChart className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
                    Analytics Dashboard
                  </h1>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <FiClock className="w-4 h-4" />
                    <span>Last updated: {formatLastUpdate()}</span>
                    <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                    <span className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Auto-refresh every 30s</span>
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Modern Controls */}
              <div className="flex items-center space-x-3">
                {/* Period Selector */}
                <div className="relative">
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                    className="appearance-none bg-white/70 backdrop-blur-sm border border-white/50 rounded-xl px-4 py-3 pr-10 text-sm font-medium text-gray-700 shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    <option value={1}>Last 24 hours</option>
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                  <FiClock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>

                {/* Refresh Button */}
                <button
                  onClick={() => loadAnalyticsData(false)}
                  disabled={refreshing}
                  className="group relative bg-white/70 backdrop-blur-sm border border-white/50 rounded-xl p-3 text-gray-600 hover:text-blue-600 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50"
                >
                  <FiRefreshCw className={`w-5 h-5 transition-transform duration-500 ${refreshing ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                </button>

                {/* Export Dropdown */}
                <div className="relative group">
                  <button className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 font-medium">
                    <FiDownload className="w-4 h-4" />
                    <span>Export</span>
                  </button>
                  <div className="absolute right-0 mt-2 w-40 bg-white/90 backdrop-blur-md border border-white/50 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    <button
                      onClick={() => handleExport('json')}
                      className="w-full px-4 py-3 text-left text-gray-700 hover:bg-blue-50/50 rounded-t-xl transition-colors"
                    >
                      Export JSON
                    </button>
                    <button
                      onClick={() => handleExport('csv')}
                      className="w-full px-4 py-3 text-left text-gray-700 hover:bg-blue-50/50 rounded-b-xl transition-colors"
                    >
                      Export CSV
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Total Requests Card */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative bg-white/70 backdrop-blur-md border border-white/50 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg">
                  <FiActivity className="w-6 h-6 text-white" />
                </div>
                {trends?.weekly_growth_rate && (
                  <div className={`flex items-center space-x-1 text-xs font-medium px-2 py-1 rounded-full ${
                    trends.weekly_growth_rate > 0 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {trends.weekly_growth_rate > 0 ? <FiTrendingUp className="w-3 h-3" /> : <FiTrendingDown className="w-3 h-3" />}
                    <span>{Math.abs(trends.weekly_growth_rate).toFixed(1)}%</span>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  {analyticsService.formatNumber(summary?.total_requests || 0)}
                </h3>
                <p className="text-sm text-gray-600 font-medium">Total Requests</p>
                <p className="text-xs text-gray-500 mt-1">vs last week</p>
              </div>
            </div>
          </div>

          {/* Total Tokens Card */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative bg-white/70 backdrop-blur-md border border-white/50 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg">
                  <FiBarChart className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  {analyticsService.formatNumber(summary?.total_tokens || 0)}
                </h3>
                <p className="text-sm text-gray-600 font-medium">Total Tokens</p>
                <p className="text-xs text-gray-500 mt-1">processed</p>
              </div>
            </div>
          </div>

          {/* Response Time Card */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative bg-white/70 backdrop-blur-md border border-white/50 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl shadow-lg">
                  <FiClock className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  {(summary?.avg_response_time || 0).toFixed(2)}s
                </h3>
                <p className="text-sm text-gray-600 font-medium">Avg Response Time</p>
                <p className="text-xs text-gray-500 mt-1">performance metric</p>
              </div>
            </div>
          </div>

          {/* Success Rate Card */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative bg-white/70 backdrop-blur-md border border-white/50 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl shadow-lg ${
                  summary?.success_rate && summary.success_rate >= 95 
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600' 
                    : 'bg-gradient-to-r from-red-500 to-red-600'
                }`}>
                  <FiCheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  {(summary?.success_rate || 0).toFixed(1)}%
                </h3>
                <p className="text-sm text-gray-600 font-medium">Success Rate</p>
                <p className="text-xs text-gray-500 mt-1">reliability metric</p>
              </div>
            </div>
          </div>
        </div>

      {/* Modern Business Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Cost Savings Card */}
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative bg-white/70 backdrop-blur-md border border-white/50 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg">
                <FiDollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {analyticsService.formatCurrency(summary?.estimated_cost_savings || 0)}
              </h3>
              <p className="text-sm text-gray-600 font-medium">Cost Savings</p>
              <p className="text-xs text-gray-500 mt-1">monthly estimate</p>
            </div>
          </div>
        </div>

        {/* RAG Usage Card */}
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative bg-white/70 backdrop-blur-md border border-white/50 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl shadow-lg">
                <FiFileText className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {(summary?.rag_usage_rate || 0).toFixed(1)}%
              </h3>
              <p className="text-sm text-gray-600 font-medium">RAG Usage</p>
              <p className="text-xs text-gray-500 mt-1">document retrieval rate</p>
            </div>
          </div>
        </div>

        {/* Active Sessions Card */}
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative bg-white/70 backdrop-blur-md border border-white/50 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl shadow-lg">
                <FiUsers className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {realtimeMetrics?.active_sessions || 0}
              </h3>
              <p className="text-sm text-gray-600 font-medium">Active Sessions</p>
              <p className="text-xs text-gray-500 mt-1">currently online</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modern System Health */}
      {systemHealth && (
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-3xl blur-3xl"></div>
          <div className={`relative bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-8 shadow-xl ${analyticsService.getHealthBgColor(systemHealth.status || 'unknown')}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <FiServer className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">System Health</h2>
              </div>
              <div className={`flex items-center gap-3 ${analyticsService.getHealthColor(systemHealth.status || 'unknown')}`}>
                {(systemHealth.status || 'unknown') === 'healthy' ? (
                  <FiCheckCircle className="w-6 h-6" />
                ) : (
                  <FiAlertTriangle className="w-6 h-6" />
                )}
                <span className="text-lg font-bold capitalize">{systemHealth.status || 'unknown'}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/30 shadow-lg">
                  <div className="text-3xl font-bold text-gray-900 mb-2">{(systemHealth.cpu_usage ?? 0).toFixed(1)}%</div>
                  <div className="text-sm text-gray-600 font-medium">CPU Usage</div>
                </div>
              </div>
              <div className="text-center">
                <div className="p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/30 shadow-lg">
                  <div className="text-3xl font-bold text-gray-900 mb-2">{(systemHealth.memory_usage ?? 0).toFixed(1)}%</div>
                  <div className="text-sm text-gray-600 font-medium">Memory Usage</div>
                </div>
              </div>
              <div className="text-center">
                <div className="p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/30 shadow-lg">
                  <div className="text-3xl font-bold text-gray-900 mb-2">{(systemHealth.disk_usage ?? 0).toFixed(1)}%</div>
                  <div className="text-sm text-gray-600 font-medium">Disk Usage</div>
                </div>
              </div>
              <div className="text-center">
                <div className="p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/30 shadow-lg">
                  <div className="text-3xl font-bold text-gray-900 mb-2">{systemHealth.active_requests ?? 0}</div>
                  <div className="text-sm text-gray-600 font-medium">Active Requests</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Usage Trends */}
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <FiTrendingUp className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Usage Trends</h3>
              </div>
              <div className="text-sm text-gray-500 font-medium">Daily metrics</div>
            </div>
            <div className="h-80 flex items-center justify-center text-gray-500">
              {trends?.daily_requests && trends.daily_requests.length > 0 ? (
                <UsageChart
                  data={trends.daily_requests.map(item => ({
                    date: item.date,
                    requests: item.requests,
                    tokens: 0, // Will be populated when backend provides tokens data
                    response_time: 0 // Will be populated when backend provides response time data
                  }))}
                  title=""
                />
              ) : (
                <div className="text-center">
                  <FiBarChart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium text-gray-600">No usage data available</p>
                  <p className="text-sm text-gray-500">Data will appear as you use the system</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Model Performance */}
        <div className="group relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl shadow-lg">
                  <FiServer className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Model Performance</h3>
              </div>
              <div className="text-sm text-gray-500 font-medium">Active models</div>
            </div>
            <div className="h-80">
              <div className="space-y-3">
                {models.length > 0 ? (
                  <ModelChart data={models} title="" />
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FiServer className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium text-gray-600">No model data available</p>
                    <p className="text-sm text-gray-500">Models will appear once they are used</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Document Insights */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-3xl blur-3xl"></div>
        <div className="relative bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl p-8 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                <FiFileText className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Document Insights</h2>
            </div>
            <div className="text-sm text-gray-500 font-medium">Document analytics</div>
          </div>
          
          {documents.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-white/30 shadow-lg">
              <div className="bg-white/50 backdrop-blur-sm">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 backdrop-blur-sm">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Document</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Queries</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Retrievals</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Avg Score</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Daily Usage</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/30 backdrop-blur-sm divide-y divide-gray-200/50">
                    {documents.map((doc) => (
                      <tr key={doc.document_id} className="hover:bg-white/40 transition-colors duration-200">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                            <div>
                              <div className="font-medium text-gray-900 truncate max-w-xs" title={doc.filename}>
                                {doc.filename}
                              </div>
                              <div className="text-sm text-gray-500">{doc.index_name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-gray-700">{doc.query_count}</td>
                        <td className="px-6 py-4 text-right font-medium text-gray-700">{doc.total_retrievals}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                            (doc.avg_relevance_score ?? 0) >= 0.8 
                              ? 'bg-green-100 text-green-800' 
                              : (doc.avg_relevance_score ?? 0) >= 0.6 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {(doc.avg_relevance_score ?? 0).toFixed(3)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-gray-700">{(doc.queries_per_day ?? 0).toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500">
              <div className="flex flex-col items-center space-y-4">
                <FiFileText className="w-16 h-16 text-gray-300" />
                <p className="text-lg font-medium">No document data available</p>
                <p className="text-sm">Upload documents and run queries to see insights</p>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}