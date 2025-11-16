import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiExternalLink } from 'react-icons/fi';

export function DashboardViewPage() {
  const { dashboardUrl } = useParams<{ dashboardUrl: string }>();
  const navigate = useNavigate();
  const [decodedUrl, setDecodedUrl] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

  // Inject CSS to hide the unwanted div
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !decodedUrl) return;

    const injectCSS = () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          // Create a style element to hide the unwanted div
          const style = iframeDoc.createElement('style');
          style.textContent = `
            .emotion-pqcewr.e4w71dr4 {
              display: none !important;
            }
          `;
          iframeDoc.head.appendChild(style);
          console.log('CSS injected to hide unwanted div');
        }
      } catch (error) {
        // CORS restrictions - fallback to using global CSS
        console.log('Cannot access iframe content, using global CSS');
      }
    };

    iframe.addEventListener('load', injectCSS);

    return () => {
      iframe.removeEventListener('load', injectCSS);
    };
  }, [decodedUrl]);

  const handleBack = () => {
    // Use replace to avoid proxy state in history
    navigate('/metabase', { replace: true });
  };

  const handleOpenExternal = () => {
    if (decodedUrl) {
      // Ensure external links don't interfere with app navigation
      const externalUrl = decodedUrl.startsWith('/') ? `http://localhost:3001${decodedUrl}` : decodedUrl;
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
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
            ref={iframeRef}
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
