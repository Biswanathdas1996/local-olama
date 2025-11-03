# Authentication System Setup Guide

## Overview

A comprehensive authentication and authorization system has been added to the LLM-365 platform with the following features:

- **User Authentication**: Login/logout with JWT tokens
- **Role-Based Access Control (RBAC)**: Define roles with specific permissions
- **Fine-Grained Permissions**: Control access to specific resources and actions
- **Admin Panel**: Manage users, roles, and permissions
- **Protected Routes**: Both frontend and backend routes are protected

## Initial Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

New dependencies added:
- `python-jose[cryptography]` - JWT token handling
- `passlib[bcrypt]` - Password hashing
- `sqlalchemy` - Database ORM
- `alembic` - Database migrations
- `bcrypt` - Password encryption

### 2. Initialize the Database

Run the initialization script to create the database and default data:

```bash
python scripts/init_auth.py
```

This will create:
- Database tables for users, roles, and permissions
- Default permissions for all resources
- Three default roles:
  - **Viewer**: Read-only access
  - **User**: Read and write access to most features
  - **PowerUser**: Full access except admin functions
- Default admin account:
  - Username: `admin`
  - Password: `admin123`

⚠️ **IMPORTANT**: Change the admin password immediately after first login!

### 3. Environment Variables (Optional)

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=sqlite:///./data/auth.db

# Security
SECRET_KEY=your-super-secret-key-change-this-in-production

# Admin Credentials (for init script)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

### 4. Start the Application

```bash
python main.py
```

The authentication system will initialize automatically on startup.

## Default Permissions

The system includes the following resource permissions:

### Models
- `models.read` - View and list models
- `models.write` - Download and manage models
- `models.delete` - Delete models

### Generation
- `generate.read` - View generation history
- `generate.write` - Generate text with models

### Documents
- `documents.read` - View documents
- `documents.write` - Upload and manage documents
- `documents.delete` - Delete documents

### Training
- `training.read` - View training data and status
- `training.write` - Create and manage training
- `training.delete` - Delete training data

### Analytics
- `analytics.read` - View analytics and reports

### Datasets
- `datasets.read` - View datasets
- `datasets.write` - Create and manage datasets
- `datasets.delete` - Delete datasets

### Templates
- `templates.read` - View templates
- `templates.write` - Create and manage templates
- `templates.delete` - Delete templates

### Metabase
- `metabase.read` - View Metabase dashboards
- `metabase.write` - Manage Metabase dashboards

## Default Roles

### Viewer
Can view all content but cannot modify anything.

### User
Standard user with read and write access to most features. Cannot delete resources or access admin functions.

### PowerUser
Advanced user with full access to all features except admin functions (user management, role management, etc.).

### Admin
Full access to all features including user and permission management. Automatically has all permissions.

## Usage

### Frontend Routes

All application routes are now protected and require authentication:

- `/login` - Login page (public)
- `/chat` - Chat interface (requires `generate.write`)
- `/documents` - Document management (requires `documents.read`)
- `/models` - Model management (requires `models.read`)
- `/training` - Training management (requires `training.read`)
- `/templates` - Template management (requires `templates.read`)
- `/analytics` - Analytics dashboard (requires `analytics.read`)
- `/metabase` - Metabase integration (requires `metabase.read`)
- `/admin` - Admin panel (admin only)

### API Endpoints

#### Authentication

```bash
# Login
POST /auth/login
{
  "username": "admin",
  "password": "admin123"
}

# Get current user
GET /auth/me
Authorization: Bearer <token>

# Change password
POST /auth/change-password
Authorization: Bearer <token>
{
  "current_password": "old_password",
  "new_password": "new_password"
}
```

#### User Management (Admin Only)

```bash
# List users
GET /auth/users

# Create user
POST /auth/users
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "password123",
  "full_name": "New User",
  "is_active": true,
  "is_admin": false
}

# Update user
PUT /auth/users/{user_id}
{
  "email": "newemail@example.com",
  "is_active": true
}

# Delete user
DELETE /auth/users/{user_id}

# Assign roles to user
POST /auth/users/{user_id}/roles
{
  "role_ids": [1, 2]
}
```

#### Role Management (Admin Only)

```bash
# List roles
GET /auth/roles

# Create role
POST /auth/roles
{
  "name": "Custom Role",
  "description": "Custom role description",
  "permission_ids": [1, 2, 3]
}

# Assign permissions to role
POST /auth/roles/{role_id}/permissions
{
  "permission_ids": [1, 2, 3]
}
```

#### Permission Management (Admin Only)

```bash
# List permissions
GET /auth/permissions

# List permissions by resource
GET /auth/permissions?resource=models
```

## Customization

### Adding New Permissions

1. Create permissions in the database:

```python
from core.database import SessionLocal
from core.auth_models import Permission

db = SessionLocal()
permission = Permission(
    name="custom.action",
    resource="custom",
    action="action",
    description="Description of the permission"
)
db.add(permission)
db.commit()
```

2. Protect routes with the new permission:

```python
# Backend
@router.get("/custom", dependencies=[Depends(ResourcePermissionChecker("custom", "action"))])
async def custom_endpoint(current_user: User = Depends(get_current_user)):
    pass

# Frontend
<ProtectedRoute resource="custom" action="action">
  <CustomComponent />
</ProtectedRoute>
```

### Creating Custom Roles

Use the admin panel or API to create custom roles:

1. Go to `/admin` in the web interface
2. Navigate to the "Roles" tab
3. Create a new role and assign permissions

Or use the API:

```bash
POST /auth/roles
{
  "name": "Custom Role",
  "description": "Description",
  "permission_ids": [1, 2, 3, 4]
}
```

## Security Best Practices

1. **Change Default Password**: Change the admin password immediately after setup
2. **Use Strong Secret Key**: Set a strong `SECRET_KEY` in production
3. **HTTPS Only**: Use HTTPS in production to protect JWT tokens
4. **Token Expiration**: Tokens expire after 24 hours by default
5. **Regular Audits**: Review user permissions regularly
6. **Principle of Least Privilege**: Give users only the permissions they need

## Troubleshooting

### "Authentication required" errors

- Ensure you're logged in and have a valid token
- Check if your token has expired (24 hour default)
- Verify the Authorization header is being sent

### "Permission denied" errors

- Check if your user has the required permission
- Admins have all permissions by default
- Contact an admin to request additional permissions

### Database errors

- Ensure the database is initialized: `python scripts/init_auth.py`
- Check file permissions on `data/auth.db`
- Verify SQLAlchemy is installed: `pip install sqlalchemy`

### Can't login

- Verify credentials are correct
- Check if user is active: `is_active=True`
- Look at server logs for error messages

## Database Schema

The authentication system uses SQLite by default with the following tables:

- `users` - User accounts
- `roles` - Role definitions
- `permissions` - Permission definitions
- `user_roles` - User-Role associations
- `role_permissions` - Role-Permission associations

## Migration from Non-Auth Version

If upgrading from a version without authentication:

1. All existing functionality remains accessible
2. Run the init script to set up authentication
3. All routes now require authentication
4. Create user accounts for all users
5. Assign appropriate roles to users

## Support

For issues or questions:

1. Check the logs: `logs/app.log`
2. Review API documentation: http://localhost:8000/docs
3. Check database: `sqlite3 data/auth.db`
