"""
Authentication middleware and dependencies for FastAPI.
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from auth.database import get_db
from auth.models import User
from services.auth_service import get_auth_service, AuthService
from schemas.auth_schemas import TokenData

# HTTP Bearer security scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
) -> User:
    """
    Dependency to get the current authenticated user from JWT token.
    
    Args:
        credentials: HTTP Bearer token from request header
        db: Database session
        auth_service: Authentication service
    
    Returns:
        Current authenticated user
    
    Raises:
        HTTPException: If token is invalid or user not found
    """
    from utils.logger import get_logger
    logger = get_logger(__name__)
    
    token = credentials.credentials
    logger.info(f"[get_current_user] Token received: {token[:20]}...")
    
    # Decode token
    try:
        token_data: TokenData = auth_service.decode_access_token(token)
        logger.info(f"[get_current_user] Token decoded, user_id: {token_data.user_id}")
    except Exception as e:
        logger.error(f"[get_current_user] Token decode failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials u",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    user = auth_service.get_user_by_id(db, token_data.user_id)
    if user is None:
        logger.error(f"[get_current_user] User not found for id: {token_data.user_id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    logger.info(f"[get_current_user] User found: {user.username}, is_admin: {user.is_admin}")
    
    # Check if user is active
    if not user.is_active:
        logger.error(f"[get_current_user] User inactive: {user.username}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to get the current active user.
    
    Args:
        current_user: Current user from get_current_user dependency
    
    Returns:
        Current active user
    
    Raises:
        HTTPException: If user is inactive
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user


async def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to get the current admin user.
    
    Args:
        current_user: Current user from get_current_user dependency
    
    Returns:
        Current admin user
    
    Raises:
        HTTPException: If user is not an admin
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user


class PermissionChecker:
    """Dependency class to check if user has specific permission."""
    
    def __init__(self, permission_name: str):
        """
        Initialize permission checker.
        
        Args:
            permission_name: Name of the permission to check
        """
        self.permission_name = permission_name
    
    async def __call__(
        self,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
        auth_service: AuthService = Depends(get_auth_service)
    ) -> User:
        """
        Check if current user has the required permission.
        
        Args:
            current_user: Current authenticated user
            db: Database session
            auth_service: Authentication service
        
        Returns:
            Current user if they have the permission
        
        Raises:
            HTTPException: If user doesn't have the required permission
        """
        # Admins have all permissions
        if current_user.is_admin:
            return current_user
        
        # Check if user has the specific permission
        has_permission = auth_service.has_permission(
            db, current_user.id, self.permission_name
        )
        
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {self.permission_name} required"
            )
        
        return current_user


class ResourcePermissionChecker:
    """Dependency class to check if user has permission for a specific resource and action."""
    
    def __init__(self, resource: str, action: str):
        """
        Initialize resource permission checker.
        
        Args:
            resource: Resource name (e.g., 'models', 'documents')
            action: Action name (e.g., 'read', 'write', 'delete')
        """
        self.resource = resource
        self.action = action
        self.permission_name = f"{resource}.{action}"
    
    async def __call__(
        self,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
        auth_service: AuthService = Depends(get_auth_service)
    ) -> User:
        """
        Check if current user has the required resource permission.
        
        Args:
            current_user: Current authenticated user
            db: Database session
            auth_service: Authentication service
        
        Returns:
            Current user if they have the permission
        
        Raises:
            HTTPException: If user doesn't have the required permission
        """
        from utils.logger import get_logger
        logger = get_logger(__name__)
        
        logger.info(f"[ResourcePermissionChecker] Checking {self.resource}.{self.action} for user: {current_user.username}")
        logger.info(f"[ResourcePermissionChecker] User is_admin: {current_user.is_admin}")
        
        # Admins have all permissions
        if current_user.is_admin:
            logger.info(f"[ResourcePermissionChecker] Admin user - granting access")
            return current_user
        
        logger.info(f"[ResourcePermissionChecker] Not admin - checking specific permission")
        
        # Check if user has the specific permission
        has_permission = auth_service.has_permission(
            db, current_user.id, self.permission_name
        )
        
        logger.info(f"[ResourcePermissionChecker] Permission check result: {has_permission}")
        
        if not has_permission:
            logger.error(f"[ResourcePermissionChecker] Permission denied for user {current_user.username}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {self.resource} {self.action} access required"
            )
        
        return current_user


# Optional authentication (doesn't raise error if no token provided)
async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db),
    auth_service: AuthService = Depends(get_auth_service)
) -> Optional[User]:
    """
    Dependency to optionally get the current user if token is provided.
    Returns None if no token is provided.
    
    Args:
        credentials: Optional HTTP Bearer token
        db: Database session
        auth_service: Authentication service
    
    Returns:
        Current user or None
    """
    if credentials is None:
        return None
    
    try:
        token = credentials.credentials
        token_data: TokenData = auth_service.decode_access_token(token)
        user = auth_service.get_user_by_id(db, token_data.user_id)
        if user and user.is_active:
            return user
    except:
        pass
    
    return None
