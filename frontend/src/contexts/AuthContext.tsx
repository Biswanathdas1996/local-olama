import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User } from '../services/auth';
import { apiService } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasResourcePermission: (resource: string, action: string) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = authService.getUser();
        const token = authService.getToken();
        
        console.log('[AuthContext] Init - Token exists:', !!token);
        console.log('[AuthContext] Init - User exists:', !!storedUser);
        
        if (storedUser && token) {
          // Set user immediately from localStorage
          console.log('[AuthContext] Setting user from localStorage:', storedUser.username);
          setUser(storedUser);
          setIsLoading(false); // Set loading to false immediately
          
          // Optionally verify token in background (don't block UI)
          setTimeout(async () => {
            try {
              console.log('[AuthContext] Verifying token in background...');
              // Tell API service to NOT auto-clear auth on 401
              apiService.setSkipAuthClear(true);
              const currentUser = await authService.getCurrentUser();
              console.log('[AuthContext] Token verified, updating user');
              setUser(currentUser);
            } catch (error) {
              console.warn('[AuthContext] Token verification failed (keeping cached user):', error);
              // Only clear auth if it's explicitly a 401 Unauthorized
              const is401 = (error as any)?.response?.status === 401;
              if (is401) {
                console.error('[AuthContext] 401 Unauthorized - clearing auth');
                authService.logout();
                setUser(null);
              }
            } finally {
              // Re-enable auto-clear for subsequent API calls
              apiService.setSkipAuthClear(false);
            }
          }, 100); // Small delay to not block initial render
        } else {
          console.log('[AuthContext] No stored credentials found');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[AuthContext] Failed to initialize auth:', error);
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      console.log('[AuthContext] Login attempt for user:', username);
      const response = await authService.login(username, password);
      console.log('[AuthContext] Login successful, user:', response.user.username);
      console.log('[AuthContext] User is_admin:', response.user.is_admin);
      console.log('[AuthContext] User permissions:', response.user.permissions);
      setUser(response.user);
      console.log('[AuthContext] User state updated');
    } catch (error) {
      console.error('[AuthContext] Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const hasPermission = (permission: string): boolean => {
    console.log('[AuthContext] Checking permission:', permission, 'user:', user?.username, 'is_admin:', user?.is_admin);
    if (!user) {
      console.log('[AuthContext] No user - permission denied');
      return false;
    }
    if (user.is_admin) {
      console.log('[AuthContext] Admin user - permission granted');
      return true;
    }
    const hasIt = user.permissions.includes(permission);
    console.log('[AuthContext] Permission check result:', hasIt);
    return hasIt;
  };

  const hasResourcePermission = (resource: string, action: string): boolean => {
    const permString = `${resource}.${action}`;
    console.log('[AuthContext] Checking resource permission:', permString);
    return hasPermission(permString);
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      logout();
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    hasPermission,
    hasResourcePermission,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
