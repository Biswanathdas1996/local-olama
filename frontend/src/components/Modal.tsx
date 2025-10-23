import { useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
}

export function Modal({ isOpen, onClose, title, children, maxWidth = '2xl' }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    full: 'max-w-full',
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Container - Full screen on mobile, centered on desktop */}
      <div className="flex min-h-screen items-end sm:items-center justify-center sm:p-4">
        <div
          ref={modalRef}
          className={`relative bg-white sm:rounded-xl shadow-2xl transform transition-all w-full ${maxWidthClasses[maxWidth]} mx-auto max-h-screen sm:max-h-[90vh] flex flex-col`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 sm:rounded-t-xl flex-shrink-0">
            <h3 id="modal-title" className="text-base sm:text-lg font-semibold text-gray-900 truncate pr-2">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-2 sm:p-2 hover:bg-white/50 rounded-lg transition-colors group flex-shrink-0"
              aria-label="Close modal"
            >
              <FiX className="w-5 h-5 sm:w-5 sm:h-5 text-gray-500 group-hover:text-gray-700" />
            </button>
          </div>

          {/* Content - Scrollable area */}
          <div className="px-3 sm:px-6 py-3 sm:py-4 overflow-y-auto flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
