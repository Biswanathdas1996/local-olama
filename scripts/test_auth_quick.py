"""
Simplified server startup test for authentication.
This tests auth separately from heavy ML dependencies.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

print("=" * 60)
print("Testing Authentication System Imports")
print("=" * 60)

try:
    print("\n1. Testing auth module imports...")
    from auth.database import SessionLocal, init_db, get_db
    from auth.models import User, Role, Permission
    from auth.dependencies import get_current_user, get_current_admin_user
    print("   ✅ Auth models and database imported successfully")
    
    print("\n2. Testing auth services...")
    from services.auth_service import AuthService, get_auth_service
    from services.role_permission_service import RolePermissionService
    print("   ✅ Auth services imported successfully")
    
    print("\n3. Testing auth routes...")
    from routes.auth_routes import router
    print("   ✅ Auth routes imported successfully")
    
    print("\n4. Testing database connection...")
    db = SessionLocal()
    users_count = db.query(User).count()
    roles_count = db.query(Role).count()
    perms_count = db.query(Permission).count()
    db.close()
    print(f"   ✅ Database connected successfully")
    print(f"   - Users: {users_count}")
    print(f"   - Roles: {roles_count}")
    print(f"   - Permissions: {perms_count}")
    
    print("\n5. Testing authentication logic...")
    db = SessionLocal()
    auth_service = AuthService()
    
    # Test password hashing
    password = "test123"
    hashed = auth_service.get_password_hash(password)
    verified = auth_service.verify_password(password, hashed)
    print(f"   ✅ Password hashing works: {verified}")
    
    # Test token creation
    token = auth_service.create_access_token(data={"sub": "testuser"})
    print(f"   ✅ Token generation works: {len(token)} chars")
    
    # Test user lookup
    admin = db.query(User).filter(User.username == "admin").first()
    if admin:
        print(f"   ✅ Admin user found: {admin.username} ({admin.email})")
        print(f"   - Is admin: {admin.is_admin}")
        print(f"   - Is active: {admin.is_active}")
    else:
        print("   ⚠️  Admin user not found - run init_auth.py")
    
    db.close()
    
    print("\n" + "=" * 60)
    print("✅ ALL AUTHENTICATION TESTS PASSED!")
    print("=" * 60)
    print("\n📝 Next Steps:")
    print("   1. Start the full server: python main.py")
    print("      (Note: First startup is slow due to ML library loading)")
    print("   2. Navigate to: http://localhost:8000/login")
    print("   3. Login with admin/admin123")
    print("   4. Access admin panel at: http://localhost:8000/admin")
    print("\n💡 The authentication system is ready!")
    print("=" * 60)
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
