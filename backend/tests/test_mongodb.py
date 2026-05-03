#!/usr/bin/env python3
"""
MongoDB Atlas Connection Test Script
Tests connectivity, authentication, and basic operations.

Usage:
    python tests/test_mongodb.py

This will:
1. Test connection to MongoDB Atlas
2. Verify authentication
3. Test database operations
4. Show cluster info
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config import MONGODB_URI, MONGODB_DB_NAME, logger
from database_mongo import (
    init_database,
    get_or_create_user,
    get_user_language,
    save_message,
    get_recent_messages,
    get_db_stats
)


def test_connection():
    """Test basic MongoDB connection."""
    print("\n" + "=" * 60)
    print("MONGODB ATLAS CONNECTION TEST")
    print("=" * 60)
    print(f"\n📍 MongoDB URI: {MONGODB_URI[:50]}...")
    print(f"📍 Database Name: {MONGODB_DB_NAME}")
    
    if not MONGODB_URI or "xxxxx" in MONGODB_URI:
        print("\n❌ ERROR: MongoDB URI not configured properly!")
        print("   Please update your .env file with your actual MongoDB Atlas URI")
        print("\n   Get your URI from: https://cloud.mongodb.com")
        print("   → Database → Connect → Drivers → Python")
        return False
    
    print("\n" + "-" * 60)
    print("TEST 1: Connecting to MongoDB Atlas...")
    print("-" * 60)
    
    try:
        # Initialize connection
        success = init_database()
        
        if success:
            print("✅ Successfully connected to MongoDB Atlas!")
        else:
            print("❌ Failed to connect to MongoDB Atlas")
            print("   Falling back to SQLite...")
            return False
            
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print("\n🔍 Troubleshooting:")
        print("   1. Check your internet connection")
        print("   2. Verify MongoDB URI is correct")
        print("   3. Ensure IP address is whitelisted in MongoDB Atlas")
        print("   4. Check username and password are correct")
        print("   5. Verify cluster name is correct")
        return False
    
    return True


def test_database_operations():
    """Test CRUD operations."""
    print("\n" + "-" * 60)
    print("TEST 2: Testing Database Operations...")
    print("-" * 60)
    
    test_phone = "+254700000000"
    
    try:
        # Test 1: Create user
        print("\n📝 Creating test user...")
        user = get_or_create_user(test_phone, "sw")
        print(f"✅ User created: {user.phone}")
        print(f"   Language: {user.preferred_language}")
        print(f"   Message count: {user.message_count}")
        
        # Test 2: Get user language
        print("\n🔍 Retrieving user language...")
        lang = get_user_language(test_phone)
        print(f"✅ User language: {lang}")
        
        # Test 3: Save message
        print("\n💾 Saving test message...")
        msg_id = save_message(
            user_phone=test_phone,
            message_type="text",
            content="Test message from KilimoChat",
            ai_response="Test response from AI"
        )
        print(f"✅ Message saved: {msg_id}")
        
        # Test 4: Get recent messages
        print("\n📜 Retrieving recent messages...")
        messages = get_recent_messages(test_phone, limit=5)
        print(f"✅ Retrieved {len(messages)} messages")
        
        for i, msg in enumerate(messages[:3], 1):
            print(f"   {i}. [{msg.message_type}] {msg.content[:40]}...")
        
        # Test 5: Get database stats
        print("\n📊 Getting database statistics...")
        stats = get_db_stats()
        print(f"✅ Database status: {stats['status']}")
        print(f"   Collections:")
        for collection, data in stats.get('collections', {}).items():
            print(f"   - {collection}: {data.get('count', 0)} documents")
        
        print("\n✅ All database operations successful!")
        return True
        
    except Exception as e:
        print(f"\n❌ Database operation failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_health_endpoint():
    """Test the health endpoint."""
    print("\n" + "-" * 60)
    print("TEST 3: Testing Health Endpoint...")
    print("-" * 60)
    
    try:
        import requests
        
        response = requests.get("http://localhost:8000/health", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Health endpoint responding")
            print(f"   Status: {data.get('status')}")
            print(f"   Using MongoDB: {data.get('using_mongodb')}")
            print(f"   Database: {data.get('database', {}).get('status')}")
            return True
        else:
            print(f"⚠️ Health endpoint returned status {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("⚠️ Cannot connect to backend server")
        print("   Please run: uvicorn main:app --port 8000")
        return False
    except Exception as e:
        print(f"⚠️ Health check failed: {e}")
        return False


def show_setup_instructions():
    """Show setup instructions if test fails."""
    print("\n" + "=" * 60)
    print("SETUP INSTRUCTIONS")
    print("=" * 60)
    print("""
1. Create MongoDB Atlas Account:
   → https://cloud.mongodb.com
   → Sign up for free account

2. Create a Cluster:
   → Click "Build a Cluster"
   → Choose FREE (M0) tier
   → Select region closest to your users (e.g., AWS / Mumbai for Kenya)
   → Click "Create Cluster"

3. Create Database User:
   → Database Access → Add New Database User
   → Username: kilimochat_user
   → Password: (generate a secure password)
   → Click "Add User"

4. Whitelist IP Address:
   → Network Access → Add IP Address
   → Click "Allow Access from Anywhere" (0.0.0.0/0)
   → Or add your specific IP
   → Click "Confirm"

5. Get Connection String:
   → Database → Connect → Drivers → Python
   → Copy the connection string
   → Replace <password> with your actual password
   → Replace <dbname> with "kilimochat"

6. Update .env file:
   MONGODB_URI=mongodb+srv://kilimochat_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/kilimochat?retryWrites=true&w=majority
   MONGODB_DB_NAME=kilimochat

7. Install pymongo:
   pip install pymongo dnspython

8. Test again:
   python tests/test_mongodb.py
""")


def main():
    print("\n🌾 KilimoChat MongoDB Atlas Connection Test\n")
    
    # Run tests
    connection_ok = test_connection()
    
    if not connection_ok:
        print("\n" + "=" * 60)
        print("CONNECTION FAILED")
        print("=" * 60)
        show_setup_instructions()
        sys.exit(1)
    
    operations_ok = test_database_operations()
    health_ok = test_health_endpoint()
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    tests = [
        ("MongoDB Connection", connection_ok),
        ("Database Operations", operations_ok),
        ("Health Endpoint", health_ok),
    ]
    
    all_passed = all(passed for _, passed in tests)
    
    for test_name, passed in tests:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    print("=" * 60)
    
    if all_passed:
        print("\n🎉 All tests passed! MongoDB Atlas is ready to use!")
        print("\nYou can now run the backend:")
        print("   uvicorn main:app --reload --port 8000")
        sys.exit(0)
    else:
        print("\n⚠️  Some tests failed. Check the errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
