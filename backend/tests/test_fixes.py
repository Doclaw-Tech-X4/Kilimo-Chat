#!/usr/bin/env python3
"""
Diagnostic script to test all fixes and verify configuration.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

print("=" * 60)
print("KilimoChat System Diagnostics")
print("=" * 60)

# Test 1: Environment Variables
print("\n🔍 Checking Environment Variables...")
print("-" * 60)

from config import (
    GROQ_API_KEY,
    OPENWEATHER_API_KEY,
    MONGODB_URI,
    MONGODB_DB_NAME,
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN
)

issues = []

# Check Groq API Key
if not GROQ_API_KEY:
    issues.append("❌ GROQ_API_KEY is missing")
elif not GROQ_API_KEY.startswith("gsk_"):
    issues.append(f"❌ GROQ_API_KEY is invalid (starts with {GROQ_API_KEY[:4]}..., should start with 'gsk_')")
    print(f"   Current key: {GROQ_API_KEY[:20]}...")
    print("   ⚠️  You have an xAI key, NOT a Groq key!")
else:
    print(f"✅ GROQ_API_KEY is set correctly ({GROQ_API_KEY[:15]}...)")

# Check MongoDB
if not MONGODB_URI:
    issues.append("❌ MONGODB_URI is missing")
else:
    print(f"✅ MONGODB_URI is set")
    if "xxxxx" in MONGODB_URI:
        issues.append("❌ MONGODB_URI contains placeholder values")

if not MONGODB_DB_NAME:
    issues.append("❌ MONGODB_DB_NAME is missing")
else:
    print(f"✅ MONGODB_DB_NAME: {MONGODB_DB_NAME}")

# Check Weather API
if not OPENWEATHER_API_KEY:
    issues.append("❌ OPENWEATHER_API_KEY is missing")
else:
    print(f"✅ OPENWEATHER_API_KEY is set")

# Test 2: MongoDB Connection
print("\n🔍 Testing MongoDB Connection...")
print("-" * 60)

try:
    from database_mongo import init_database
    success = init_database()
    if success:
        print("✅ MongoDB connected successfully!")
    else:
        issues.append("❌ MongoDB connection failed (fallback to SQLite)")
except Exception as e:
    issues.append(f"❌ MongoDB error: {str(e)[:100]}")
    print(f"   Error: {e}")

# Test 3: Groq API (quick test)
print("\n🔍 Testing Groq API...")
print("-" * 60)

if GROQ_API_KEY and GROQ_API_KEY.startswith("gsk_"):
    try:
        from ai_handler import get_ai_response
        print("✅ Groq API key format looks valid")
        print("   Note: Full API test requires valid 'gsk_' key from https://console.groq.com")
    except Exception as e:
        issues.append(f"❌ Groq API error: {e}")
else:
    issues.append("❌ Cannot test Groq API - invalid or missing key")

# Test 4: Weather API
print("\n🔍 Testing Weather API...")
print("-" * 60)

if OPENWEATHER_API_KEY:
    try:
        from weather_handler import get_current_weather
        weather = get_current_weather("nairobi")
        if weather:
            print(f"✅ Weather API working: {weather.temperature}°C in {weather.location}")
        else:
            issues.append("❌ Weather API returned no data")
    except Exception as e:
        issues.append(f"❌ Weather API error: {e}")
else:
    issues.append("❌ Cannot test Weather API - missing key")

# Summary
print("\n" + "=" * 60)
print("DIAGNOSTIC SUMMARY")
print("=" * 60)

if not issues:
    print("🎉 All systems operational!")
    print("\n✅ You can now run the backend:")
    print("   uvicorn main:app --reload --port 8000")
else:
    print(f"\n⚠️  Found {len(issues)} issue(s):\n")
    for issue in issues:
        print(f"   {issue}")
    
    print("\n" + "=" * 60)
    print("HOW TO FIX")
    print("=" * 60)
    print("""
1. GROQ_API_KEY (REQUIRED for AI to work):
   → Get from: https://console.groq.com/keys
   → Create account (free)
   → Generate new key
   → Copy key starting with 'gsk_'
   → Update .env file:
     GROQ_API_KEY=gsk_your_actual_key_here

2. MongoDB Connection (if SSL errors):
   → Whitelist your IP: https://cloud.mongodb.com
     → Network Access → Add IP Address → 0.0.0.0/0
   → Check connection string is correct
   → Verify username/password

3. Test everything:
   python3 backend/tests/test_fixes.py
""")

sys.exit(0 if not issues else 1)
