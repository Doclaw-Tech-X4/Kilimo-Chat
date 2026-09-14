import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  MoreVertical,
  Mic,
  Send,
  Play,
  Pause,
  Volume2,
  Image as ImageIcon,
  FileText,
  X,
  Sun,
  Sparkles,
} from 'lucide-react'
import {
  sendChatMessage,
  formatTimestamp,
  generateMessageId,
  sendVoiceMessage,
  uploadFile,
  getUserLocation,
  getWeatherForLocation,
  getWeatherByName,
  API_BASE_URL,
} from '../services/api'
import DockNavigation from './DockNavigation'

const quickActions = [
  { label: 'Market Prices', msg: 'What are the current market prices for maize and beans?' },
  { label: 'Weather Alert', msg: 'Will it rain this week? Should I apply fertilizer?' },
  { label: 'Find Pest', msg: 'I found insects eating my maize leaves. What should I do?' },
]

const ChatPage = () => {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      type: 'bot',
      text: "Hello Mkulima! I'm your KilimoChat AI Expert. I can help with crop diseases, fertilizer advice, weather, and market prices. What would you like to know? 🌾",
      timestamp: formatTimestamp(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [fileSheetOpen, setFileSheetOpen] = useState(false)
  const [playingMsg, setPlayingMsg] = useState(null)
  const [weather, setWeather] = useState(null)
  const [userLoc, setUserLoc] = useState(null)
  const [recording, setRecording] = useState(false)
  const [recTime, setRecTime] = useState(0)
  const [uploading, setUploading] = useState(false)

  const messagesEndRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const startYRef = useRef(null)
  const startTimeRef = useRef(null)
  const fileInputRef = useRef(null)

  const [sessionId] = useState(
    () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  )

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, recording])

  useEffect(() => {
    const detect = async () => {
      try {
        const loc = await getUserLocation()
        setUserLoc(loc)
        const w = await getWeatherForLocation(loc.lat, loc.lon)
        if (w.success) setWeather(w)
      } catch {
        const w = await getWeatherByName('nairobi')
        if (w.success) setWeather(w)
      }
    }
    detect()
  }, [])

  const speakText = useCallback((text, language = 'en', id = null) => {
    const synth = window.speechSynthesis
    if (!synth) return
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = language === 'sw' ? 'sw-KE' : 'en-US'
    u.rate = 0.9
    u.onstart = () => setPlayingMsg(id || 'tts')
    u.onend = () => setPlayingMsg(null)
    u.onerror = () => setPlayingMsg(null)
    const voices = synth.getVoices()
    const preferred =
      voices.find((v) => v.lang.includes(language === 'sw' ? 'sw' : 'en') && v.name.includes('Google')) ||
      voices.find((v) => v.lang.includes(language === 'sw' ? 'sw' : 'en'))
    if (preferred) u.voice = preferred
    synth.speak(u)
  }, [])

  const toggleAudio = (text, isPlaying, language = 'en', id = null) => {
    if (isPlaying) window.speechSynthesis?.cancel(), setPlayingMsg(null)
    else speakText(text, language, id)
  }

  const handleSend = async (text = input) => {
    if (!text.trim() || loading) return
    const userMsg = { id: generateMessageId(), type: 'user', text: text.trim(), timestamp: formatTimestamp() }
    setMessages((p) => [...p, userMsg])
    setInput('')
    setLoading(true)
    const botId = generateMessageId()
    setMessages((p) => [...p, { id: botId, type: 'bot', text: '', timestamp: formatTimestamp(), isStreaming: true, detectedLanguage: 'en' }])

    let full = ''
    let lang = 'en'
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), session_id: sessionId }),
      })
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'metadata') lang = data.language || 'en'
            else if (data.type === 'chunk') {
              full += data.text || ''
              setMessages((p) => p.map((m) => (m.id === botId ? { ...m, text: full, detectedLanguage: lang } : m)))
            } else if (data.type === 'done') {
              const display = typeof data.full_text === 'string' && data.full_text.trim() ? data.full_text : full
              setMessages((p) => p.map((m) => (m.id === botId ? { ...m, text: display, isStreaming: false, detectedLanguage: data.language || lang } : m)))
              speakText(display, data.language || lang, botId)
            }
          } catch (e) {
            console.error('SSE parse error:', e)
          }
        }
      }
    } catch (err) {
      console.error('Stream error:', err)
      const fb = await sendChatMessage(text.trim())
      setMessages((p) =>
        p.map((m) =>
          m.id === botId
            ? { ...m, text: fb.message || 'Sorry, I had trouble connecting.', detectedLanguage: fb.language || 'en', isStreaming: false }
            : m
        )
      )
    } finally {
      setLoading(false)
    }
  }

  // ---------- Voice recording ----------
  const hasMediaRecorder = typeof MediaRecorder !== 'undefined'

  const startRecording = async (e) => {
    e?.preventDefault()
    e?.stopPropagation?.()
    if (!hasMediaRecorder) {
      alert('Voice recording is not supported on this device. Please type your question instead.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const rec = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm',
      })
      mediaRecorderRef.current = rec
      chunksRef.current = []
      rec.ondataavailable = (ev) => ev.data.size > 0 && chunksRef.current.push(ev.data)
      rec.onstop = async () => {
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000)
        if (duration < 1) {
          stream.getTracks().forEach((t) => t.stop())
          setRecording(false)
          setRecTime(0)
          return
        }
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setMessages((p) => [
          ...p,
          { id: generateMessageId(), type: 'user', messageType: 'voice', text: '🎤 Voice message', audioUrl: url, duration, timestamp: formatTimestamp() },
        ])
        setLoading(true)
        try {
          const res = await sendVoiceMessage(blob)
          setMessages((p) => [
            ...p,
            { id: generateMessageId(), type: 'bot', text: res.message || res.transcription || 'Sorry, I could not understand the voice message.', timestamp: formatTimestamp() },
          ])
        } catch (err) {
          console.error(err)
        }
        setLoading(false)
        stream.getTracks().forEach((t) => t.stop())
        setRecording(false)
        setRecTime(0)
      }
      rec.start(100)
      setRecording(true)
      startTimeRef.current = Date.now()
      if (e?.touches) startYRef.current = e.touches[0].clientY
      else if (e?.clientY) startYRef.current = e.clientY
      timerRef.current = setInterval(() => {
        setRecTime(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 100)
    } catch (err) {
      console.error('Mic error:', err)
      alert('Microphone access denied. Please allow microphone permissions.')
    }
  }

  const stopRecording = (e) => {
    e?.preventDefault()
    e?.stopPropagation?.()
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      if (timerRef.current) clearInterval(timerRef.current), (timerRef.current = null)
    }
  }

  const handleTouchMove = (e) => {
    if (!recording) return
    const y = e.touches?.[0]?.clientY ?? e.clientY
    if (startYRef.current && y && startYRef.current - y > 100) {
      // cancel
      mediaRecorderRef.current?.stop()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (timerRef.current) clearInterval(timerRef.current), (timerRef.current = null)
      setRecording(false)
      setRecTime(0)
    }
  }

  // ---------- File upload ----------
  const handleFile = async (file) => {
    if (!file) return
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      alert('File size must be less than 10MB')
      return
    }
    setFileSheetOpen(false)
    setUploading(true)
    const isImage = file.type.startsWith('image/')
    const isAudio = file.type.startsWith('audio/')
    const isVideo = file.type.startsWith('video/')
    const preview = isImage ? URL.createObjectURL(file) : null
    const label = isImage ? '📷 Photo' : isVideo ? '🎥 Video' : isAudio ? '🎤 Audio' : `📎 ${file.name}`
    setMessages((p) => [
      ...p,
      { id: generateMessageId(), type: 'user', messageType: isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'file', text: label, fileUrl: preview, fileName: file.name, timestamp: formatTimestamp() },
    ])
    try {
      const res = await uploadFile(file)
      setMessages((p) => [
        ...p,
        { id: generateMessageId(), type: 'bot', text: res.message || 'File processed. What would you like to know?', timestamp: formatTimestamp() },
      ])
    } catch (err) {
      setMessages((p) => [...p, { id: generateMessageId(), type: 'bot', text: 'Sorry, there was an error uploading your file.', timestamp: formatTimestamp() }])
    }
    setUploading(false)
  }

  const renderBubble = (m) => {
    if (m.messageType === 'image' && m.fileUrl) {
      return <img src={m.fileUrl} alt="Upload" className="max-h-48 w-full max-w-[220px] rounded-xl object-cover" />
    }
    if (m.messageType === 'voice' && m.audioUrl) {
      return (
        <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-2">
          <button
            onClick={() => toggleAudio(m.audioUrl, playingMsg === m.audioUrl, 'en', m.audioUrl)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-primary"
          >
            {playingMsg === m.audioUrl ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <span className="text-[12px] text-white">{m.duration}s</span>
        </div>
      )
    }
    if (m.messageType === 'file') {
      return (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span>{m.text}</span>
        </div>
      )
    }
    return null
  }

  const formatRecTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="flex min-h-dvh flex-col bg-page">
      {/* Header */}
      <header className="app-header">
        <div className="app-header-inner">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/home')} className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-card active:scale-95">
              <ArrowLeft className="h-[18px] w-[18px]" />
            </button>
            <div>
              <p className="text-[15px] font-extrabold text-ink">KilimoChat AI</p>
              <p className="flex items-center gap-1 text-[11.5px] font-semibold text-primary">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                Expert Assistant Online
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://wa.me/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 rounded-full bg-[#25D366]/15 px-3 py-1.5 text-xs font-bold text-[#25D366]"
            >
              WhatsApp
            </a>
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-card" aria-label="More">
              <MoreVertical className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 no-scrollbar">
        <div className="mb-3 flex justify-center">
          <span className="rounded-full bg-black/[0.05] px-3 py-1 text-[11.5px] font-medium text-ink-soft">Today</span>
        </div>

        {/* Weather quick card */}
        <button
          onClick={async () => {
            if (weather) {
              setMessages((p) => [...p, { id: generateMessageId(), type: 'bot', text: weather.message, timestamp: formatTimestamp() }])
            } else {
              setLoading(true)
              const w = userLoc ? await getWeatherForLocation(userLoc.lat, userLoc.lon) : await getWeatherByName('nairobi')
              if (w.success) {
                setWeather(w)
                setMessages((p) => [...p, { id: generateMessageId(), type: 'bot', text: w.message, timestamp: formatTimestamp() }])
              }
              setLoading(false)
            }
          }}
          className="card mb-3 flex w-full items-center gap-3 p-3.5 text-left"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
            <Sun className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-orange-500">Local Weather</span>
            <span className="block truncate text-[14px] font-bold text-ink">
              {weather?.weather ? `${weather.weather.temperature?.toFixed(0)}°C • ${weather.weather.description}` : 'Tap for today\'s forecast'}
            </span>
          </span>
          <span className="text-ink-faint">›</span>
        </button>

        {messages.map((m) =>
          m.type === 'bot' ? (
            <div key={m.id} className="mt-3 flex items-start gap-2.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full grad-green text-white">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="max-w-[78%]">
                <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-card">
                  {m.isStreaming && !m.text ? (
                    <span className="flex gap-1 py-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-faint" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-faint [animation-delay:120ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-faint [animation-delay:240ms]" />
                    </span>
                  ) : (
                    <p className={`whitespace-pre-line text-[14.5px] leading-relaxed text-ink ${m.isStreaming ? 'opacity-80' : ''}`}>{m.text}</p>
                  )}
                  <button
                    onClick={() => toggleAudio(m.text, playingMsg === m.id, m.detectedLanguage || 'en', m.id)}
                    className="mt-2 flex items-center gap-1 text-[12px] font-semibold text-primary active:scale-95"
                    disabled={!m.text}
                  >
                    {playingMsg === m.id ? <Pause className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                    {playingMsg === m.id ? 'Stop' : m.detectedLanguage === 'sw' ? 'Sikiliza' : 'Listen'}
                  </button>
                </div>
                <p className="mt-1 pl-1 text-[11px] text-ink-faint">{m.timestamp}</p>
              </div>
            </div>
          ) : (
            <div key={m.id} className="mt-3 flex justify-end">
              <div className="max-w-[78%]">
                <div className="rounded-2xl rounded-tr-sm grad-green px-4 py-3 text-white shadow-lifted">
                  {renderBubble(m) || <p className="whitespace-pre-line text-[14.5px] leading-relaxed">{m.text}</p>}
                </div>
                <p className="mt-1 pr-1 text-right text-[11px] text-ink-faint">{m.timestamp} ✓✓</p>
              </div>
            </div>
          )
        )}

        {uploading && (
          <div className="mt-3 flex items-center gap-2 pl-10 text-[13px] text-ink-soft">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Processing your file...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="safe-bottom border-t border-black/5 bg-white/90 px-3 pb-2.5 pt-2 backdrop-blur">
        <div className="mb-2 flex gap-2 overflow-x-auto no-scrollbar">
          {quickActions.map((q) => (
            <button
              key={q.label}
              onClick={() => setInput(q.msg)}
              className="whitespace-nowrap rounded-full border border-black/10 bg-page px-3 py-1.5 text-[12.5px] font-medium text-ink-soft active:scale-95"
            >
              {q.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFileSheetOpen(true)}
            disabled={loading || recording}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-ink-soft active:scale-95 disabled:opacity-40"
            aria-label="Attach file"
          >
            <ImageIcon className="h-5 w-5" />
          </button>

          <div className="flex flex-1 items-center rounded-full border border-black/10 bg-page px-4">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask about your crops..."
              disabled={loading || recording}
              className="w-full bg-transparent py-3 text-[15px] text-ink outline-none placeholder:text-ink-faint"
            />
          </div>

          {input.trim() ? (
            <button
              onClick={() => handleSend()}
              disabled={loading}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full grad-green text-white shadow-lifted active:scale-95 disabled:opacity-50"
              aria-label="Send"
            >
              <Send className="h-5 w-5" />
            </button>
          ) : (
            <button
              {...(hasMediaRecorder
                ? {
                  onMouseDown: startRecording,
                  onMouseUp: stopRecording,
                  onMouseLeave: stopRecording,
                  onTouchStart: startRecording,
                  onTouchEnd: stopRecording,
                  onTouchMove: handleTouchMove,
                }
                : { onClick: startRecording })}
              disabled={loading}
              className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-lifted active:scale-95 ${recording ? 'bg-red-500' : 'grad-green'
                } ${recording ? 'animate-pulse' : ''}`}
              aria-label="Record voice"
            >
              {recording && <span className="absolute inset-0 animate-pulse-ring rounded-full bg-red-500/60" />}
              <Mic className="h-5 w-5" />
            </button>
          )}
        </div>

        {recording && (
          <div className="mt-2 flex justify-center gap-3 text-[12px]">
            <span className="font-semibold text-red-500">{formatRecTime(recTime)}</span>
            <span className="text-ink-faint">Release to send · swipe up to cancel</span>
          </div>
        )}
      </div>

      {/* File sheet */}
      {fileSheetOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setFileSheetOpen(false)} />
          <div className="relative w-full max-w-md animate-fade-up rounded-t-[2rem] bg-white p-5 pb-8">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-black/10" />
            <h3 className="text-[17px] font-extrabold text-ink">Send a file</h3>
            <p className="mt-0.5 text-[13px] text-ink-soft">Share a photo of your crop for instant diagnosis (max 10MB).</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: 'Photo', icon: ImageIcon, accept: 'image/*' },
                { label: 'Audio', icon: Mic, accept: 'audio/*' },
                { label: 'Document', icon: FileText, accept: '*' },
              ].map((o) => (
                <button
                  key={o.label}
                  onClick={() => (fileInputRef.current.accept = o.accept || '*') || fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-black/5 bg-page p-4 text-ink-soft active:scale-95"
                >
                  <o.icon className="h-6 w-6 text-primary" />
                  <span className="text-[12.5px] font-semibold">{o.label}</span>
                </button>
              ))}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFile(e.target.files[0])
                e.target.value = ''
              }}
            />
          </div>
        </div>
      )}

      <DockNavigation />
    </div>
  )
}

export default ChatPage