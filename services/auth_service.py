"""
Authentication service for user management and JWT token handling.
"""
from datetime import datetime, timedelta
from typing import Optional, List
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from auth.models import User, Role, Permission
from schemas.auth_schemas import UserCreate, UserUpdate, TokenData
import os

# Security configurations
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production-please-use-strong-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    """Service for authentication and user management."""

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def get_password_hash(password: str) -> str:
        """Hash a password."""
        return pwd_context.hash(password)

    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT access token."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    @staticmethod
    def decode_access_token(token: str) -> TokenData:
        """Decode and validate a JWT access token."""
        from utils.logger import get_logger
        logger = get_logger(__name__)
        
        try:
            logger.info(f"[decode_access_token] Attempting to decode token...")
            logger.info(f"[decode_access_token] Using SECRET_KEY: {SECRET_KEY[:20]}...")
            logger.info(f"[decode_access_token] Using ALGORITHM: {ALGORITHM}")
            
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            
            logger.info(f"[decode_access_token] Token decoded successfully, payload: {payload}")
            
            user_id_raw = payload.get("sub")
            # Handle both string and integer sub (for backwards compatibility)
            if isinstance(user_id_raw, str):
                user_id = int(user_id_raw)
            else:
                user_id = user_id_raw
                
            username: str = payload.get("username")
            is_admin: bool = payload.get("is_admin", False)
            
            if user_id is None:
                logger.error(f"[decode_access_token] Token missing 'sub' field")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication credentials - missing user ID",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            logger.info(f"[decode_access_token] Token valid for user_id: {user_id}, username: {username}, is_admin: {is_admin}")
            return TokenData(user_id=user_id, username=username, is_admin=is_admin)
            
        except JWTError as e:
            logger.error(f"[decode_access_token] JWT decode error: {type(e).__name__}: {str(e)}")
            logger.error(f"[decode_access_token] Token might be expired, malformed, or signed with different key")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid authentication credentials - JWT error: {type(e).__name__}",
                headers={"WWW-Authenticate": "Bearer"},
            )

    @staticmethod
    def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
        """Authenticate a user with username and password."""
        user = db.query(User).filter(User.username == username).first()
        if not user:
            return None
        if not AuthService.verify_password(password, user.hashed_password):
            return None
        if not user.is_active:
            return None
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.commit()
        
        return user

    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
        """Get user by ID."""
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_user_by_username(db: Session, username: str) -> Optional[User]:
        """Get user by username."""
        return db.query(User).filter(User.username == username).first()

    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        """Get user by email."""
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
        """Get list of users."""
        return db.query(User).offset(skip).limit(limit).all()

    @staticmethod
    def create_user(db: Session, user_data: UserCreate) -> User:
        """Create a new user."""
        # Check if username exists
        if AuthService.get_user_by_username(db, user_data.username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
        
        # Check if email exists
        if AuthService.get_user_by_email(db, user_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create user
        hashed_password = AuthService.get_password_hash(user_data.password)
        db_user = User(
            username=user_data.username,
            email=user_data.email,
            full_name=user_data.full_name,
            hashed_password=hashed_password,
            is_active=user_data.is_active,
            is_admin=user_data.is_admin
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    @staticmethod
    def update_user(db: Session, user_id: int, user_data: UserUpdate) -> User:
        """Update a user."""
        user = AuthService.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update fields
        update_data = user_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
        
        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def delete_user(db: Session, user_id: int) -> bool:
        """Delete a user."""
        user = AuthService.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        db.delete(user)
        db.commit()
        return True

    @staticmethod
    def change_password(db: Session, user_id: int, current_password: str, new_password: str) -> bool:
        """Change user password."""
        user = AuthService.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verify current password
        if not AuthService.verify_password(current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect password"
            )
        
        # Update password
        user.hashed_password = AuthService.get_password_hash(new_password)
        user.updated_at = datetime.utcnow()
        db.commit()
        return True

    @staticmethod
    def assign_roles_to_user(db: Session, user_id: int, role_ids: List[int]) -> User:
        """Assign roles to a user."""
        user = AuthService.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Get roles
        roles = db.query(Role).filter(Role.id.in_(role_ids)).all()
        if len(roles) != len(role_ids):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One or more roles not found"
            )
        
        # Assign roles
        user.roles = roles
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def get_user_permissions(db: Session, user_id: int) -> List[str]:
        """Get all permissions for a user (from all their roles)."""
        user = AuthService.get_user_by_id(db, user_id)
        if not user:
            return []
        
        # Collect all unique permissions from all roles
        permissions = set()
        for role in user.roles:
            for permission in role.permissions:
                permissions.add(permission.name)
        
        return list(permissions)

    @staticmethod
    def has_permission(db: Session, user_id: int, permission_name: str) -> bool:
        """Check if user has a specific permission."""
        user = AuthService.get_user_by_id(db, user_id)
        if not user:
            return False
        
        # Admins have all permissions
        if user.is_admin:
            return True
        
        # Check if user has permission through any role
        for role in user.roles:
            for permission in role.permissions:
                if permission.name == permission_name:
                    return True
        
        return False


# Singleton instance
_auth_service = AuthService()


def get_auth_service() -> AuthService:
    """Get the authentication service instance."""
    return _auth_service
