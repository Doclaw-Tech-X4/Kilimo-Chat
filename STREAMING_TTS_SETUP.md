# 🔊 Real-Time Streaming TTS Setup

This document explains the new streaming TTS feature that allows the bot to speak responses **word-by-word as they're generated**.

## ✅ What's New

### **Streaming AI Response with Real-Time TTS**
- **Before**: Bot waited for full response, then spoke all at once
- **Now**: Bot speaks sentences as they arrive, in real-time!

### **How It Works**
1. User sends message
2. AI generates response **chunk by chunk**
3. Each complete sentence is spoken immediately
4. User sees text appear AND hears audio simultaneously

---

## 🚀 Quick Start

### **1. Restart the Backend**
```bash
cd /home/lawrence/Documents/projects2/kilimo-chat-app/backend
pkill -f "python main.py"
python main.py
```

### **2. Restart the Frontend**
```bash
cd /home/lawrence/Documents/projects2/kilimo-chat-app
npm start
```

---

## 📁 Files Modified

### **Backend**
- `backend/main.py` - Added `/api/chat/stream` endpoint (Server-Sent Events)
- `backend/ai_handler.py` - Added `get_ai_response_streaming()` function
- `backend/config.py` - Fixed language-neutral prompts
- `backend/database.py` - Fixed user language updating
- `backend/language_utils.py` - Added `translate_response()` helper

### **Frontend**
- `src/components/ChatPage.js` - Streaming message handler + real-time TTS
- `src/components/ExpertChatPage.js` - Streaming message handler + real-time TTS
- `src/services/api.js` - Exported `API_BASE_URL` for streaming

---

## 🎙️ How Streaming TTS Works

```
User: "naomba kujua bei ya kuku"
     ↓
Frontend → POST /api/chat/stream
     ↓
Backend → AI generates: "📌 MUHTASARI" → Sends chunk
     ↓
Frontend → Speaks: "Muhtasari"
     ↓
Backend → AI generates: "Bei ya kuku..." → Sends chunk
     ↓
Frontend → Speaks: "Bei ya kuku ni kati ya Ksh 500-700"
     ↓
...and so on until complete
```

---

## 🔧 Technical Details

### **Backend Streaming**
- Uses **Server-Sent Events (SSE)** for real-time communication
- AI generates text using Groq's streaming API (`stream=True`)
- Each chunk is immediately sent to frontend via SSE
- Format: `data: {"type": "chunk", "text": "..."}\n\n`

### **Frontend Real-Time TTS**
- Uses `fetch()` with `response.body.getReader()` for streaming
- Accumulates text into sentences (split on `.`, `!`, `?`, `\n`)
- Speaks complete sentences using `SpeechSynthesisUtterance`
- Multiple sentences can queue up and speak sequentially

### **Sentence Buffering**
```javascript
sentenceBuffer += textChunk;

// When sentence ending found and buffer > 20 chars:
if (/[.!?\n]+/.test(sentenceBuffer) && sentenceBuffer.length > 20) {
    // Split into sentences
    // Speak complete sentences immediately
    // Keep incomplete sentence in buffer
}
```

---

## 🌍 Language Support

- **English**: Uses `en-US` voice
- **Swahili**: Uses `sw-KE` voice
- **Auto-detection**: Backend detects language from user input
- **Translation**: English responses auto-translated to Swahili headings

---

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat/stream` | POST | Streaming chat with real-time TTS |
| `/api/chat/message` | POST | Traditional non-streaming chat |

### **Streaming Request**
```json
POST /api/chat/stream
{
  "message": "naomba kujua bei ya kuku",
  "session_id": "session_1234567890_abc123"
}
```

### **Streaming Response (SSE)**
```
data: {"type": "metadata", "language": "sw"}

data: {"type": "chunk", "text": "📌 MUHTASARI"}

data: {"type": "chunk", "text": "Bei ya kuku..."}

data: {"type": "done", "full_text": "...", "language": "sw"}
```

---

## ⚙️ Configuration

### **Environment Variables**
No changes needed - uses existing `REACT_APP_API_URL`

### **TTS Settings**
```javascript
utterance.rate = 0.9;  // Slightly slower for clarity
utterance.pitch = 1;   // Normal pitch
utterance.lang = language === 'sw' ? 'sw-KE' : 'en-US';
```

---

## 🐛 Troubleshooting

### **No audio playing**
1. Check browser console for errors
2. Verify `window.speechSynthesis` is supported
3. Check if voices are loaded: `window.speechSynthesis.getVoices()`

### **Backend not streaming**
1. Check backend logs for errors
2. Verify Groq API key is valid
3. Test endpoint directly: `curl -X POST http://localhost:8000/api/chat/stream`

### **CORS errors**
1. Backend CORS is already configured
2. Check that frontend and backend are on allowed origins

---

## 📝 Notes

- **Fallback**: If streaming fails, falls back to regular `/api/chat/message`
- **Buffering**: Small delay (milliseconds) to accumulate complete sentences
- **Mobile**: Works on mobile browsers with speech synthesis support
- **Offline**: Requires internet connection for AI generation

---

## 🎉 Result

Users now experience:
- ✅ **Faster perceived response time** (audio starts immediately)
- ✅ **More natural conversation flow** (like talking to a person)
- ✅ **Better accessibility** (hear response while reading)
- ✅ **Same language consistency** (Swahili stays Swahili)

---

**Ready to test!** 🚀

Ask: `"naomba kujua bei ya kuku za mayai katika jiji ya nairobi"`

You'll see text appear word-by-word AND hear it spoken in real-time! 🔊
