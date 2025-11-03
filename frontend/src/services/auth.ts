// Authentication service for API calls
import api from './api';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  last_login?: string;
  roles: Role[];
  permissions: string[];
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  permissions: Permission[];
}

export interface Permission {
  id: number;
  name: string;
  resource: string;
  action: string;
  description?: string;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface UserCreate {
  username: string;
  email: string;
  password: string;
  full_name?: string;
  is_active?: boolean;
  is_admin?: boolean;
}

export interface UserUpdate {
  email?: string;
  full_name?: string;
  is_active?: boolean;
  is_admin?: boolean;
}

export interface RoleCreate {
  name: string;
  description?: string;
  permission_ids?: number[];
}

export interface RoleUpdate {
  name?: string;
  description?: string;
  permission_ids?: number[];
}

class AuthService {
  private tokenKey = 'auth_token';
  private userKey = 'auth_user';

  // Get stored token
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  // Set token
  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  // Remove token
  removeToken(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  // Get stored user
  getUser(): User | null {
    const userStr = localStorage.getItem(this.userKey);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  // Set user
  setUser(user: User): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Check if user has specific permission
  hasPermission(permission: string): boolean {
    const user = this.getUser();
    if (!user) return false;
    if (user.is_admin) return true;
    return user.permissions.includes(permission);
  }

  // Check if user has resource permission
  hasResourcePermission(resource: string, action: string): boolean {
    return this.hasPermission(`${resource}.${action}`);
  }

  // Login
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', {
      username,
      password,
    });
    
    // Store token and user
    this.setToken(response.access_token);
    this.setUser(response.user);
    
    return response;
  }

  // Logout
  logout(): void {
    this.removeToken();
  }

  // Get current user from API
  async getCurrentUser(): Promise<User> {
    const user = await api.get<User>('/auth/me');
    this.setUser(user);
    return user;
  }

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }

  // Admin: Get all users
  async getUsers(skip = 0, limit = 100): Promise<{ users: User[]; total: number }> {
    return await api.get('/auth/users', { skip, limit });
  }

  // Admin: Create user
  async createUser(userData: UserCreate): Promise<User> {
    return await api.post<User>('/auth/users', userData);
  }

  // Admin: Update user
  async updateUser(userId: number, userData: UserUpdate): Promise<User> {
    return await api.put<User>(`/auth/users/${userId}`, userData);
  }

  // Admin: Delete user
  async deleteUser(userId: number): Promise<void> {
    await api.delete(`/auth/users/${userId}`);
  }

  // Admin: Assign roles to user
  async assignRolesToUser(userId: number, roleIds: number[]): Promise<User> {
    return await api.post<User>(`/auth/users/${userId}/roles`, { role_ids: roleIds });
  }

  // Admin: Get all roles
  async getRoles(skip = 0, limit = 100): Promise<{ roles: Role[]; total: number }> {
    return await api.get('/auth/roles', { skip, limit });
  }

  // Admin: Create role
  async createRole(roleData: RoleCreate): Promise<Role> {
    return await api.post<Role>('/auth/roles', roleData);
  }

  // Admin: Update role
  async updateRole(roleId: number, roleData: RoleUpdate): Promise<Role> {
    return await api.put<Role>(`/auth/roles/${roleId}`, roleData);
  }

  // Admin: Delete role
  async deleteRole(roleId: number): Promise<void> {
    await api.delete(`/auth/roles/${roleId}`);
  }

  // Admin: Get all permissions
  async getPermissions(skip = 0, limit = 100, resource?: string): Promise<{ permissions: Permission[]; total: number }> {
    const params: any = { skip, limit };
    if (resource) params.resource = resource;
    return await api.get('/auth/permissions', params);
  }
}

export const authService = new AuthService();
