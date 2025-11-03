"""
Authentication and authorization API routes.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from auth.database import get_db
from auth.models import User
from auth.dependencies import get_current_user, get_current_admin_user, ResourcePermissionChecker
from services.auth_service import get_auth_service, AuthService, ACCESS_TOKEN_EXPIRE_MINUTES
from services.role_permission_service import get_role_permission_service, RolePermissionService
from schemas.auth_schemas import (
    LoginRequest, LoginResponse, Token,
    UserCreate, UserUpdate, UserResponse, UserListResponse,
    RoleCreate, RoleUpdate, RoleResponse, RoleListResponse,
    PermissionCreate, PermissionUpdate, PermissionResponse, PermissionListResponse,
    AssignRolesToUserRequest, AssignPermissionsToRoleRequest, AssignUsersToRoleRequest,
    ChangePasswordRequest
)
from datetime import timedelta

router = APIRouter(prefix="/auth", tags=["Authentication & Authorization"])


# ============================================================================
# Authentication Endpoints
# ============================================================================

@router.post(
    "/login",
    response_model=LoginResponse,
    summary="User login",
    description="Authenticate user and return JWT access token"
)
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
):
    """
    Authenticate user with username and password.
    Returns JWT access token on success.
    """
    user = auth_service.authenticate_user(db, login_data.username, login_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Refresh user from database to get relationships
    from auth.models import User
    user = db.query(User).filter(User.id == user.id).first()
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_service.create_access_token(
        data={
            "sub": str(user.id),  # JWT spec requires 'sub' to be a string
            "username": user.username,
            "is_admin": user.is_admin
        },
        expires_delta=access_token_expires
    )
    
    # Get user permissions
    permissions = auth_service.get_user_permissions(db, user.id)
    
    # Build response
    user_response = UserResponse.model_validate(user)
    user_response.permissions = permissions
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user",
    description="Get information about the currently authenticated user"
)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Get current authenticated user information."""
    from utils.logger import get_logger
    logger = get_logger(__name__)
    
    logger.info(f"[/auth/me] Current user: {current_user.username}, is_admin: {current_user.is_admin}")
    
    # Refresh user from database to get relationships
    from auth.models import User
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    logger.info(f"[/auth/me] Refreshed user: {user.username}, is_admin: {user.is_admin}")
    
    # Get permissions
    permissions = auth_service.get_user_permissions(db, user.id)
    
    # Build response
    user_response = UserResponse.model_validate(user)
    user_response.permissions = permissions
    
    return user_response


