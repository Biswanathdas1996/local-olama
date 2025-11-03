"""
Initialize authentication database with default admin user and permissions.
Run this script once to set up the authentication system.
"""
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from auth.database import SessionLocal, init_db
from auth.models import User, Role, Permission
from services.auth_service import AuthService


def create_default_permissions(db: Session):
    """Create default permissions for all resources."""
    
    permissions_data = [
        # Model permissions
        {"name": "models.read", "resource": "models", "action": "read", "description": "View and list models"},
        {"name": "models.write", "resource": "models", "action": "write", "description": "Download and manage models"},
        {"name": "models.delete", "resource": "models", "action": "delete", "description": "Delete models"},
        
        # Generation permissions
        {"name": "generate.read", "resource": "generate", "action": "read", "description": "View generation history"},
        {"name": "generate.write", "resource": "generate", "action": "write", "description": "Generate text with models"},
        
        # Document permissions
        {"name": "documents.read", "resource": "documents", "action": "read", "description": "View documents"},
        {"name": "documents.write", "resource": "documents", "action": "write", "description": "Upload and manage documents"},
        {"name": "documents.delete", "resource": "documents", "action": "delete", "description": "Delete documents"},
        
        # Training permissions
        {"name": "training.read", "resource": "training", "action": "read", "description": "View training data and status"},
        {"name": "training.write", "resource": "training", "action": "write", "description": "Create and manage training"},
        {"name": "training.delete", "resource": "training", "action": "delete", "description": "Delete training data"},
        
        # Analytics permissions
        {"name": "analytics.read", "resource": "analytics", "action": "read", "description": "View analytics and reports"},
        
        # Dataset permissions
        {"name": "datasets.read", "resource": "datasets", "action": "read", "description": "View datasets"},
        {"name": "datasets.write", "resource": "datasets", "action": "write", "description": "Create and manage datasets"},
        {"name": "datasets.delete", "resource": "datasets", "action": "delete", "description": "Delete datasets"},
        
        # Template permissions
        {"name": "templates.read", "resource": "templates", "action": "read", "description": "View templates"},
        {"name": "templates.write", "resource": "templates", "action": "write", "description": "Create and manage templates"},
        {"name": "templates.delete", "resource": "templates", "action": "delete", "description": "Delete templates"},
        
        # Metabase permissions
        {"name": "metabase.read", "resource": "metabase", "action": "read", "description": "View Metabase dashboards"},
        {"name": "metabase.write", "resource": "metabase", "action": "write", "description": "Manage Metabase dashboards"},
    ]
    
    created_permissions = []
    for perm_data in permissions_data:
        # Check if permission already exists
        existing = db.query(Permission).filter(Permission.name == perm_data["name"]).first()
        if not existing:
            permission = Permission(**perm_data)
            db.add(permission)
            created_permissions.append(perm_data["name"])
    
    db.commit()
    return created_permissions


def create_default_roles(db: Session):
    """Create default roles with appropriate permissions."""
    
    roles_data = [
        {
            "name": "Viewer",
            "description": "Can view all content but cannot modify anything",
            "permissions": [
                "models.read", "generate.read", "documents.read",
                "training.read", "analytics.read", "datasets.read",
                "templates.read", "metabase.read"
            ]
        },
        {
            "name": "User",
            "description": "Standard user with read and write access to most features",
            "permissions": [
                "models.read", "models.write",
                "generate.read", "generate.write",
                "documents.read", "documents.write",
                "training.read", "training.write",
                "analytics.read",
                "datasets.read", "datasets.write",
                "templates.read", "templates.write",
                "metabase.read"
            ]
        },
        {
            "name": "PowerUser",
            "description": "Advanced user with full access except admin functions",
            "permissions": [
                "models.read", "models.write", "models.delete",
                "generate.read", "generate.write",
                "documents.read", "documents.write", "documents.delete",
                "training.read", "training.write", "training.delete",
                "analytics.read",
                "datasets.read", "datasets.write", "datasets.delete",
                "templates.read", "templates.write", "templates.delete",
                "metabase.read", "metabase.write"
            ]
        }
    ]
    
    created_roles = []
    for role_data in roles_data:
        # Check if role already exists
        existing = db.query(Role).filter(Role.name == role_data["name"]).first()
        if not existing:
            role = Role(
                name=role_data["name"],
                description=role_data["description"]
            )
            db.add(role)
            db.flush()
            
            # Assign permissions
            permissions = db.query(Permission).filter(
                Permission.name.in_(role_data["permissions"])
            ).all()
            role.permissions = permissions
            
            created_roles.append(role_data["name"])
    
    db.commit()
    return created_roles


def create_default_admin(db: Session, username: str = "admin", password: str = "admin123"):
    """Create default admin user."""
    
    # Check if admin user already exists
    existing = db.query(User).filter(User.username == username).first()
    if existing:
        print(f"⚠️  Admin user '{username}' already exists")
        return None
    
    # Create admin user
    hashed_password = AuthService.get_password_hash(password)
    admin = User(
        username=username,
        email="admin@example.com",
        full_name="System Administrator",
        hashed_password=hashed_password,
        is_active=True,
        is_admin=True
    )
    db.add(admin)
    db.commit()
    
    return admin


def main():
    """Main initialization function."""
    print("=" * 60)
    print("Initializing Authentication System")
    print("=" * 60)
    
    # Create database tables
    print("\n📦 Creating database tables...")
    init_db()
    print("✅ Database tables created")
    
    # Create session
    db = SessionLocal()
    
    try:
        # Create default permissions
        print("\n🔑 Creating default permissions...")
        permissions = create_default_permissions(db)
        if permissions:
            print(f"✅ Created {len(permissions)} permissions:")
            for perm in permissions:
                print(f"   - {perm}")
        else:
            print("✅ All permissions already exist")
        
        # Create default roles
        print("\n👥 Creating default roles...")
        roles = create_default_roles(db)
        if roles:
            print(f"✅ Created {len(roles)} roles:")
            for role in roles:
                print(f"   - {role}")
        else:
            print("✅ All roles already exist")
        
        # Create default admin user
        print("\n👤 Creating default admin user...")
        admin_username = os.getenv("ADMIN_USERNAME", "admin")
        admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
        
        admin = create_default_admin(db, admin_username, admin_password)
        if admin:
            print(f"✅ Created admin user:")
            print(f"   Username: {admin_username}")
            print(f"   Password: {admin_password}")
            print(f"   Email: {admin.email}")
            print(f"\n⚠️  IMPORTANT: Please change the admin password after first login!")
        
        print("\n" + "=" * 60)
        print("✅ Authentication system initialized successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error during initialization: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
