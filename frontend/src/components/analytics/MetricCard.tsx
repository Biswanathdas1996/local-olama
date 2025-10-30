interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  loading?: boolean;
}

export function MetricCard({ 
  title, 
  value, 
  change, 
  changeLabel, 
  icon, 
  color = 'blue',
  loading = false 
}: MetricCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 text-blue-600 bg-blue-50',
    green: 'from-green-500 to-green-600 text-green-600 bg-green-50',
    yellow: 'from-yellow-500 to-yellow-600 text-yellow-600 bg-yellow-50',
    red: 'from-red-500 to-red-600 text-red-600 bg-red-50',
    purple: 'from-purple-500 to-purple-600 text-purple-600 bg-purple-50'
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-2">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="h-8 bg-gray-200 rounded w-20 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-6 hover:shadow-lg transition-all">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {icon && (
          <div className={`p-2 rounded-lg ${colorClasses[color].split(' ')[3]} ${colorClasses[color].split(' ')[2]}`}>
            {icon}
          </div>
        )}
      </div>
      
      <div className="flex items-baseline justify-between">
        <p className="text-2xl font-bold text-gray-900">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        
        {change !== undefined && (
          <div className={`flex items-center text-sm ${getChangeColor(change)}`}>
            <span className="font-medium">
              {change > 0 ? '+' : ''}{change.toFixed(1)}%
            </span>
            {changeLabel && (
              <span className="ml-1 text-gray-500">{changeLabel}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}