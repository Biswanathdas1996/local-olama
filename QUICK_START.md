# 🔐 Authentication System - Quick Start Guide

## ✅ What's Completed

A complete admin and user login system has been successfully implemented with:

✅ **Backend Authentication**
- JWT token-based authentication
- Secure password hashing with bcrypt
- User, role, and permission management
- Protected API routes with permission checks

✅ **Frontend Authentication**  
- Login page with authentication
- Protected routes based on permissions
- Admin panel for user management
- Automatic token management
- Permission-based menu visibility

✅ **Access Control**
- Role-Based Access Control (RBAC)
- Fine-grained permissions (resource.action)
- Default roles: Viewer, User, PowerUser, Admin
- Permission checks on all protected routes

## 🚀 Quick Setup (3 Steps)

### Step 1: Install Dependencies
```bash
pip install python-jose[cryptography]==3.3.0 passlib[bcrypt]==1.7.4 bcrypt==4.1.2 sqlalchemy==2.0.23
```

### Step 2: Initialize Database
```bash
python scripts\init_auth.py
```

This creates:
- ✅ Database with users, roles, and permissions tables
- ✅ Default admin user (username: `admin`, password: `admin123`)
- ✅ 3 default roles with appropriate permissions
- ✅ 20+ default permissions for all features

### Step 3: Start Application
```bash
python main.py
```

Navigate to: http://localhost:8000/login

## 🔑 Default Login Credentials

```
Username: admin
Password: admin123
```

⚠️ **IMPORTANT**: Change the admin password immediately after first login!

## 📋 How It Works

### For Regular Users:
1. **Login Required**: All features require authentication
2. **Permission-Based Access**: Menu items show only if you have permission
3. **Role Assignment**: Admin assigns roles that grant permissions

### For Admins:
1. **Full Access**: Admins have access to all features automatically
2. **User Management**: Create users, assign roles via `/admin` page
3. **Role Management**: View and manage roles and permissions
4. **No Restrictions**: Admin flag bypasses all permission checks

## 🎯 Default Permissions

### Menu Permissions
- **Chat**: `generate.write`
- **BYOD (Documents)**: `documents.read`
- **Data Insights**: `metabase.read`
- **Models**: `models.read`
- **Training**: `training.read`
- **Templates**: `templates.read`
- **Analytics**: `analytics.read`
- **Admin Panel**: Admin only

### Available Permissions
Each resource has read, write, and optionally delete permissions:
- `models.*` - Model management
- `generate.*` - Text generation
- `documents.*` - Document management
- `training.*` - Model training
- `datasets.*` - Dataset management
- `templates.*` - Template management
- `analytics.read` - Analytics access
- `metabase.*` - Dashboard access

## 👥 Creating Users (Admin Only)

### Via Web Interface:
1. Login as admin
2. Navigate to `/admin`
3. Click "Add User"
4. Fill in user details
5. Assign appropriate roles

### Via API:
```bash
curl -X POST http://localhost:8000/auth/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "user@example.com",
    "password": "password123",
    "full_name": "New User",
    "is_active": true,
    "is_admin": false
  }'
```

## 🔄 Typical Workflow

### Setting Up a New User:
1. **Admin creates user** → User account created
2. **Admin assigns role** → User gets permissions (Viewer/User/PowerUser)
3. **User logs in** → Sees only permitted menu items
4. **User uses features** → Access controlled by permissions

### Example Scenarios:

**Scenario 1: Read-Only User**
- Assign "Viewer" role
- Can see all menus but cannot modify anything
- Perfect for auditors or observers

**Scenario 2: Standard User**
- Assign "User" role
- Can use chat, upload documents, create templates
- Cannot delete resources or access admin functions

**Scenario 3: Power User**
- Assign "PowerUser" role
- Full access to all features
- Cannot manage users or roles (not admin)

**Scenario 4: Administrator**
- Set `is_admin=True`
- Automatic access to everything
- Can manage users, roles, and permissions

## 🛡️ Security Features

