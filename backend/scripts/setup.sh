#!/bin/bash

# KilimoChat Backend Setup Script
# Run this script to set up the backend environment

echo "🌾 Setting up KilimoChat Backend..."
echo "================================"

# Check Python version
echo ""
echo "📋 Checking Python version..."
python_version=$(python3 --version 2>&1 || python --version 2>&1)
echo "   Found: $python_version"

# Create virtual environment
echo ""
echo "🐍 Creating virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv 2>/dev/null || python -m venv venv
    echo "   ✅ Virtual environment created"
else
    echo "   ℹ️  Virtual environment already exists"
fi

# Activate virtual environment
echo ""
echo "🔄 Activating virtual environment..."
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi
echo "   ✅ Activated"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
pip install --upgrade pip -q
pip install -r requirements.txt -q
echo "   ✅ Dependencies installed"

# Create .env file if it doesn't exist
echo ""
echo "⚙️  Setting up environment..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "   ✅ Created .env file from template"
    echo "   📝 IMPORTANT: Edit .env and add your API keys!"
else
    echo "   ℹ️  .env file already exists"
fi

# Create data directory
echo ""
echo "📁 Creating data directory..."
mkdir -p data
echo "   ✅ Created"

# Setup complete
echo ""
echo "================================"
echo "✨ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Edit .env file with your API keys:"
echo "      - TWILIO_ACCOUNT_SID (from twilio.com/console)"
echo "      - TWILIO_AUTH_TOKEN (from twilio.com/console)"
echo "      - GROQ_API_KEY (from console.groq.com)"
echo ""
echo "   2. Run the server:"
echo "      python main.py"
echo ""
echo "   3. Test the endpoints:"
echo "      curl http://localhost:8000/health"
echo ""
echo "   4. View API docs:"
echo "      http://localhost:8000/docs"
echo ""
echo "📚 For detailed setup instructions, see README.md"
echo ""

# Offer to run server
read -p "🚀 Run the server now? (y/n): " run_server
if [[ $run_server =~ ^[Yy]$ ]]; then
    echo ""
    echo "Starting KilimoChat Backend..."
    python main.py
fi
