#!/bin/bash

# KilimoChat Backend Installation Script
# Handles Python 3.14+ compatibility issues

echo "🌾 KilimoChat Backend Installation"
echo "================================="

# Check Python version
echo ""
echo "📋 Python version:"
python3 --version

echo ""
echo "🔄 Upgrading pip and wheel..."
pip3 install --upgrade pip wheel setuptools

echo ""
echo "📦 Installing requirements..."
pip3 install -r requirements.txt

echo ""
echo "================================="
if [ $? -eq 0 ]; then
    echo "✅ Installation successful!"
    echo ""
    echo "🚀 To start the server:"
    echo "   python3 main.py"
else
    echo "❌ Installation failed"
    echo ""
    echo "💡 If you see build errors, try:"
    echo "   1. Use Python 3.11 or 3.12 (recommended)"
    echo "   2. Or install without pydantic-settings:"
    echo "      pip3 install fastapi uvicorn twilio groq"
fi
