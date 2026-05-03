# 🌾 KilimoChat Backend - Production Ready

AI-powered farming assistant backend for Kenyan farmers via WhatsApp and Web.
**Now with MongoDB Atlas, Voice Support, and Web Search!**

## ✨ Features

### 🎤 Voice Message Pipeline
- WhatsApp voice message processing
- Groq Whisper transcription (supports Swahili & English)
- Automatic language detection
- Translation to user's preferred language
- Full audit trail in MongoDB

### 🔍 Web Search Integration
- DuckDuckGo search (no API key required)
- Smart detection for current/real-time queries
- Search results injected into AI context
- Perfect for market prices, weather, and news

### 🌍 Bilingual Support
- English & Swahili throughout the pipeline
- User language preference tracking
- AI response validation for correct language

### 💾 MongoDB Atlas Database
- Cloud-hosted MongoDB (scalable & production-ready)
- Collections: users, messages, voice_messages, search_logs
- Automatic fallback to SQLite if MongoDB unavailable

### 🚀 Quick Start

### 1. Prerequisites
```bash
# Python 3.8+
python --version

# Virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows
```

### 2. Installation
```bash
# Navigate to backend folder
cd backend

# Install dependencies
pip install -r requirements.txt
```

### 3. Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your API keys:
# - TWILIO_ACCOUNT_SID (from Twilio console)
# - TWILIO_AUTH_TOKEN (from Twilio console)
# - GROQ_API_KEY (from groq.com - free tier available)
```

### 4. Run the Server
```bash
# Development mode with auto-reload
python main.py

# Or using uvicorn directly
uvicorn main:app --reload --port 8000
```

Server will start at: http://localhost:8000

---

## 🔧 Setup Guides

### Twilio WhatsApp Setup (Day 1)

1. **Create Twilio Account**
   - Go to https://www.twilio.com/try-twilio
   - Sign up with your phone number
   - You get $15.50 free credit

2. **Get WhatsApp Sandbox Number**
   - In Twilio Console, go to Messaging → Try it out → Send a WhatsApp message
   - Note the sandbox number (usually +14155238886)
   - Join sandbox by messaging "join [code]" to the number

3. **Configure Webhook**
   - For local testing, use ngrok:
     ```bash
     ngrok http 8000
     ```
   - Copy the https URL (e.g., https://abc123.ngrok.io)
   - In Twilio: Messaging → Settings → WhatsApp Sandbox Settings
   - Set "When a message comes in" to: `https://abc123.ngrok.io/webhook/whatsapp`
   - Save settings

4. **Test**
   - Send a WhatsApp message to your sandbox number
   - You should get an automatic response!

### Groq AI Setup (Day 3)

1. **Get API Key**
   - Visit https://console.groq.com
   - Sign up for free account
   - Create API key
   - Copy to your `.env` file

2. **Test AI**
   - Send message: "My maize has yellow leaves"
   - Should get intelligent AI response

---

## 📡 API Endpoints

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API info & status |
| GET | `/health` | Health check |
| POST | `/webhook/whatsapp` | **Twilio webhook** |
| POST | `/api/chat` | Chat API for frontend |
| GET | `/docs` | Swagger UI docs |

### Test Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/test/detect-language` | Test language detection |
| POST | `/test/detect-intent` | Test intent detection |
| POST | `/test/rule-response` | Test rule-based responses |
| POST | `/test/ai-response` | Test AI responses |

---

## 🧪 Testing

### Test Language Detection
```bash
curl -X POST "http://localhost:8000/test/detect-language?text=Habari%20mambo"
```

### Test Intent Detection
```bash
curl -X POST "http://localhost:8000/test/detect-intent?text=My%20maize%20is%20yellow"
```

### Test Chat API
```bash
curl -X POST "http://localhost:8000/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Mahindi yangu yamekufa", "user_id": "test123"}'
```

### Test with Swahili
```bash
curl -X POST "http://localhost:8000/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Mvua inanyesha leo, nifanye nini?"}'
```

---

## 🌍 Language Support

The bot automatically detects and responds in:

- **English** - "My maize has yellow leaves"
- **Swahili** - "Mahindi yangu yamekufa"
- **Mixed (Sheng)** - "Vipi, shamba yangu ina wadudu"

Language is detected based on keywords and patterns. Responses match the user's language.

---

## 🎯 Supported Intents

### 1. Maize Disease Diagnosis
Keywords: maize, mahindi, yellow, leaf, spots, disease, ugonjwa

### 2. Fertilizer Advice
Keywords: fertilizer, mbolea, manure, samadi, top-dress, nitrogen

### 3. Weather Inquiries
Keywords: weather, hali ya hewa, mvua, rain, forecast

### 4. Market Prices
Keywords: price, bei, market, soko, sell, buy, profit

### 5. Pest Control
Keywords: pest, wadudu, insect, armyworm, tuta

### 6. Soil Health
Keywords: soil, udongo, ph, fertility, drainage

---

## 🔐 Environment Variables

