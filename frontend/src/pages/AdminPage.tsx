import { useState, useEffect } from 'react';
import { authService, User, Role, Permission } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';

export function AdminPage() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'permissions'>('users');
  
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // User form state
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    is_active: true,
    is_admin: false,
  });

  // Role assignment state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);

  // Role form state
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleFormData, setRoleFormData] = useState({
    name: '',
    description: '',
  });
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      if (activeTab === 'users') {
        const data = await authService.getUsers();
        setUsers(data.users);
      } else if (activeTab === 'roles') {
        const data = await authService.getRoles();
        setRoles(data.roles);
      } else if (activeTab === 'permissions') {
        const data = await authService.getPermissions();
        setPermissions(data.permissions);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setUserFormData({
      username: '',
      email: '',
      password: '',
      full_name: '',
      is_active: true,
      is_admin: false,
    });
    setShowUserForm(true);
  };

  const handleSaveUser = async () => {
    try {
      if (editingUser) {
        await authService.updateUser(editingUser.id, {
          email: userFormData.email,
          full_name: userFormData.full_name,
          is_active: userFormData.is_active,
          is_admin: userFormData.is_admin,
        });
      } else {
        await authService.createUser(userFormData);
      }
      setShowUserForm(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save user');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await authService.deleteUser(userId);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    }
  };

  const handleManageRoles = async (user: User) => {
    setSelectedUser(user);
    setSelectedRoleIds(user.roles.map(r => r.id));
    // Load all roles if not already loaded
    if (roles.length === 0) {
      try {
        const data = await authService.getRoles();
        setRoles(data.roles);
      } catch (err: any) {
        setError(err.message || 'Failed to load roles');
      }
    }
    setShowRoleModal(true);
  };

  const handleSaveRoles = async () => {
    if (!selectedUser) return;
    try {
      await authService.assignRolesToUser(selectedUser.id, selectedRoleIds);
      setShowRoleModal(false);
      setSelectedUser(null);
      setSelectedRoleIds([]);
      loadData(); // Reload users to show updated roles
    } catch (err: any) {
      setError(err.message || 'Failed to assign roles');
    }
  };

  const toggleRoleSelection = (roleId: number) => {
    setSelectedRoleIds(prev =>
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleCreateRole = () => {
    setEditingRole(null);
    setRoleFormData({
      name: '',
      description: '',
    });
    setSelectedPermissionIds([]);
    // Load permissions if not already loaded
    if (permissions.length === 0) {
      loadPermissions();
    }
    setShowRoleForm(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setRoleFormData({
      name: role.name,
      description: role.description || '',
    });
    setSelectedPermissionIds(role.permissions.map(p => p.id));
    // Load permissions if not already loaded
    if (permissions.length === 0) {
      loadPermissions();
    }
    setShowRoleForm(true);
  };

  const loadPermissions = async () => {
    try {
      const data = await authService.getPermissions();
      setPermissions(data.permissions);
    } catch (err: any) {
      setError(err.message || 'Failed to load permissions');
    }
  };

  const handleSaveRole = async () => {
    try {
      if (editingRole) {
        await authService.updateRole(editingRole.id, {
          name: roleFormData.name,
          description: roleFormData.description,
          permission_ids: selectedPermissionIds,
        });
      } else {
        await authService.createRole({
          name: roleFormData.name,
          description: roleFormData.description,
          permission_ids: selectedPermissionIds,
        });
      }
      setShowRoleForm(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save role');
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;
    try {
      await authService.deleteRole(roleId);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete role');
    }
  };

  const togglePermissionSelection = (permissionId: number) => {
    setSelectedPermissionIds(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  if (!currentUser?.is_admin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
          <p className="mt-2 text-gray-600">Admin privileges required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        <p className="mt-2 text-gray-600">Manage users, roles, and permissions</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`${
              activeTab === 'roles'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Roles
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`${
              activeTab === 'permissions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Permissions
          </button>
        </nav>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Users Tab */}
          {activeTab === 'users' && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold">Users</h2>
                <button
                  onClick={handleCreateUser}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Add User
                </button>
              </div>
              
              <div className="bg-white shadow overflow-hidden rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Full Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roles</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{user.full_name || '-'}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {user.roles && user.roles.length > 0 ? (
                              user.roles.map((role) => (
                                <span
                                  key={role.id}
                                  className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800"
                                >
                                  {role.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 text-sm">No roles</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.is_admin ? '✓' : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleManageRoles(user)}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-medium"
                            >
                              Manage Roles
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={user.id === currentUser?.id}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Roles Tab */}
          {activeTab === 'roles' && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold">Roles</h2>
                <button
                  onClick={handleCreateRole}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Add Role
                </button>
              </div>
              
              <div className="bg-white shadow overflow-hidden rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Permissions</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {roles.map((role) => (
                      <tr key={role.id}>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{role.name}</td>
                        <td className="px-6 py-4">{role.description || '-'}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {role.permissions && role.permissions.length > 0 ? (
                              <>
                                {role.permissions.slice(0, 3).map((perm) => (
                                  <span
                                    key={perm.id}
                                    className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700"
                                  >
                                    {perm.name}
                                  </span>
                                ))}
                                {role.permissions.length > 3 && (
                                  <span className="text-xs text-gray-500">
                                    +{role.permissions.length - 3} more
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-400 text-sm">No permissions</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditRole(role)}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteRole(role.id)}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Permissions Tab */}
          {activeTab === 'permissions' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Permissions</h2>
              <div className="bg-white shadow overflow-hidden rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {permissions.map((perm) => (
                      <tr key={perm.id}>
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">{perm.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{perm.resource}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{perm.action}</td>
                        <td className="px-6 py-4">{perm.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* User Form Modal */}
      {showUserForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              {editingUser ? 'Edit User' : 'Create User'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  value={userFormData.username}
                  onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                  className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={!!editingUser}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  value={userFormData.full_name}
                  onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
                  className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={userFormData.is_active}
                  onChange={(e) => setUserFormData({ ...userFormData, is_active: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label className="ml-2 text-sm text-gray-700">Active</label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={userFormData.is_admin}
                  onChange={(e) => setUserFormData({ ...userFormData, is_admin: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label className="ml-2 text-sm text-gray-700">Admin</label>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowUserForm(false)}
                className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUser}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Assignment Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              Manage Roles for {selectedUser.username}
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Select roles to assign to this user:
              </p>
              
              {roles.length === 0 ? (
                <p className="text-gray-500 text-sm">No roles available</p>
              ) : (
                <div className="space-y-2">
                  {roles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-start p-3 border rounded hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleRoleSelection(role.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRoleIds.includes(role.id)}
                        onChange={() => toggleRoleSelection(role.id)}
                        className="mt-1 rounded border-gray-300"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="ml-3 flex-1">
                        <label className="font-medium text-gray-900 cursor-pointer">
                          {role.name}
                        </label>
                        {role.description && (
                          <p className="text-sm text-gray-500 mt-1">{role.description}</p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {role.permissions.map((perm) => (
                            <span
                              key={perm.id}
                              className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded"
                            >
                              {perm.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                  setSelectedRoleIds([]);
                }}
                className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRoles}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Roles
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Form Modal */}
      {showRoleForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingRole ? 'Edit Role' : 'Create Role'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Role Name *</label>
                <input
                  type="text"
                  value={roleFormData.name}
                  onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g., Developer, Manager, Viewer"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={roleFormData.description}
                  onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                  className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows={3}
                  placeholder="Describe what this role can do..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions ({selectedPermissionIds.length} selected)
                </label>
                
                {permissions.length === 0 ? (
                  <p className="text-gray-500 text-sm">Loading permissions...</p>
                ) : (
                  <div className="border border-gray-300 rounded max-h-60 overflow-y-auto">
                    <div className="divide-y divide-gray-200">
                      {permissions.map((perm) => (
                        <div
                          key={perm.id}
                          className="flex items-start p-3 hover:bg-gray-50 cursor-pointer"
                          onClick={() => togglePermissionSelection(perm.id)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedPermissionIds.includes(perm.id)}
                            onChange={() => togglePermissionSelection(perm.id)}
                            className="mt-1 rounded border-gray-300"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="ml-3 flex-1">
                            <div className="font-mono text-sm font-medium text-gray-900">
                              {perm.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded mr-2">
                                {perm.resource}
                              </span>
                              <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 rounded">
                                {perm.action}
                              </span>
                            </div>
                            {perm.description && (
                              <p className="text-xs text-gray-500 mt-1">{perm.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRoleForm(false);
                  setEditingRole(null);
                  setRoleFormData({ name: '', description: '' });
                  setSelectedPermissionIds([]);
                }}
                className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRole}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={!roleFormData.name.trim()}
              >
                {editingRole ? 'Update Role' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
