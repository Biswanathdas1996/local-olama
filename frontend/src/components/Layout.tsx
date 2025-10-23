import { Link, useLocation } from 'react-router';
import { FiMessageSquare, FiFileText, FiCpu, FiMenu, FiX, FiLayout, FiBookmark, FiZap } from 'react-icons/fi';
import { useState } from 'react';
import { Header } from './Header';

const navigation = [
  { name: 'Chat', href: '/', icon: FiMessageSquare },
  { name: 'BYOD', href: '/documents', icon: FiFileText },
  { name: 'Models', href: '/models', icon: FiCpu },
  { name: 'Training', href: '/training', icon: FiZap },
  { name: 'Templates', href: '/templates', icon: FiLayout },
  { name: 'Saved Templates', href: '/saved-templates', icon: FiBookmark },
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
          } fixed lg:static inset-y-0 left-0 z-50 w-64 sm:w-72 bg-white shadow-xl lg:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col border-r border-gray-200`}
        >
          {/* Mobile close button */}
          <div className="lg:hidden flex justify-end p-3 sm:p-4">
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiX className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 sm:px-4 py-4 sm:py-6 space-y-1.5 sm:space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-2 sm:space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all text-sm sm:text-base ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-3 sm:p-4 border-t border-gray-200">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl p-3 sm:p-4">
              <p className="text-xs sm:text-sm font-semibold text-gray-900 mb-1 truncate">Local LLM Platform</p>
              <p className="text-xs text-gray-600">v1.0.0</p>
              <div className="mt-2 flex items-center space-x-1.5 sm:space-x-2 flex-wrap">
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
          <div className="lg:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-700 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Open menu"
            >
              <FiMenu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <span className="ml-3 text-sm sm:text-base font-semibold text-gray-900">
              {navigation.find(item => item.href === location.pathname)?.name || 'Menu'}
            </span>
          </div>

          {/* Page content */}
          <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
