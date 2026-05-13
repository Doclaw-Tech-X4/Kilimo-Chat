# 🌾 KilimoChat - Complete Project Documentation

## 📋 Table of Contents

1. [Overview](#-overview)
2. [Architecture](#-architecture)
3. [Features](#-features)
4. [Project Structure](#-project-structure)
5. [Installation & Setup](#-installation--setup)
6. [API Documentation](#-api-documentation)
7. [Frontend Guide](#-frontend-guide)
8. [Backend Guide](#-backend-guide)
9. [Deployment](#-deployment)
10. [Testing](#-testing)
11. [Troubleshooting](#-troubleshooting)
12. [Contributing](#-contributing)

---

## 🎯 Overview

**KilimoChat** is an AI-powered agricultural assistant designed specifically for Kenyan farmers. It provides real-time farming advice, disease diagnosis, market prices, and weather information through WhatsApp and web interfaces.

### Key Goals
- Bridge agricultural extension gap in Kenya
- Provide instant farming advice in English and Swahili
- Reduce crop losses through early disease detection
- Improve farmer livelihoods through market information

### Target Users
- Small-scale farmers in Kenya
- Agricultural extension officers
- Farming cooperatives
- Agricultural students

---

## 🏗️ Architecture

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend    │    │    Backend     │    │   External     │
│   (React)     │◄──►│   (FastAPI)    │◄──►│   Services     │
│                │    │                │    │                │
│ - Chat UI     │    │ - AI Handler  │    │ - Groq AI     │
│ - History     │    │ - Voice TTS   │    │ - Twilio       │
│ - Responsive  │    │ - Search      │    │ - MongoDB      │
└─────────────────┘    │ - Database    │    │ - DuckDuckGo   │
                     │                │    └─────────────────┘
                     └─────────────────┘
```

### Data Flow

1. **User Input** → WhatsApp/Web Interface
2. **Language Detection** → Auto-detect English/Swahili
3. **Intent Analysis** → Determine user need
4. **Knowledge Base** → Check cached agricultural data
5. **AI Processing** → Groq LLaMA 3.3 with web search
6. **Response Formatting** → WhatsApp-friendly, professional output
7. **Delivery** → WhatsApp message or web response

---

## ✨ Features

### 🎤 Voice Message Pipeline
- **WhatsApp Voice Processing**: Receive and process voice notes
- **Groq Whisper Transcription**: High accuracy Swahili/English transcription
- **Language Auto-Detection**: Identify user's preferred language
- **Translation Support**: Translate responses to user's language
- **Audit Trail**: Complete voice message history in MongoDB

### 🔍 Smart Search Integration
- **DuckDuckGo Search**: Real-time web search without API keys
- **Smart Query Detection**: Automatically search for current information
- **Context Injection**: Search results enhance AI responses
- **Perfect for**: Market prices, weather, farming news

### 🌍 Bilingual Intelligence
- **English Support**: Full agricultural terminology
- **Swahili Support**: Native farming terms and phrases
- **Mixed Language (Sheng)**: Understand urban-rural language mixing
- **Language Preference**: Remember and use user's preferred language
- **Response Validation**: Ensure responses match user's language

### 💾 Robust Database System
- **MongoDB Atlas**: Cloud-hosted, scalable production database
- **SQLite Fallback**: Local database for development/offline
- **Collections**: Users, Messages, Voice Messages, Search Logs
- **Automatic Sync**: Seamless switching between databases

### 📱 WhatsApp Integration
- **Twilio Integration**: Official WhatsApp Business API
- **Message Types**: Text, voice, images, documents
- **Webhook System**: Real-time message processing
- **Media Handling**: Process and store voice files securely

### 🧠 AI-Powered Responses
- **Groq LLaMA 3.3**: State-of-the-art language model
- **Agricultural Focus**: Specialized farming knowledge
- **Streaming Responses**: Real-time response generation
- **Professional Formatting**: Clean, structured output without emojis

---

## 📁 Project Structure

### Frontend (React)
```
src/
├── components/           # React components
│   ├── Chat/          # Chat interface components
│   ├── Layout/         # Header, sidebar, layout
│   ├── Voice/          # Voice recording/playback
│   └── UI/             # Buttons, inputs, common UI
├── contexts/            # React contexts
│   └── AuthContext.js  # Authentication state
├── hooks/               # Custom React hooks
├── services/            # API calls
├── styles/              # CSS/styling
├── App.js              # Main application
└── index.js            # Entry point
```

### Backend (FastAPI)
```
backend/
├── main.py                 # FastAPI application entry point
├── config.py               # Environment variables, constants
├── ai_handler.py           # Groq AI integration
├── voice_handler.py        # Voice message processing
├── search_handler.py       # DuckDuckGo web search
├── language_utils.py       # Language detection & translation
├── response_formatter.py   # WhatsApp-friendly formatting
├── database.py            # SQLite database (fallback)
├── database_mongo.py      # MongoDB Atlas (primary)
├── auth_handler.py        # User authentication
├── compliance_governance.py # Data protection & compliance
├── knowledge_base.py     # Agricultural knowledge base
├── user_experience_improvements.py # UX enhancements
├── requirements.txt        # Python dependencies
├── .env.example          # Environment template
├── tests/                # Test files
├── data/                 # SQLite database
├── uploads/voice/         # Voice file storage
└── logs/                 # Application logs
```

---

## 🚀 Installation & Setup

### Prerequisites

#### System Requirements
- **Node.js**: 18.x or higher
- **Python**: 3.8 or higher
- **Git**: For version control
- **MongoDB Atlas Account**: For production database

#### Required Accounts
1. **Twilio Account**: WhatsApp Business API
   - Free $15.50 credit available
   - Sandbox number for testing
2. **Groq Account**: AI API access
   - Free tier with generous limits
   - LLaMA 3.3 model access
3. **MongoDB Atlas**: Cloud database (optional)
   - Free M0 cluster available
   - Scalable hosting

### Frontend Setup

```bash
# Navigate to project root
cd kilimo-chat-app

# Install frontend dependencies
npm install

# Start development server
npm start

# Application opens at: http://localhost:3000
```

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate environment
# Linux/Mac:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Edit .env with your API keys
```

### Environment Configuration

Create `.env` file with:

```env
# Twilio WhatsApp Configuration
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Groq AI Configuration
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile

# MongoDB Atlas Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/kilimochat
MONGODB_DB_NAME=kilimochat

# Application Configuration
DEBUG=true
```

---

## 📡 API Documentation

### Core Endpoints

#### Health & Status
```
GET /health
```
Returns application health status with database connections.

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### WhatsApp Webhook
```
POST /webhook/whatsapp
```
Receives WhatsApp messages from Twilio.

**Request Body:**
```json
{
  "From": "whatsapp:+254712345678",
  "Body": "My maize has yellow leaves",
  "MediaUrl0": "https://...",
  "NumMedia": 1
}
```

#### Chat API (Frontend)
```
POST /api/chat
Content-Type: application/json
```

**Request:**
```json
{
  "message": "What fertilizer should I use for maize?",
  "user_id": "user_123",
  "session_id": "session_456"
}
```

**Response:**
```json
{
  "response": "For maize top dressing, I recommend...",
  "language": "en",
  "timestamp": "2024-01-01T12:00:00Z",
  "session_id": "session_456"
}
```

#### Streaming Chat
```
POST /api/chat/stream
Content-Type: application/json
```

**Response:** Server-Sent Events (SSE)
```
data: {"type": "metadata", "language": "en"}
data: {"type": "chunk", "text": "For maize"}
data: {"type": "chunk", "text": " top dressing"}
data: {"type": "done", "full_text": "For maize top dressing..."}
```

#### Voice Transcription
```
POST /api/voice/transcribe
Content-Type: multipart/form-data
```

**Request:**
- Audio file (wav, mp3, m4a)
- User ID for context

**Response:**
```json
{
  "transcription": "Mahindi yangu yamekufa",
  "detected_language": "sw",
  "confidence": 0.95
}
```

### Test Endpoints

#### Language Detection Test
```bash
curl -X POST "http://localhost:8000/test/detect-language" \
  -H "Content-Type: application/json" \
  -d '{"text": "Habari za kilimo"}'
```

#### Intent Detection Test
```bash
curl -X POST "http://localhost:8000/test/detect-intent" \
  -H "Content-Type: application/json" \
  -d '{"text": "My maize has yellow leaves"}'
```

#### AI Response Test
```bash
curl -X POST "http://localhost:8000/test/ai-response" \
  -H "Content-Type: application/json" \
  -d '{"message": "Price of maize today", "language": "en"}'
```

---

## 🖥 Frontend Guide

### Component Architecture

#### Chat Interface
- **ChatContainer**: Main chat interface wrapper
- **MessageList**: Displays conversation history
- **MessageBubble**: Individual message rendering
- **MessageInput**: User input with voice recording
- **VoiceRecorder**: Audio capture and upload

#### Layout Components
- **Header**: Application header with navigation
- **Sidebar**: Chat history and settings
- **Footer**: Quick actions and help
- **ResponsiveLayout**: Mobile-responsive wrapper

#### Voice Features
- **AudioRecorder**: Web Audio API integration
- **VoicePlayer**: Audio playback for responses
- **LanguageIndicator**: Shows detected language
- **TranscriptionDisplay**: Shows voice-to-text results

### State Management

#### React Contexts
```javascript
// Auth Context
const AuthContext = {
  user: null,
  isAuthenticated: false,
  login: (credentials) => {},
  logout: () => {}
};

// Chat Context
const ChatContext = {
  messages: [],
  isLoading: false,
  language: 'en',
  addMessage: (message) => {},
  setLanguage: (lang) => {}
};
```

### API Integration

#### Service Layer
```javascript
// Chat Service
export const chatService = {
  sendMessage: async (message, userId) => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, user_id: userId })
    });
    return response.json();
  },
  
  streamResponse: async (message, userId) => {
    const eventSource = new EventSource('/api/chat/stream');
    // Handle SSE events
  }
};

// Voice Service
export const voiceService = {
  transcribe: async (audioFile) => {
    const formData = new FormData();
    formData.append('audio', audioFile);
    const response = await fetch('/api/voice/transcribe', {
      method: 'POST',
      body: formData
    });
    return response.json();
  }
};
```

---

## 🔧 Backend Guide

### AI Handler

#### Groq Integration
```python
# AI Response Generation
async def get_ai_response_streaming(
    user_message: str,
    user_phone: str,
    target_language: str = "en",
    use_search: bool = True
):
    # Language enforcement
    # Web search integration
    # Streaming response generation
```

#### Response Formatting
- **Professional Headers**: Clean section headers without emojis
- **Structured Output**: SUMMARY, DETAILS, ACTIONS, COSTS, SOURCE
- **Language Consistency**: All content in user's language
- **WhatsApp Optimization**: Proper formatting for mobile display

### Knowledge Base

#### Agricultural Data
```python
@dataclass
class KnowledgeFact:
    id: str
    crop: str          # maize, beans, tomatoes
    category: str       # planting, pests, fertilizer
    question: str       # Common farming questions
    answer: str         # Verified agricultural advice
    source: str         # KALRO, KEPHIS, etc.
    confidence: float   # Reliability score
```

### Database Schema

#### MongoDB Collections
```javascript
// Users Collection
{
  "_id": ObjectId,
  "phone": "+254712345678",
  "name": "John Farmer",
  "language": "sw",
  "created_at": ISODate,
  "last_active": ISODate
}

// Messages Collection
{
  "_id": ObjectId,
  "user_phone": "+254712345678",
  "message": "My maize has yellow leaves",
  "response": "This sounds like...",
  "language": "sw",
  "intent": "disease_diagnosis",
  "created_at": ISODate
}

// Voice Messages Collection
{
  "_id": ObjectId,
  "user_phone": "+254712345678",
  "audio_url": "https://...",
  "transcription": "Mahindi yangu yamekufa",
  "detected_language": "sw",
  "confidence": 0.95,
  "created_at": ISODate
}
```

### Voice Processing Pipeline

#### Step-by-Step Flow
1. **Receive Voice**: WhatsApp webhook with audio
2. **Download Audio**: Secure file download
3. **Transcribe**: Groq Whisper API call
4. **Language Detection**: Auto-detect Swahili/English
5. **AI Processing**: Generate response in detected language
6. **TTS (Optional)**: Convert response to speech
7. **Send Response**: WhatsApp message delivery

---

## 🚀 Deployment

### Development Setup

#### Using ngrok (Local Testing)
```bash
# Terminal 1: Start backend
cd backend
python main.py

# Terminal 2: Expose to internet
ngrok http 8000

# Copy ngrok URL to Twilio webhook
# Example: https://abc123.ngrok.io/webhook/whatsapp
```

### Production Deployment

#### Heroku Deployment
```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create new app
heroku create kilimo-chat

# Set environment variables
heroku config:set TWILIO_ACCOUNT_SID=your_sid
heroku config:set TWILIO_AUTH_TOKEN=your_token
heroku config:set GROQ_API_KEY=your_key
heroku config:set MONGODB_URI=your_mongo_uri

# Deploy
git push heroku main
```

#### Railway Deployment
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy project
railway up

# Set environment variables in Railway dashboard
```

#### VPS Deployment (DigitalOcean/Linode)
```bash
# Server setup
sudo apt update && sudo apt install python3 python3-pip nginx

# Clone repository
git clone https://github.com/your-repo/kilimo-chat.git
cd kilimo-chat

# Setup Python environment
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

# Setup systemd service
sudo nano /etc/systemd/system/kilimo-chat.service
```

```ini
[Unit]
Description=KilimoChat
After=network.target

[Service]
User=www-data
WorkingDirectory=/path/to/kilimo-chat/backend
ExecStart=/path/to/kilimo-chat/backend/venv/bin/python main.py
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Start service
sudo systemctl start kilimo-chat
sudo systemctl enable kilimo-chat

# Setup nginx reverse proxy
sudo nano /etc/nginx/sites-available/kilimo-chat
```

---

## 🧪 Testing

### Frontend Tests

#### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test --watch

# Generate coverage report
npm test --coverage
```

#### Test Components
```javascript
// Chat Interface Test
describe('ChatInterface', () => {
  test('sends message correctly', async () => {
    const { getByText } = render(<ChatInterface />);
    const input = getByPlaceholderText('Type your message...');
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(getByText('Send'));
    
    expect(await findByText('Test message')).toBeInTheDocument();
  });
});

// Voice Recording Test
describe('VoiceRecorder', () => {
  test('starts recording on click', () => {
    const { getByRole } = render(<VoiceRecorder />);
    const button = getByRole('button', { name: 'Start Recording' });
    
    fireEvent.click(button);
    expect(button).toHaveClass('recording');
  });
});
```

### Backend Tests

#### Running Tests
```bash
# Navigate to backend
cd backend

# Run all tests
python -m pytest tests/

# Run specific test file
python -m pytest tests/test_ai_handler.py

# Run with coverage
python -m pytest --cov=. tests/
```

#### Test Examples
```python
# AI Handler Test
def test_ai_response():
    response = get_ai_response(
        user_message="My maize has yellow leaves",
        user_phone="+254712345678",
        target_language="en"
    )
    assert "maize" in response.lower()
    assert "yellow" in response.lower()

# Language Detection Test
def test_language_detection():
    swahili_text = "Mahindi yangu yamekufa"
    detected = detect_language(swahili_text)
    assert detected == "sw"

# Voice Processing Test
def test_voice_transcription():
    with open("test_audio.wav", "rb") as audio_file:
        result = transcribe_voice(audio_file, "test_user")
        assert result["transcription"] is not None
        assert result["confidence"] > 0.8
```

### Integration Tests

#### WhatsApp Integration Test
```bash
# Test WhatsApp webhook
curl -X POST "http://localhost:8000/webhook/whatsapp" \
  -H "Content-Type: application/json" \
  -d '{
    "From": "whatsapp:+254712345678",
    "Body": "Test message from farmer"
  }'
```

#### End-to-End Test
```python
# Full conversation flow test
def test_farmer_conversation():
    # Simulate farmer asking about maize disease
    message = "My maize leaves are turning yellow"
    response = simulate_whatsapp_message(message)
    
    # Check response quality
    assert "maize" in response.lower()
    assert "yellow" in response.lower()
    assert len(response) > 50  # Substantive response
    
    # Check language consistency
    detected_lang = detect_language(response)
    assert detected_lang == "en"  # Should match user language
```

---

## 🔧 Troubleshooting

### Common Issues

#### "AI service not available"
**Problem**: Groq API connection failed
**Solution**: 
- Check `GROQ_API_KEY` in `.env` file
- Verify key validity at https://console.groq.com
- Check internet connectivity
- Verify API quota not exceeded

#### "WhatsApp message not received"
**Problem**: Twilio webhook not working
**Solution**:
- Verify webhook URL is accessible (use ngrok for local)
- Check Twilio webhook configuration
- Verify webhook returns 200 OK response
- Check Twilio account balance

#### "Voice transcription failing"
**Problem**: Audio processing issues
**Solution**:
- Check audio file format (supports wav, mp3, m4a)
- Verify file size limits (<10MB)
- Check Groq Whisper API availability
- Review audio quality and clarity

#### "Database connection failed"
**Problem**: MongoDB connection issues
**Solution**:
- Verify `MONGODB_URI` format and credentials
- Check IP whitelist in MongoDB Atlas
- Ensure network connectivity
- Fallback to SQLite for development

#### "Language detection errors"
**Problem**: Incorrect language identification
**Solution**:
- Check language patterns in `language_utils.py`
- Verify training data for detection
- Test with various message formats
- Manual language override option

### Performance Issues

#### Slow AI Responses
**Causes**: High server load, API limits
**Solutions**:
- Implement response caching
- Use streaming for long responses
- Optimize prompt engineering
- Consider model selection

#### High Memory Usage
**Causes**: Large models, memory leaks
**Solutions**:
- Monitor memory usage with logs
- Implement garbage collection
- Use model quantization
- Scale horizontally

### Debug Mode

#### Enable Debug Logging
```env
DEBUG=true
LOG_LEVEL=DEBUG
```

#### Check Application Logs
```bash
# View real-time logs
tail -f logs/kilimoChat.log

# Search for errors
grep "ERROR" logs/kilimoChat.log

# Monitor API calls
grep "Groq API" logs/kilimoChat.log
```

---

## 👥 Contributing

### Development Workflow

#### 1. Setup Development Environment
```bash
# Fork repository
git clone https://github.com/your-username/kilimo-chat.git
cd kilimo-chat

# Setup frontend
npm install
npm start

# Setup backend (new terminal)
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

#### 2. Code Standards

#### Python (Backend)
- Use type hints for all functions
- Follow PEP 8 style guidelines
- Write comprehensive docstrings
- Use f-strings for formatting
- Handle exceptions gracefully

#### JavaScript (Frontend)
- Use modern ES6+ features
- Follow React hooks patterns
- Use functional components
- Implement proper error boundaries
- Use semantic HTML elements

#### 3. Testing Requirements
- Write tests for all new features
- Maintain >80% code coverage
- Test both English and Swahili
- Include integration tests

#### 4. Commit Standards
```bash
# Conventional commits
git commit -m "feat: add voice message support"
git commit -m "fix: resolve language detection bug"
git commit -m "docs: update API documentation"
```

### Feature Development

#### Adding New Crop Support
1. **Update Knowledge Base**: Add crop-specific data
2. **Update Language Utils**: Add crop terminology
3. **Test Intents**: Verify crop disease detection
4. **Update Documentation**: Document new capabilities

#### Adding New Language Support
1. **Language Detection**: Update patterns in `language_utils.py`
2. **Response Formatting**: Add language templates
3. **AI Prompts**: Update system prompts
4. **Testing**: Verify translation accuracy

#### Adding New AI Features
1. **Update AI Handler**: Integrate new AI capabilities
2. **Update Response Formatter**: Format new response types
3. **Add Tests**: Verify AI integration
4. **Update API**: Add new endpoints if needed

### Pull Request Process

#### Before Submitting
- [ ] All tests pass
- [ ] Code follows project standards
- [ ] Documentation updated
- [ ] No sensitive data in code
- [ ] Performance tested

#### Submitting PR
1. Create feature branch: `git checkout -b feature/new-feature`
2. Push to fork: `git push origin feature/new-feature`
3. Create pull request with detailed description
4. Request code review from maintainers

---

## 📄 License & Support

### License
This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

### Support
- **Documentation**: Check `/docs` endpoint when server is running
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Use GitHub Discussions for questions
- **Email**: Contact development team for enterprise support

### Acknowledgments
- **Groq**: For providing LLaMA 3.3 API access
- **Twilio**: For WhatsApp Business API
- **MongoDB**: For Atlas cloud database hosting
- **Kenyan Farmers**: For inspiration and feedback

---

## 📊 Project Metrics

### Performance Targets
- **Response Time**: <3 seconds for AI responses
- **Voice Transcription**: <5 seconds for 30-second audio
- **Uptime**: >99.5% for production
- **Language Accuracy**: >95% for detection

### Success Metrics
- **Crop Loss Prevention**: Up to 40% reduction through early detection
- **Farmer Reach**: Target 100,000+ Kenyan farmers
- **Response Quality**: >90% user satisfaction rate
- **Cost Efficiency**: <$0.01 per AI response

---

*Last Updated: January 2025*
*Version: 1.0.0*
*Documentation Version: Complete*
