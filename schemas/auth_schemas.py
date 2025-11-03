"""
Pydantic schemas for authentication and authorization.
"""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


# ============================================================================
# Authentication Schemas
# ============================================================================

class LoginRequest(BaseModel):
    """Login request schema."""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)


class LoginResponse(BaseModel):
    """Login response schema."""
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class ChangePasswordRequest(BaseModel):
    """Change password request schema."""
    current_password: str = Field(..., min_length=6)
    new_password: str = Field(..., min_length=6)


# ============================================================================
# User Schemas
# ============================================================================

class UserBase(BaseModel):
    """Base user schema."""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: Optional[str] = None
    is_active: bool = True


class UserCreate(UserBase):
    """User creation schema."""
    password: str = Field(..., min_length=6)
    is_admin: bool = False


class UserUpdate(BaseModel):
    """User update schema."""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


class UserResponse(UserBase):
    """User response schema."""
    id: int
    is_admin: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    roles: List["RoleResponse"] = []
    permissions: List[str] = []  # List of permission names

    model_config = ConfigDict(from_attributes=True)


class UserListResponse(BaseModel):
    """User list response schema."""
    users: List[UserResponse]
    total: int


# ============================================================================
# Role Schemas
# ============================================================================

class RoleBase(BaseModel):
    """Base role schema."""
    name: str = Field(..., min_length=3, max_length=50)
    description: Optional[str] = None


class RoleCreate(RoleBase):
    """Role creation schema."""
    permission_ids: List[int] = []


class RoleUpdate(BaseModel):
    """Role update schema."""
    name: Optional[str] = Field(None, min_length=3, max_length=50)
    description: Optional[str] = None
    permission_ids: Optional[List[int]] = None


class RoleResponse(RoleBase):
    """Role response schema."""
    id: int
    created_at: datetime
    permissions: List["PermissionResponse"] = []

    model_config = ConfigDict(from_attributes=True)


class RoleListResponse(BaseModel):
    """Role list response schema."""
    roles: List[RoleResponse]
    total: int


# ============================================================================
# Permission Schemas
# ============================================================================

class PermissionBase(BaseModel):
    """Base permission schema."""
    name: str = Field(..., min_length=3, max_length=100)
    resource: str = Field(..., min_length=3, max_length=50)
    action: str = Field(..., min_length=3, max_length=50)
    description: Optional[str] = None


class PermissionCreate(PermissionBase):
    """Permission creation schema."""
    pass


class PermissionUpdate(BaseModel):
    """Permission update schema."""
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    resource: Optional[str] = Field(None, min_length=3, max_length=50)
    action: Optional[str] = Field(None, min_length=3, max_length=50)
    description: Optional[str] = None


class PermissionResponse(PermissionBase):
    """Permission response schema."""
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PermissionListResponse(BaseModel):
    """Permission list response schema."""
    permissions: List[PermissionResponse]
    total: int


# ============================================================================
# Assignment Schemas
# ============================================================================

class AssignRolesToUserRequest(BaseModel):
    """Assign roles to user request schema."""
    role_ids: List[int]


class AssignPermissionsToRoleRequest(BaseModel):
    """Assign permissions to role request schema."""
    permission_ids: List[int]


class AssignUsersToRoleRequest(BaseModel):
    """Assign users to role request schema."""
    user_ids: List[int]


# ============================================================================
# Token Schemas
# ============================================================================

class Token(BaseModel):
    """JWT token schema."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Token data schema for JWT payload."""
    user_id: Optional[int] = None
    username: Optional[str] = None
    is_admin: Optional[bool] = False