```env
# Required for WhatsApp
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token

# Required for AI
GROQ_API_KEY=your_groq_api_key

# Required for MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/kilimochat?retryWrites=true&w=majority
MONGODB_DB_NAME=kilimochat

# Optional - defaults provided
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
GROQ_MODEL=llama-3.3-70b-versatile
DEBUG=true
```

### MongoDB Atlas Setup
1. Go to https://cloud.mongodb.com
2. Create a free cluster (M0)
3. Click "Database" → "Connect" → "Drivers" → "Python"
4. Copy the connection string
5. Replace `username`, `password`, and `cluster` in the URI
6. Add IP whitelist (0.0.0.0/0 for development)

---

## 📁 Project Structure

```
backend/
├── main.py                  # FastAPI application (entry point)
├── config.py               # Environment variables, constants, prompts
├── database.py             # SQLite database (fallback)
├── database_mongo.py       # MongoDB Atlas (primary)
├── ai_handler.py           # Groq LLaMA 3.3 integration
├── voice_handler.py        # Voice message pipeline
├── search_handler.py       # DuckDuckGo web search
├── language_utils.py       # Language detection & translation
├── requirements.txt        # Python dependencies
├── .env.example           # Environment template
├── README.md              # This file
├── tests/                 # Test files
│   ├── test_voice.py     # Voice pipeline tests
│   └── __init__.py
├── data/                  # SQLite database (fallback)
├── uploads/voice/         # Voice file storage
└── logs/                  # Application logs
```

## 🔌 API Endpoints

### WhatsApp Webhook
- `POST /whatsapp` - Receive WhatsApp messages (Twilio)

### Chat API (for Frontend)
- `POST /api/chat` - Send chat message
- `GET /api/chat/history/{user_id}` - Get chat history
- `POST /api/voice/transcribe` - Transcribe voice audio

### Health & Testing
- `GET /health` - Health check with DB stats
- `POST /test/detect-language` - Test language detection
- `POST /test/translate` - Test translation
- `POST /test/search` - Test web search

## 🧪 Testing

```bash
# Test chat API
curl -X POST "http://localhost:8000/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Mahindi yangu yamekufa", "user_id": "test_user"}'

# Test voice pipeline
python tests/test_voice.py --text "Habari za kilimo"

# Test web search
curl -X POST "http://localhost:8000/test/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "current maize prices Kenya"}'
```

---

## 🚢 Deployment

### Using ngrok (Development)
```bash
# Terminal 1: Start server
python main.py

# Terminal 2: Expose to internet
ngrok http 8000

# Copy https URL to Twilio webhook settings
```

### Production Deployment Options

1. **Heroku** - Easy, free tier available
2. **Railway** - Simple deployment
3. **AWS/GCP/Azure** - Full control
4. **VPS (DigitalOcean, Linode)** - Cost-effective

Remember to:
- Set production environment variables
- Use persistent database (PostgreSQL)
- Configure proper logging
- Set up monitoring

---

## 🐛 Troubleshooting

### "AI service not available"
- Check GROQ_API_KEY in .env
- Verify key is valid at https://console.groq.com

### "Message not received"
- Check Twilio webhook URL is correct
- Verify ngrok is running (for local testing)
- Check Twilio logs for errors

### "WhatsApp message not sent"
- Verify TWILIO_ACCOUNT_SID and AUTH_TOKEN
- Check phone number format (must have whatsapp: prefix)
- Ensure Twilio balance > $0

---

## 📝 Sample Farmer Queries

### English
- "My maize leaves are turning yellow at the edges"
- "What fertilizer should I use for top dressing?"
- "Will it rain tomorrow in Nairobi?"
- "What's the price of maize in Nairobi market?"

### Swahili
- "Mahindi yangu yamekufa"
- "Mbolea gani ni nzuri kwa top dressing?"
- "Mvua inanyesha kesho Nairobi?"
- "Bei ya mahindi soko la Nairobi ni ngapi?"

### Mixed
- "Vipi, my maize iko na wadudu"
- "Shamba yangu inahitaji mbolea"
- "Nitumie fertilizer gani?"

---

## 🎓 Learning Resources

- **Twilio WhatsApp**: https://www.twilio.com/docs/whatsapp/quickstart/python
- **FastAPI**: https://fastapi.tiangolo.com/
- **Groq API**: https://console.groq.com/docs
- **LLaMA Models**: https://ai.meta.com/llama/

---

## 🤝 Contributing

This backend was built following a 4-day implementation plan:
1. WhatsApp integration
2. Basic chatbot logic
3. AI integration
4. Swahili support

Feel free to extend with:
- Image analysis for crop diseases
- Voice message support
- More crops and diseases
- Integration with weather APIs
- Market price APIs (KEMIS, etc.)

---

## 📄 License

MIT License - Feel free to use for your farming projects!

---

## 💚 Made for Kenyan Farmers

KilimoChat is designed to bridge the agricultural extension gap in Kenya, providing AI-powered assistance to the 7.2 million farmers who currently have limited access to expert advice.

*Up to 40% crop loss prevented through early detection and rapid AI intervention.*

---

**Questions?** Check the `/docs` endpoint when server is running for interactive API documentation!
