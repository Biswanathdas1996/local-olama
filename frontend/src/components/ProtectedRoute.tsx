import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: string;
  resource?: string;
  action?: string;
  adminOnly?: boolean;
}

export function ProtectedRoute({ 
  children, 
  permission, 
  resource, 
  action, 
  adminOnly = false 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, hasPermission, hasResourcePermission } = useAuth();

  // Log authentication state
  console.log('[ProtectedRoute] Check:', {
    isLoading,
    isAuthenticated,
    user: user?.username,
    isAdmin: user?.is_admin,
    permission,
    resource,
    action,
    adminOnly
  });

  // Show nothing while checking authentication
  if (isLoading) {
    console.log('[ProtectedRoute] Still loading...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('[ProtectedRoute] Not authenticated - redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('[ProtectedRoute] User authenticated:', user?.username, 'is_admin:', user?.is_admin);

  // ADMINS HAVE ACCESS TO EVERYTHING - skip all permission checks
  if (user?.is_admin) {
    console.log('[ProtectedRoute] Admin user - granting access');
    return <>{children}</>;
  }

  // Check admin requirement (for non-admin users)
  if (adminOnly && !user?.is_admin) {
    console.log('[ProtectedRoute] Admin-only route - access denied');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  // Check specific permission (for non-admin users)
  if (permission && !hasPermission(permission)) {
    console.log('[ProtectedRoute] Permission denied:', permission);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
          <p className="text-sm text-gray-500 mt-2">Required: {permission}</p>
        </div>
      </div>
    );
  }

  // Check resource permission (for non-admin users)
  if (resource && action && !hasResourcePermission(resource, action)) {
    console.log('[ProtectedRoute] Resource permission denied:', resource, action);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
          <p className="text-sm text-gray-500 mt-2">Required: {resource}.{action}</p>
        </div>
      </div>
    );
  }

  console.log('[ProtectedRoute] Access granted');
  return <>{children}</>;
}
