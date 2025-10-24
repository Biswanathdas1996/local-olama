import { useCallback, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { ChatSession, ChatMessage } from '../types/session';

export function useSessions() {
  const [sessions, setSessions] = useLocalStorage<ChatSession[]>('chat-sessions', []);
  const [currentSessionId, setCurrentSessionId] = useLocalStorage<string>('current-session-id', '');

  // Initialize first session if none exist - only run once on mount
  useEffect(() => {
    if (sessions.length === 0) {
      const newSession: ChatSession = {
        id: generateId(),
        name: 'New Chat',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
      };
      console.log('Initializing first session:', newSession);
      setSessions([newSession]);
      setCurrentSessionId(newSession.id);
    } else if (!currentSessionId && sessions.length > 0) {
      console.log('Setting current session to first session:', sessions[0].id);
      setCurrentSessionId(sessions[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Get current session
  const currentSession = sessions.find(s => s.id === currentSessionId);

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
    console.log('=== addMessage called ===');
    console.log('Message to add:', message);
    console.log('Current session ID:', currentSessionId);
    
    // Ensure timestamp is a Date object when storing
    const messageToStore = {
      ...message,
      timestamp: message.timestamp instanceof Date ? message.timestamp.toISOString() : message.timestamp
    };
    
    // Use functional update to avoid stale closure issues
    setSessions(prevSessions => {
      console.log('Previous sessions:', prevSessions);
      
      // Get the current session ID at the time of update
      const activeSessionId = currentSessionId || prevSessions[0]?.id;
      
      if (!activeSessionId) {
        console.error('No active session ID found!');
        return prevSessions;
      }
      
      console.log('Active session ID:', activeSessionId);
      
      const updatedSessions = prevSessions.map(s => {
        if (s.id === activeSessionId) {
          const newMessages = [...s.messages, messageToStore as any];
          console.log('Adding message to session. Old messages:', s.messages.length, 'New messages:', newMessages.length);
          return { 
            ...s, 
            messages: newMessages,
            updatedAt: Date.now(),
            // Auto-rename based on first user message
            name: s.messages.length === 0 && message.role === 'user' 
              ? truncateText(message.content, 30)
              : s.name
          };
        }
        return s;
      });
      
      console.log('Updated sessions:', updatedSessions);
      console.log('=== addMessage done ===');
      
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
