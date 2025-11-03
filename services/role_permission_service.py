"""
Role and Permission management service.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from auth.models import Role, Permission, User
from schemas.auth_schemas import RoleCreate, RoleUpdate, PermissionCreate, PermissionUpdate


class RolePermissionService:
    """Service for role and permission management."""

    # ============================================================================
    # Role Management
    # ============================================================================

    @staticmethod
    def get_role_by_id(db: Session, role_id: int) -> Optional[Role]:
        """Get role by ID."""
        return db.query(Role).filter(Role.id == role_id).first()

    @staticmethod
    def get_role_by_name(db: Session, name: str) -> Optional[Role]:
        """Get role by name."""
        return db.query(Role).filter(Role.name == name).first()

    @staticmethod
    def get_roles(db: Session, skip: int = 0, limit: int = 100) -> List[Role]:
        """Get list of roles."""
        return db.query(Role).offset(skip).limit(limit).all()

    @staticmethod
    def create_role(db: Session, role_data: RoleCreate) -> Role:
        """Create a new role."""
        # Check if role name exists
        if RolePermissionService.get_role_by_name(db, role_data.name):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Role name already exists"
            )
        
        # Create role
        db_role = Role(
            name=role_data.name,
            description=role_data.description
        )
        db.add(db_role)
        db.flush()
        
        # Assign permissions if provided
        if role_data.permission_ids:
            permissions = db.query(Permission).filter(
                Permission.id.in_(role_data.permission_ids)
            ).all()
            if len(permissions) != len(role_data.permission_ids):
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="One or more permissions not found"
                )
            db_role.permissions = permissions
        
        db.commit()
        db.refresh(db_role)
        return db_role

    @staticmethod
    def update_role(db: Session, role_id: int, role_data: RoleUpdate) -> Role:
        """Update a role."""
        role = RolePermissionService.get_role_by_id(db, role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
        
        # Update basic fields
        update_data = role_data.model_dump(exclude_unset=True, exclude={"permission_ids"})
        for field, value in update_data.items():
            setattr(role, field, value)
        
        # Update permissions if provided
        if role_data.permission_ids is not None:
            permissions = db.query(Permission).filter(
                Permission.id.in_(role_data.permission_ids)
            ).all()
            if len(permissions) != len(role_data.permission_ids):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="One or more permissions not found"
                )
            role.permissions = permissions
        
        db.commit()
        db.refresh(role)
        return role

    @staticmethod
    def delete_role(db: Session, role_id: int) -> bool:
        """Delete a role."""
        role = RolePermissionService.get_role_by_id(db, role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
        
        db.delete(role)
        db.commit()
        return True

    @staticmethod
    def assign_permissions_to_role(db: Session, role_id: int, permission_ids: List[int]) -> Role:
        """Assign permissions to a role."""
        role = RolePermissionService.get_role_by_id(db, role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
        
        # Get permissions
        permissions = db.query(Permission).filter(
            Permission.id.in_(permission_ids)
        ).all()
        if len(permissions) != len(permission_ids):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One or more permissions not found"
            )
        
        # Assign permissions
        role.permissions = permissions
        db.commit()
        db.refresh(role)
        return role

    @staticmethod
    def assign_users_to_role(db: Session, role_id: int, user_ids: List[int]) -> Role:
        """Assign users to a role."""
        role = RolePermissionService.get_role_by_id(db, role_id)
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
        
        # Get users
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        if len(users) != len(user_ids):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One or more users not found"
            )
        
        # Assign users
        role.users = users
        db.commit()
        db.refresh(role)
        return role

    # ============================================================================
    # Permission Management
    # ============================================================================

    @staticmethod
    def get_permission_by_id(db: Session, permission_id: int) -> Optional[Permission]:
        """Get permission by ID."""
        return db.query(Permission).filter(Permission.id == permission_id).first()

    @staticmethod
    def get_permission_by_name(db: Session, name: str) -> Optional[Permission]:
        """Get permission by name."""
        return db.query(Permission).filter(Permission.name == name).first()

    @staticmethod
    def get_permissions(db: Session, skip: int = 0, limit: int = 100) -> List[Permission]:
        """Get list of permissions."""
        return db.query(Permission).offset(skip).limit(limit).all()

    @staticmethod
    def get_permissions_by_resource(db: Session, resource: str) -> List[Permission]:
        """Get permissions for a specific resource."""
        return db.query(Permission).filter(Permission.resource == resource).all()

    @staticmethod
    def create_permission(db: Session, permission_data: PermissionCreate) -> Permission:
        """Create a new permission."""
        # Check if permission name exists
        if RolePermissionService.get_permission_by_name(db, permission_data.name):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Permission name already exists"
            )
        
        # Create permission
        db_permission = Permission(
            name=permission_data.name,
            resource=permission_data.resource,
            action=permission_data.action,
            description=permission_data.description
        )
        db.add(db_permission)
        db.commit()
        db.refresh(db_permission)
        return db_permission

    @staticmethod
    def update_permission(db: Session, permission_id: int, permission_data: PermissionUpdate) -> Permission:
        """Update a permission."""
        permission = RolePermissionService.get_permission_by_id(db, permission_id)
        if not permission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Permission not found"
            )
        
        # Update fields
        update_data = permission_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(permission, field, value)
        
        db.commit()
        db.refresh(permission)
        return permission

    @staticmethod
    def delete_permission(db: Session, permission_id: int) -> bool:
        """Delete a permission."""
        permission = RolePermissionService.get_permission_by_id(db, permission_id)
        if not permission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Permission not found"
            )
        
        db.delete(permission)
        db.commit()
        return True


# Singleton instance
_role_permission_service = RolePermissionService()


def get_role_permission_service() -> RolePermissionService:
    """Get the role and permission service instance."""
    return _role_permission_service
