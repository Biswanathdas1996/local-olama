#!/usr/bin/env python3
"""
Quick test script to verify authentication system is working.
Run this after setup to test the authentication.
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from auth.database import SessionLocal
from auth.models import User, Role, Permission
from services.auth_service import AuthService

def test_auth():
    """Test authentication system."""
    print("=" * 60)
    print("Testing Authentication System")
    print("=" * 60)
    
    db = SessionLocal()
    auth_service = AuthService()
    
    try:
        # Test 1: Check if admin user exists
        print("\n1. Checking admin user...")
        admin = db.query(User).filter(User.username == "admin").first()
        if admin:
            print(f"   ✅ Admin user found: {admin.username} ({admin.email})")
        else:
            print("   ❌ Admin user not found!")
            return False
        
        # Test 2: Test password verification
        print("\n2. Testing password verification...")
        is_valid = auth_service.verify_password("admin123", admin.hashed_password)
        if is_valid:
            print("   ✅ Password verification works")
        else:
            print("   ❌ Password verification failed!")
            return False
        
        # Test 3: Test authentication
        print("\n3. Testing user authentication...")
        authenticated = auth_service.authenticate_user(db, "admin", "admin123")
        if authenticated:
            print(f"   ✅ Authentication successful: {authenticated.username}")
        else:
            print("   ❌ Authentication failed!")
            return False
        
        # Test 4: Test JWT token creation
        print("\n4. Testing JWT token creation...")
        token = auth_service.create_access_token(data={
            "sub": admin.id,
            "username": admin.username,
            "is_admin": admin.is_admin
        })
        if token:
            print(f"   ✅ Token created: {token[:50]}...")
        else:
            print("   ❌ Token creation failed!")
            return False
        
        # Test 5: Test token decoding
        print("\n5. Testing JWT token decoding...")
        try:
            token_data = auth_service.decode_access_token(token)
            if token_data.username == "admin":
                print(f"   ✅ Token decoded: user_id={token_data.user_id}, username={token_data.username}")
            else:
                print("   ❌ Token decoding returned wrong data!")
                return False
        except Exception as e:
            print(f"   ❌ Token decoding failed: {e}")
            return False
        
        # Test 6: Check permissions
        print("\n6. Checking permissions...")
        permission_count = db.query(Permission).count()
        if permission_count > 0:
            print(f"   ✅ Found {permission_count} permissions")
        else:
            print("   ❌ No permissions found!")
            return False
        
        # Test 7: Check roles
        print("\n7. Checking roles...")
        role_count = db.query(Role).count()
        if role_count > 0:
            print(f"   ✅ Found {role_count} roles")
            roles = db.query(Role).all()
            for role in roles:
                print(f"      - {role.name}: {len(role.permissions)} permissions")
        else:
            print("   ❌ No roles found!")
            return False
        
        # Test 8: Check user permissions
        print("\n8. Checking admin permissions...")
        user_perms = auth_service.get_user_permissions(db, admin.id)
        print(f"   ✅ Admin has {len(user_perms)} permissions from roles")
        if user_perms:
            print(f"      Sample: {', '.join(user_perms[:5])}")
        
        print("\n" + "=" * 60)
        print("✅ All tests passed!")
        print("=" * 60)
        print("\nYou can now:")
        print("1. Start the application: python main.py")
        print("2. Open browser: http://localhost:8000/login")
        print("3. Login with: admin / admin123")
        print("4. Change the admin password!")
        print()
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


if __name__ == "__main__":
    success = test_auth()
    sys.exit(0 if success else 1)