@router.get(
    "/debug/token",
    summary="Debug token info",
    description="Debug endpoint to show token decoding details"
)
async def debug_token(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """Debug endpoint to check token parsing."""
    from utils.logger import get_logger
    logger = get_logger(__name__)
    
    auth_header = request.headers.get("authorization")
    logger.info(f"[/auth/debug/token] Authorization header: {auth_header[:50] if auth_header else 'None'}...")
    logger.info(f"[/auth/debug/token] Current user: {current_user.username}, is_admin: {current_user.is_admin}")
    
    return {
        "user_id": current_user.id,
        "username": current_user.username,
        "is_admin": current_user.is_admin,
        "is_active": current_user.is_active,
        "auth_header_present": auth_header is not None,
        "auth_header_starts_with_bearer": auth_header.startswith("Bearer ") if auth_header else False
    }


@router.get(
    "/debug/permission-test",
    summary="Debug permission check",
    description="Test endpoint with models.read permission requirement",
    dependencies=[Depends(ResourcePermissionChecker("models", "read"))]
)
async def debug_permission_test(
    current_user: User = Depends(get_current_user)
):
    """Debug endpoint to test permission checking."""
    from utils.logger import get_logger
    logger = get_logger(__name__)
    
    logger.info(f"[/auth/debug/permission-test] Reached! User: {current_user.username}, is_admin: {current_user.is_admin}")
    
    return {
        "message": "Permission check passed!",
        "user": current_user.username,
        "is_admin": current_user.is_admin
    }
    user_response.permissions = permissions
    return user_response


@router.post(
    "/change-password",
    summary="Change password",
    description="Change the password for the current user"
)
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Change current user's password."""
    auth_service.change_password(
        db,
        current_user.id,
        password_data.current_password,
        password_data.new_password
    )
    return {"message": "Password changed successfully"}


# ============================================================================
# User Management Endpoints (Admin Only)
# ============================================================================

@router.get(
    "/users",
    response_model=UserListResponse,
    summary="List users",
    description="Get list of all users (admin only)"
)
async def list_users(
    skip: int = 0,
    limit: int = 100,
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Get list of all users (admin only)."""
    users = auth_service.get_users(db, skip=skip, limit=limit)
    total = db.query(User).count()
    
    # Add permissions to each user
    user_responses = []
    for user in users:
        permissions = auth_service.get_user_permissions(db, user.id)
        user_response = UserResponse.model_validate(user)
        user_response.permissions = permissions
        user_responses.append(user_response)
    
    return UserListResponse(users=user_responses, total=total)


@router.post(
    "/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create user",
    description="Create a new user (admin only)"
)
async def create_user(
    user_data: UserCreate,
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Create a new user (admin only)."""
    user = auth_service.create_user(db, user_data)
    permissions = auth_service.get_user_permissions(db, user.id)
    user_response = UserResponse.model_validate(user)
    user_response.permissions = permissions
    return user_response


@router.get(
    "/users/{user_id}",
    response_model=UserResponse,
    summary="Get user",
    description="Get user by ID (admin only)"
)
async def get_user(
    user_id: int,
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Get user by ID (admin only)."""
    user = auth_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    permissions = auth_service.get_user_permissions(db, user.id)
    user_response = UserResponse.model_validate(user)
    user_response.permissions = permissions
    return user_response


@router.put(
    "/users/{user_id}",
    response_model=UserResponse,
    summary="Update user",
    description="Update user by ID (admin only)"
)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Update user by ID (admin only)."""
    user = auth_service.update_user(db, user_id, user_data)
    permissions = auth_service.get_user_permissions(db, user.id)
    user_response = UserResponse.model_validate(user)
    user_response.permissions = permissions
    return user_response


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete user",
    description="Delete user by ID (admin only)"
)
async def delete_user(
    user_id: int,
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Delete user by ID (admin only)."""
    auth_service.delete_user(db, user_id)
    return None


@router.post(
    "/users/{user_id}/roles",
    response_model=UserResponse,
    summary="Assign roles to user",
    description="Assign roles to a user (admin only)"
)
async def assign_roles_to_user(
    user_id: int,
    request: AssignRolesToUserRequest,
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
):
    """Assign roles to a user (admin only)."""
    user = auth_service.assign_roles_to_user(db, user_id, request.role_ids)
    permissions = auth_service.get_user_permissions(db, user.id)
    user_response = UserResponse.model_validate(user)
    user_response.permissions = permissions
    return user_response


# ============================================================================
# Role Management Endpoints (Admin Only)
# ============================================================================

@router.get(
    "/roles",
    response_model=RoleListResponse,
    summary="List roles",
    description="Get list of all roles (admin only)"
)
async def list_roles(
    skip: int = 0,
    limit: int = 100,
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    service: RolePermissionService = Depends(get_role_permission_service)
):
    """Get list of all roles (admin only)."""
    from auth.models import Role
    roles = service.get_roles(db, skip=skip, limit=limit)
    total = db.query(Role).count()
    return RoleListResponse(roles=[RoleResponse.model_validate(r) for r in roles], total=total)


@router.post(
    "/roles",
    response_model=RoleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create role",
    description="Create a new role (admin only)"
)
async def create_role(
    role_data: RoleCreate,
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    service: RolePermissionService = Depends(get_role_permission_service)
):
    """Create a new role (admin only)."""
    role = service.create_role(db, role_data)
    return RoleResponse.model_validate(role)


@router.get(
    "/roles/{role_id}",
    response_model=RoleResponse,
    summary="Get role",
    description="Get role by ID (admin only)"
)
async def get_role(
    role_id: int,
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    service: RolePermissionService = Depends(get_role_permission_service)
):
    """Get role by ID (admin only)."""
    role = service.get_role_by_id(db, role_id)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )
    return RoleResponse.model_validate(role)


@router.put(
    "/roles/{role_id}",
    response_model=RoleResponse,
    summary="Update role",
    description="Update role by ID (admin only)"
)
async def update_role(
    role_id: int,
    role_data: RoleUpdate,
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    service: RolePermissionService = Depends(get_role_permission_service)
):
    """Update role by ID (admin only)."""
    role = service.update_role(db, role_id, role_data)
    return RoleResponse.model_validate(role)


@router.delete(
    "/roles/{role_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete role",
    description="Delete role by ID (admin only)"
)
async def delete_role(
    role_id: int,
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    service: RolePermissionService = Depends(get_role_permission_service)
):
    """Delete role by ID (admin only)."""
    service.delete_role(db, role_id)
    return None


@router.post(
    "/roles/{role_id}/permissions",
    response_model=RoleResponse,
    summary="Assign permissions to role",
    description="Assign permissions to a role (admin only)"
)
async def assign_permissions_to_role(
    role_id: int,
    request: AssignPermissionsToRoleRequest,
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    service: RolePermissionService = Depends(get_role_permission_service)
):
    """Assign permissions to a role (admin only)."""
    role = service.assign_permissions_to_role(db, role_id, request.permission_ids)
    return RoleResponse.model_validate(role)


@router.post(
    "/roles/{role_id}/users",
    response_model=RoleResponse,
    summary="Assign users to role",
    description="Assign users to a role (admin only)"
)
async def assign_users_to_role(
    role_id: int,
    request: AssignUsersToRoleRequest,
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    service: RolePermissionService = Depends(get_role_permission_service)
):
    """Assign users to a role (admin only)."""
    role = service.assign_users_to_role(db, role_id, request.user_ids)
    return RoleResponse.model_validate(role)


# ============================================================================
# Permission Management Endpoints (Admin Only)
# ============================================================================

@router.get(
    "/permissions",
    response_model=PermissionListResponse,
    summary="List permissions",
    description="Get list of all permissions (admin only)"
)
async def list_permissions(
    skip: int = 0,
    limit: int = 100,
    resource: str = None,
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    service: RolePermissionService = Depends(get_role_permission_service)
):
    """Get list of all permissions (admin only)."""
    from auth.models import Permission
    if resource:
        permissions = service.get_permissions_by_resource(db, resource)
        total = len(permissions)
    else:
        permissions = service.get_permissions(db, skip=skip, limit=limit)
        total = db.query(Permission).count()
    
    return PermissionListResponse(
        permissions=[PermissionResponse.model_validate(p) for p in permissions],
        total=total
    )


@router.post(
    "/permissions",
    response_model=PermissionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create permission",
    description="Create a new permission (admin only)"
)
async def create_permission(
    permission_data: PermissionCreate,
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    service: RolePermissionService = Depends(get_role_permission_service)
):
    """Create a new permission (admin only)."""
    permission = service.create_permission(db, permission_data)
    return PermissionResponse.model_validate(permission)


@router.get(
    "/permissions/{permission_id}",
    response_model=PermissionResponse,
    summary="Get permission",
    description="Get permission by ID (admin only)"
)
async def get_permission(
    permission_id: int,
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    service: RolePermissionService = Depends(get_role_permission_service)
):
    """Get permission by ID (admin only)."""
    permission = service.get_permission_by_id(db, permission_id)
    if not permission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission not found"
        )
    return PermissionResponse.model_validate(permission)


@router.put(
    "/permissions/{permission_id}",
    response_model=PermissionResponse,
    summary="Update permission",
    description="Update permission by ID (admin only)"
)
async def update_permission(
    permission_id: int,
    permission_data: PermissionUpdate,
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    service: RolePermissionService = Depends(get_role_permission_service)
):
    """Update permission by ID (admin only)."""
    permission = service.update_permission(db, permission_id, permission_data)
    return PermissionResponse.model_validate(permission)


@router.delete(
    "/permissions/{permission_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete permission",
    description="Delete permission by ID (admin only)"
)
async def delete_permission(
    permission_id: int,
    _: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    service: RolePermissionService = Depends(get_role_permission_service)
):
    """Delete permission by ID (admin only)."""
    service.delete_permission(db, permission_id)
    return None
