"""
Test script for WhatsApp integration
Send test messages via Twilio API
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from src.services.twilio_service import twilio_service
from src.config.settings import settings

def test_send_message():
    """Test sending a WhatsApp message"""
    print("🧪 Testing WhatsApp Integration\n")
    
    # Check configuration
    if not settings.twilio_account_sid:
        print("❌ Error: TWILIO_ACCOUNT_SID not configured")
        print("   Add it to .env file and try again")
        return
    
    print("✅ Twilio configuration found")
    
    # Get phone number from user
    print("\n📱 Enter your WhatsApp number (with country code, e.g., +254712345678):")
    phone = input("> ").strip()
    
    if not phone.startswith("+"):
        print("❌ Please include country code (e.g., +254 for Kenya)")
        return
    
    # Send test messages
    messages = [
        "🌾 Hello from KilimoChat! This is a test message.",
        "✅ Your WhatsApp integration is working!",
        "🚀 You're ready to help Kenyan farmers!"
    ]
    
    print(f"\n📤 Sending test messages to {phone}...")
    
    for i, message in enumerate(messages, 1):
        print(f"\n   Message {i}: {message[:50]}...")
        success = twilio_service.send_message(phone, message)
        
        if success:
            print(f"   ✅ Sent successfully")
        else:
            print(f"   ❌ Failed to send")
    
    print("\n✨ Test complete! Check your WhatsApp.")
    print("\n📝 Next steps:")
    print("   1. Reply to the message from your phone")
    print("   2. Check if the webhook receives your response")
    print("   3. Configure webhook URL in Twilio console")


def test_welcome_message():
    """Send welcome message"""
    print("🎉 Sending Welcome Message Test\n")
    
    if not settings.twilio_account_sid:
        print("❌ Twilio not configured")
        return
    
    print("📱 Enter your WhatsApp number:")
    phone = input("> ").strip()
    
    print(f"\n📤 Sending welcome message...")
    success = twilio_service.send_welcome_message(phone)
    
    if success:
        print("✅ Welcome message sent!")
    else:
        print("❌ Failed to send")


if __name__ == "__main__":
    print("=" * 50)
    print("KilimoChat WhatsApp Test Script")
    print("=" * 50)
    print("\n1. Send test message")
    print("2. Send welcome message")
    print("q. Quit")
    
    choice = input("\nChoose option: ").strip()
    
    if choice == "1":
        test_send_message()
    elif choice == "2":
        test_welcome_message()
    else:
        print("👋 Goodbye!")
