import { Link, useLocation } from 'react-router-dom';
import { FiMessageSquare, FiFileText, FiCpu, FiMenu, FiX } from 'react-icons/fi';
import { useState } from 'react';
import { Header } from './Header';

const navigation = [
  { name: 'Chat', href: '/', icon: FiMessageSquare },
  { name: 'Documents', href: '/documents', icon: FiFileText },
  { name: 'Models', href: '/models', icon: FiCpu },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <Header />
      
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-xl lg:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col border-r border-gray-200`}
        >
          {/* Mobile close button */}
          <div className="lg:hidden flex justify-end p-4">
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-900 mb-1">Local LLM Platform</p>
              <p className="text-xs text-gray-600">v1.0.0</p>
              <div className="mt-2 flex items-center space-x-2">
                <span className="text-xs text-gray-500">🔒 Offline</span>
                <span className="text-xs text-gray-500">•</span>
                <span className="text-xs text-gray-500">🚀 Private</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {/* Mobile menu button */}
          <div className="lg:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-700"
            >
              <FiMenu className="w-6 h-6" />
            </button>
          </div>

          {/* Page content */}
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
