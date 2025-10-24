import { useState } from 'react';
import { FiPlus, FiMessageSquare, FiTrash2, FiEdit2, FiCheck, FiX } from 'react-icons/fi';
import type { ChatSession } from '../types/session';

interface SessionSidebarProps {
  sessions: ChatSession[];
  currentSessionId?: string;
  onCreateSession: () => void;
  onSwitchSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newName: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function SessionSidebar({
  sessions,
  currentSessionId,
  onCreateSession,
  onSwitchSession,
  onDeleteSession,
  onRenameSession,
  isOpen,
  onClose,
}: SessionSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const startEditing = (session: ChatSession) => {
    setEditingId(session.id);
    setEditingName(session.name);
  };

  const saveEdit = () => {
    if (editingId && editingName.trim()) {
      onRenameSession(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out shadow-xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-teal-600 to-teal-700">
          <button
            onClick={onCreateSession}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all backdrop-blur-sm active:scale-95 font-medium text-sm"
          >
            <FiPlus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {sessions.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <FiMessageSquare className="w-8 h-8 mx-auto mb-1.5 opacity-40" />
              <p className="text-xs">No sessions yet</p>
            </div>
          ) : (
            sessions
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .map((session) => {
                const isActive = session.id === currentSessionId;
                const isEditing = editingId === session.id;

                return (
                  <div
                    key={session.id}
                    className={`group relative rounded-lg transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-teal-50 to-teal-100 border border-teal-200 shadow-sm'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div
                      onClick={() => !isEditing && onSwitchSession(session.id)}
                      className="cursor-pointer p-2.5"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="flex-1 px-2 py-1 text-sm border border-teal-300 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"
                            autoFocus
                          />
                          <button
                            onClick={saveEdit}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                          >
                            <FiCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2 mb-0.5">
                            <h3
                              className={`font-medium text-xs line-clamp-1 flex-1 ${
                                isActive ? 'text-teal-900' : 'text-gray-900'
                              }`}
                            >
                              {session.name}
                            </h3>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(session);
                                }}
                                className="p-1 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                                title="Rename"
                              >
                                <FiEdit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Delete this chat session?')) {
                                    onDeleteSession(session.id);
                                  }
                                }}
                                className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <FiTrash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className={isActive ? 'text-teal-600 font-medium' : 'text-gray-500'}>
                              {session.messages.length} msg{session.messages.length !== 1 ? 's' : ''}
                            </span>
                            <span className={isActive ? 'text-teal-500' : 'text-gray-400'}>
                              {formatDate(session.updatedAt)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
          )}
        </div>

        {/* Footer Info */}
        <div className="p-2 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <p className="text-[10px] text-gray-500 text-center font-medium">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </>
  );
}
