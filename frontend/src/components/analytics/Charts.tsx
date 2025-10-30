import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

interface UsageChartProps {
  data: Array<{
    date: string;
    requests: number;
    tokens: number;
    response_time: number;
  }>;
  title?: string;
}

export function UsageChart({ data, title = "Usage Trends" }: UsageChartProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-lg mb-2">📊</div>
          <p>No usage data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h4 className="text-sm font-medium text-gray-700 mb-4">{title}</h4>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="requestsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="tokensGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={formatDate}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={formatNumber}
          />
          <Tooltip 
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-medium text-gray-900 mb-2">
                      {new Date(label).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                    {payload.map((entry, index) => (
                      <p key={index} style={{ color: entry.color }} className="text-sm">
                        {entry.dataKey === 'requests' && `Requests: ${formatNumber(entry.value as number)}`}
                        {entry.dataKey === 'tokens' && `Tokens: ${formatNumber(entry.value as number)}`}
                        {entry.dataKey === 'response_time' && `Avg Response: ${(entry.value as number).toFixed(2)}s`}
                      </p>
                    ))}
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="requests"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#requestsGradient)"
            name="Requests"
          />
          <Area
            type="monotone"
            dataKey="tokens"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#tokensGradient)"
            name="Tokens"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface ModelChartProps {
  data: Array<{
    model_name: string;
    total_requests: number;
    avg_response_time: number;
    success_rate: number;
    tokens_per_second: number;
  }>;
  title?: string;
}

export function ModelChart({ data, title = "Model Performance" }: ModelChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-lg mb-2">🤖</div>
          <p>No model data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h4 className="text-sm font-medium text-gray-700 mb-4">{title}</h4>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data.slice(0, 6)} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="model_name" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          <Tooltip 
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-medium text-gray-900 mb-2">{label}</p>
                    <div className="space-y-1 text-sm">
                      <p>Requests: {data.total_requests.toLocaleString()}</p>
                      <p>Response Time: {data.avg_response_time.toFixed(2)}s</p>
                      <p>Success Rate: {data.success_rate.toFixed(1)}%</p>
                      <p>Speed: {data.tokens_per_second.toFixed(1)} tok/s</p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar 
            dataKey="total_requests" 
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            name="Requests"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface ResponseTimeChartProps {
  data: Array<{
    hour: number;
    avg_response_time: number;
    request_count: number;
  }>;
  title?: string;
}

export function ResponseTimeChart({ data, title = "Response Time by Hour" }: ResponseTimeChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-lg mb-2">⏱️</div>
          <p>No response time data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h4 className="text-sm font-medium text-gray-700 mb-4">{title}</h4>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="hour" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={(hour) => `${hour}:00`}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={(value) => `${value}s`}
          />
          <Tooltip 
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-medium text-gray-900 mb-2">{label}:00</p>
                    <div className="space-y-1 text-sm">
                      <p>Avg Response Time: {data.avg_response_time.toFixed(2)}s</p>
                      <p>Requests: {data.request_count}</p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="avg_response_time"
            stroke="#f59e0b"
            strokeWidth={3}
            dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2, fill: '#fff' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface DocumentUsageChartProps {
  data: Array<{
    filename: string;
    query_count: number;
    avg_relevance_score: number;
  }>;
  title?: string;
}

export function DocumentUsageChart({ data, title = "Document Usage" }: DocumentUsageChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-lg mb-2">📄</div>
          <p>No document data available</p>
        </div>
      </div>
    );
  }

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  
  const chartData = data.slice(0, 6).map((item, index) => ({
    ...item,
    color: colors[index % colors.length],
    shortName: item.filename.length > 20 ? item.filename.substring(0, 17) + '...' : item.filename
  }));

  return (
    <div className="w-full">
      <h4 className="text-sm font-medium text-gray-700 mb-4">{title}</h4>
      <div className="flex flex-col lg:flex-row items-center">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="query_count"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                      <p className="font-medium text-gray-900 mb-2">{data.filename}</p>
                      <div className="space-y-1 text-sm">
                        <p>Queries: {data.query_count}</p>
                        <p>Avg Score: {data.avg_relevance_score.toFixed(3)}</p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        
        <div className="lg:ml-6 mt-4 lg:mt-0 space-y-2">
          {chartData.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-gray-700 truncate" title={item.filename}>
                {item.shortName}
              </span>
              <span className="text-xs text-gray-500">({item.query_count})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}