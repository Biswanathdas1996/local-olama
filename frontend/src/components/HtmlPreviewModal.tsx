import { useEffect, useRef, useState } from 'react';
import { FiX, FiCopy, FiDownload, FiCode, FiEye } from 'react-icons/fi';

interface HtmlPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  title?: string;
}

export function HtmlPreviewModal({ isOpen, onClose, content, title = 'Response Preview' }: HtmlPreviewModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [viewMode, setViewMode] = useState<'rendered' | 'code'>('rendered');

  useEffect(() => {
    if (isOpen && viewMode === 'rendered' && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
                  line-height: 1.6;
                  padding: 1rem;
                  color: #333;
                  max-width: 100%;
                  overflow-wrap: break-word;
                }
                pre {
                  background: #f4f4f4;
                  padding: 1rem;
                  border-radius: 0.5rem;
                  overflow-x: auto;
                }
                code {
                  background: #f4f4f4;
                  padding: 0.2rem 0.4rem;
                  border-radius: 0.25rem;
                  font-family: 'Courier New', monospace;
                }
                pre code {
                  background: none;
                  padding: 0;
                }
                h1, h2, h3, h4, h5, h6 {
                  margin-top: 1.5rem;
                  margin-bottom: 0.5rem;
                }
                ul, ol {
                  margin: 1rem 0;
                  padding-left: 2rem;
                }
                blockquote {
                  border-left: 4px solid #ddd;
                  margin: 1rem 0;
                  padding-left: 1rem;
                  color: #666;
                }
                table {
                  border-collapse: collapse;
                  width: 100%;
                  margin: 1rem 0;
                }
                th, td {
                  border: 1px solid #ddd;
                  padding: 0.5rem;
                  text-align: left;
                }
                th {
                  background: #f4f4f4;
                  font-weight: bold;
                }
                img {
                  max-width: 100%;
                  height: auto;
                }
                a {
                  color: #2563eb;
                  text-decoration: none;
                }
                a:hover {
                  text-decoration: underline;
                }
              </style>
            </head>
            <body>
              ${content}
            </body>
          </html>
        `);
        doc.close();
      }
    }
  }, [isOpen, content, viewMode]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    alert('Content copied to clipboard!');
  };

  const downloadAsHtml = () => {
    const blob = new Blob([`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      line-height: 1.6;
      padding: 2rem;
      max-width: 800px;
      margin: 0 auto;
    }
    pre { background: #f4f4f4; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
    code { background: #f4f4f4; padding: 0.2rem 0.4rem; border-radius: 0.25rem; }
    pre code { background: none; padding: 0; }
  </style>
</head>
<body>
${content}
</body>
</html>
    `], { type: 'text/html' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode(viewMode === 'rendered' ? 'code' : 'rendered')}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center space-x-2"
              title={viewMode === 'rendered' ? 'View Source Code' : 'View Rendered'}
            >
              {viewMode === 'rendered' ? (
                <>
                  <FiCode className="w-4 h-4" />
                  <span className="text-sm">Code</span>
                </>
              ) : (
                <>
                  <FiEye className="w-4 h-4" />
                  <span className="text-sm">Preview</span>
                </>
              )}
            </button>
            <button
              onClick={copyToClipboard}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
              title="Copy to clipboard"
            >
              <FiCopy className="w-4 h-4" />
              <span className="text-sm">Copy</span>
            </button>
            <button
              onClick={downloadAsHtml}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center space-x-2"
              title="Download as HTML"
            >
              <FiDownload className="w-4 h-4" />
              <span className="text-sm">Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <FiX className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {viewMode === 'rendered' ? (
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0 bg-white rounded-lg"
              title="HTML Preview"
              sandbox="allow-same-origin"
            />
          ) : (
            <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm">
              <code className="text-gray-800">{content}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
