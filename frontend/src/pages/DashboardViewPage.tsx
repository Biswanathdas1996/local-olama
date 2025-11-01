import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiExternalLink } from 'react-icons/fi';

export function DashboardViewPage() {
  const { dashboardUrl } = useParams<{ dashboardUrl: string }>();
  const navigate = useNavigate();
  const [decodedUrl, setDecodedUrl] = useState('');

  useEffect(() => {
    if (dashboardUrl) {
      // Decode the URL from the route parameter
      let url = decodeURIComponent(dashboardUrl);

      // Convert direct Metabase URL to proxy URL to bypass CORS/CSP restrictions
      if (url.includes('localhost:3001')) {
        url = url.replace('http://localhost:3001', '/metabase/proxy');

      }
      else if (url.includes('127.0.0.1:3001')) {
        url = url.replace('http://127.0.0.1:3001', '/metabase/proxy');

      }
      console.log('Decoded Dashboard URL:============>', url);
      setDecodedUrl(url);
    }
  }, [dashboardUrl]);

  const handleBack = () => {
    navigate('/metabase');
  };

  const handleOpenExternal = () => {
    if (decodedUrl) {
      window.open(decodedUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <FiArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Analytics</span>
          </button>
          <div className="h-6 w-px bg-gray-300" />
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        </div>
        <button
          onClick={handleOpenExternal}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FiExternalLink className="w-4 h-4" />
          <span>Open in Metabase</span>
        </button>
      </div>

      {/* Dashboard Iframe */}
      <div className="flex-1 relative">

        {decodedUrl ? (
          <iframe
            src={decodedUrl}
            className="absolute inset-0 w-full h-full border-0"
            title="Metabase Dashboard"
            allow="fullscreen"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
