import { Link, useLocation } from 'react-router-dom';
import { FiMessageSquare, FiFileText, FiCpu, FiMenu, FiX, FiLayout, FiBookmark, FiZap, FiWifi, FiHome } from 'react-icons/fi';
import { useState } from 'react';
import { Header } from './Header';

const navigation = [
  { name: 'Home', href: '/', icon: FiHome },
  { name: 'Chat', href: '/chat', icon: FiMessageSquare },
  { name: 'BYOD', href: '/documents', icon: FiFileText },
  { name: 'Models', href: '/models', icon: FiCpu },
  { name: 'Training', href: '/training', icon: FiZap },
  { name: 'Templates', href: '/templates', icon: FiLayout },
  { name: 'Saved Templates', href: '/saved-templates', icon: FiBookmark },
  { name: 'Connect', href: '/connect', icon: FiWifi },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 tech-grid">
      <Header />
      
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden animate-fadeIn"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } fixed lg:static inset-y-0 left-0 z-50 w-64 sm:w-72 glass-card tech-shadow-lg lg:translate-x-0 transition-all duration-300 ease-out flex flex-col border-r border-blue-100/50`}
        >
          {/* Mobile close button */}
          <div className="lg:hidden flex justify-end p-3 sm:p-4 border-b border-blue-100/50">
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-slate-600 hover:text-slate-900 p-1.5 hover:bg-blue-50/50 rounded-lg transition-all"
            >
              <FiX className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 sm:px-4 py-4 sm:py-6 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center space-x-2.5 sm:space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all text-sm sm:text-base relative overflow-hidden ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white tech-shadow neon-blue'
                      : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700'
                  }`}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 animate-pulse-slow" />
                  )}
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 relative z-10 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-white drop-shadow-lg' : 'text-blue-600'
                  }`} />
                  <span className="truncate relative z-10">{item.name}</span>
                  {isActive && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/30 rounded-l-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-3 sm:p-4 border-t border-blue-100/50">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 sm:p-4 border border-blue-200/50 tech-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-2xl" />
              <div className="relative z-10">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <p className="text-xs sm:text-sm font-bold gradient-text truncate">Local LLM Platform</p>
                </div>
                <p className="text-xs text-slate-600 font-mono">v1.0.0</p>
                <div className="mt-2 flex items-center space-x-1.5 sm:space-x-2 flex-wrap text-xs text-slate-500">
                  <span className="flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span>Offline</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>Private</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {/* Mobile menu button */}
          <div className="lg:hidden sticky top-0 z-10 glass-card border-b border-blue-100/50 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center tech-shadow">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-slate-600 hover:text-slate-900 p-1.5 hover:bg-blue-50 rounded-lg transition-all"
              aria-label="Open menu"
            >
              <FiMenu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <span className="ml-3 text-sm sm:text-base font-semibold gradient-text">
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
