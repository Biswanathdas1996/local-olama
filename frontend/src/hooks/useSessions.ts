import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { ChatSession, ChatMessage } from '../types/session';

export function useSessions() {
  const [sessions, setSessions] = useLocalStorage<ChatSession[]>('chat-sessions', []);
  const [currentSessionId, setCurrentSessionId] = useLocalStorage<string>('current-session-id', '');

  // Initialize first session if none exist
  const initializeSession = useCallback(() => {
    if (sessions.length === 0) {
      const newSession: ChatSession = {
        id: generateId(),
        name: 'New Chat',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      };
      setSessions([newSession]);
      setCurrentSessionId(newSession.id);
      return newSession;
    }
    
    if (!currentSessionId && sessions.length > 0) {
      setCurrentSessionId(sessions[0].id);
      return sessions[0];
    }
    
    return sessions.find(s => s.id === currentSessionId) || sessions[0];
  }, [sessions, currentSessionId, setSessions, setCurrentSessionId]);

  // Get current session
  const currentSession = sessions.find(s => s.id === currentSessionId) || initializeSession();

  // Create new session
  const createSession = useCallback(() => {
    let newSession: ChatSession;
    setSessions(prevSessions => {
      newSession = {
        id: generateId(),
        name: `Chat ${prevSessions.length + 1}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      };
      return [...prevSessions, newSession];
    });
    setCurrentSessionId(newSession!.id);
    return newSession!;
  }, [setSessions, setCurrentSessionId]);

  // Switch to a different session
  const switchSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
  }, [setCurrentSessionId]);

  // Delete a session
  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prevSessions => {
      const updatedSessions = prevSessions.filter(s => s.id !== sessionId);
      
      if (updatedSessions.length === 0) {
        // Create a new session if all are deleted
        const newSession: ChatSession = {
          id: generateId(),
          name: 'New Chat',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
        };
        setCurrentSessionId(newSession.id);
        return [newSession];
      } else {
        // If we deleted the current session, switch to the first one
        if (currentSessionId === sessionId) {
          setCurrentSessionId(updatedSessions[0].id);
        }
        return updatedSessions;
      }
    });
  }, [currentSessionId, setSessions, setCurrentSessionId]);

  // Rename a session
  const renameSession = useCallback((sessionId: string, newName: string) => {
    setSessions(prevSessions => prevSessions.map(s => 
      s.id === sessionId 
        ? { ...s, name: newName, updatedAt: Date.now() }
        : s
    ));
  }, [setSessions]);

  // Add message to current session
  const addMessage = useCallback((message: ChatMessage) => {
    // Ensure timestamp is a Date object when storing
    const messageToStore = {
      ...message,
      timestamp: message.timestamp instanceof Date ? message.timestamp.toISOString() : message.timestamp
    };
    
    // Use functional update to avoid stale closure issues
    setSessions(prevSessions => {
      const updatedSessions = prevSessions.map(s => 
        s.id === currentSessionId
          ? { 
              ...s, 
              messages: [...s.messages, messageToStore as any],
              updatedAt: Date.now(),
              // Auto-rename based on first user message
              name: s.messages.length === 0 && message.role === 'user' 
                ? truncateText(message.content, 30)
                : s.name
            }
          : s
      );
      
      return updatedSessions;
    });
  }, [currentSessionId, setSessions]);

  // Clear messages in current session
  const clearMessages = useCallback(() => {
    setSessions(prevSessions => prevSessions.map(s => 
      s.id === currentSessionId
        ? { ...s, messages: [], updatedAt: Date.now() }
        : s
    ));
  }, [currentSessionId, setSessions]);

  // Get messages for current session with parsed timestamps
  const messages = (currentSession?.messages || []).map(msg => ({
    ...msg,
    timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : msg.timestamp
  })) as ChatMessage[];

  return {
    sessions,
    currentSession,
    messages,
    createSession,
    switchSession,
    deleteSession,
    renameSession,
    addMessage,
    clearMessages,
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}