### Implemented:
- ✅ JWT tokens with 24-hour expiration
- ✅ Bcrypt password hashing with salt
- ✅ Secure session management
- ✅ Protected API endpoints
- ✅ RBAC with fine-grained permissions
- ✅ Automatic 401 redirect to login
- ✅ Token stored in localStorage

### Best Practices:
- Change default admin password
- Set strong SECRET_KEY in production
- Use HTTPS in production
- Regular permission audits
- Follow principle of least privilege

## 📱 Frontend Features

### Login Page (`/login`)
- Clean, modern UI
- Form validation
- Error handling
- Remember credentials option

### Admin Panel (`/admin`)
- User management table
- Role assignment interface
- Permission viewing
- User creation/deletion
- Real-time updates

### Protected Routes
All routes automatically check permissions:
```typescript
<ProtectedRoute resource="models" action="read">
  <ModelsPage />
</ProtectedRoute>
```

### Dynamic Menu
Menu items show/hide based on user permissions:
- Home - Always visible
- Other items - Show only with permission
- Admin Panel - Only for admins

## 🔧 Customization

### Add Custom Role:
1. Go to `/admin` → Roles tab
2. Create new role
3. Assign specific permissions
4. Assign role to users

### Add Custom Permission:
```python
from core.database import SessionLocal
from core.auth_models import Permission

db = SessionLocal()
perm = Permission(
    name="custom.action",
    resource="custom",
    action="action",
    description="Custom permission"
)
db.add(perm)
db.commit()
```

### Protect New Route:
```python
# Backend
@router.get("/new-feature", 
    dependencies=[Depends(ResourcePermissionChecker("custom", "read"))])
async def new_feature(user: User = Depends(get_current_user)):
    pass

# Frontend  
<ProtectedRoute resource="custom" action="read">
  <NewFeature />
</ProtectedRoute>
```

## 🆘 Troubleshooting

### Can't Login
- ✅ Verify credentials
- ✅ Check database exists: `data/auth.db`
- ✅ Run init script if needed
- ✅ Check server logs

### Permission Denied
- ✅ Check user has required role
- ✅ Verify permission exists
- ✅ Contact admin for access
- ✅ Check if user is active

### Menu Items Missing
- ✅ Normal - you don't have permission
- ✅ Ask admin for access
- ✅ Check assigned roles
- ✅ Verify permissions

### Token Expired
- ✅ Login again (24-hour expiry)
- ✅ Automatic on page refresh
- ✅ No data loss

## 📚 Additional Resources

- **Full Setup Guide**: `AUTH_SETUP.md`
- **Implementation Details**: `AUTH_IMPLEMENTATION.md`
- **API Documentation**: http://localhost:8000/docs
- **Test Script**: `scripts/test_auth.py`

## ✨ Key Features Summary

### Without Access:
- ❌ Cannot use any features
- ❌ Cannot see application pages
- ❌ Redirected to login

### With Viewer Role:
- ✅ See all menus
- ✅ View all content
- ❌ Cannot modify anything

### With User Role:
- ✅ Full read access
- ✅ Create and edit content
- ❌ Cannot delete
- ❌ Cannot access admin

### With PowerUser Role:
- ✅ Full feature access
- ✅ Create, edit, delete
- ❌ Cannot manage users

### With Admin Flag:
- ✅ Everything above
- ✅ User management
- ✅ Role management
- ✅ Permission control

## 🎉 Success Checklist

After setup, verify:
- [ ] Can login with admin/admin123
- [ ] Can see admin panel at `/admin`
- [ ] Can create new user
- [ ] Can assign role to user
- [ ] New user can login
- [ ] Menu items match permissions
- [ ] Logout works correctly
- [ ] Token persists on refresh
- [ ] 401 redirects to login
- [ ] Admin password changed

## 📞 Support

Run test script to verify setup:
```bash
python scripts\test_auth.py
```

This will verify:
- Database initialized correctly
- Admin user created
- Permissions loaded
- Roles configured
- JWT tokens working

All tests should pass ✅

---

**You're all set!** 🚀 The authentication system is ready to use.
