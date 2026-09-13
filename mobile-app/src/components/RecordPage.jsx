import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, MessageCircle, X, ArrowLeft, Volume2, Pause, Lightbulb } from 'lucide-react'
import { sendChatMessage } from '../services/api'
import DockNavigation from './DockNavigation'

const RecordPage = () => {
  const navigate = useNavigate()
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [transcribedText, setTranscribedText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [aiResponse, setAiResponse] = useState('')
  const [showResponse, setShowResponse] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [detectedLang, setDetectedLang] = useState('en')
  const [hasMicSupport, setHasMicSupport] = useState(true)

  const timerRef = useRef(null)
  const recognitionRef = useRef(null)
  const isRecordingRef = useRef(false)
  const startRecordingRef = useRef(null)
  const isNavigatingRef = useRef(false)
  const hasProcessedRef = useRef(false)

  const speakResponse = (text, language = 'en') => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language === 'sw' ? 'sw-KE' : 'en-US'
    utterance.rate = 0.9
    const voices = window.speechSynthesis.getVoices()
    const preferred =
      voices.find((v) => v.lang.includes(language === 'sw' ? 'sw' : 'en') && v.name.includes('Google')) ||
      voices.find((v) => v.lang.includes(language === 'sw' ? 'sw' : 'en'))
    if (preferred) utterance.voice = preferred
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }

  const stopSpeaking = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }

  const detectLanguage = (text) => {
    const swahiliWords = ['bei', 'soko', 'mkulima', 'mboga', 'matunda', 'mahindi', 'mchele', 'samaki', 'nyama', 'nunga', 'nini', 'wapi', 'ngapi', 'karibu', 'asante', 'tafadhali', 'ndege', 'mbegu', 'dawa', 'shamba', 'habari', 'jambo']
    return swahiliWords.filter((w) => text.toLowerCase().includes(w)).length > 0 ? 'sw' : 'en'
  }

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const rec = new SpeechRecognition()
      rec.continuous = true
      rec.interimResults = true
      rec.lang = 'sw-TZ,en-US'
      rec.onresult = (event) => {
        let finalTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript
        }
        if (finalTranscript) setTranscribedText((prev) => (prev + ' ' + finalTranscript).trim())
      }
      rec.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsRecording(false)
      }
      recognitionRef.current = rec
    } else {
      setHasMicSupport(false)
    }

    setTimeout(() => {
      if (!isRecordingRef.current && !hasProcessedRef.current) startRecordingRef.current?.()
    }, 500)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      recognitionRef.current?.stop()
    }
  }, [])

  useEffect(() => {
    isRecordingRef.current = isRecording
  }, [isRecording])

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRecording])

  const startRecording = useCallback(() => {
    setIsRecording(true)
    setRecordingTime(0)
    setTranscribedText('')
    setShowResponse(false)
    hasProcessedRef.current = false
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start()
      } catch (e) {
        console.log('Recognition already started')
      }
    }
  }, [])

  useEffect(() => {
    startRecordingRef.current = startRecording
  }, [startRecording])

  const stopRecording = async () => {
    setIsRecording(false)
    recognitionRef.current?.stop()

    if (transcribedText.trim() && !hasProcessedRef.current && !isNavigatingRef.current) {
      hasProcessedRef.current = true
      setIsProcessing(true)
      try {
        const response = await sendChatMessage(transcribedText.trim())
        setAiResponse(response.message)
        setDetectedLang(response.language || response.detected_language || detectLanguage(transcribedText.trim()))
        setShowResponse(true)
      } catch {
        setAiResponse('Samahani, kuna hitilafu. / Sorry, something went wrong.')
        setShowResponse(true)
      }
      setIsProcessing(false)
    }
  }

  const cancelRecording = () => {
    setIsRecording(false)
    setRecordingTime(0)
    setTranscribedText('')
    setShowResponse(false)
    recognitionRef.current?.stop()
  }

  const goToChat = () => {
    isNavigatingRef.current = true
    recognitionRef.current?.stop()
    setIsRecording(false)
    navigate('/chat', { state: { initialMessage: transcribedText } })
  }

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="min-h-dvh bg-page">
      <div className="screen px-0">
        <header className="app-header">
          <div className="app-header-inner">
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/home')} className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-card active:scale-95">
                <ArrowLeft className="h-[18px] w-[18px]" />
              </button>
              <div>
                <p className="text-[15px] font-extrabold text-ink">Voice Assistant</p>
                <p className="text-[11.5px] font-semibold text-primary">Sema kwa Sauti / Speak</p>
              </div>
            </div>
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-card" aria-label="Help">
              <Lightbulb className="h-[18px] w-[18px] text-amber-500" />
            </button>
          </div>
        </header>

        <div className="flex-1 px-5 pb-4">
          {!hasMicSupport && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-700">
              Voice recognition isn't available in this web view. Please type your question using the chat feature instead — voice recording still works for sending audio clips.
            </div>
          )}

          <div className="relative overflow-hidden rounded-[2rem] border border-white bg-white/80 p-8 text-center shadow-lifted backdrop-blur">
            <div className="absolute inset-0 bg-emerald-50/40" />
            <div className="relative">
              <h2 className={`text-[22px] font-extrabold ${isRecording ? 'text-red-500' : 'text-primary'}`}>
                {isRecording ? 'Sikiliza... / Listening...' : 'Sema sasa... / Speak now...'}
              </h2>
              <p className="mt-1 text-[13px] text-ink-soft">
                {isRecording ? 'Recording... / Inarekodi...' : 'Recording starts automatically / Rekodi inaanza kiotomatiki'}
              </p>

              {(transcribedText || isRecording) && (
                <div className="mt-5 rounded-2xl border border-black/5 bg-white/70 p-4 text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Transcribed / Kilichotamkwa</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-ink">{transcribedText || 'Listening...'}</p>
                </div>
              )}

              {showResponse && aiResponse && (
                <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">AI Response / Jibu</p>
                  <p className="mt-1 whitespace-pre-line text-[13.5px] leading-relaxed text-ink">{aiResponse}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => (isSpeaking ? stopSpeaking() : speakResponse(aiResponse, detectedLang))}
                      className="btn-primary px-4 py-2 text-[13px]"
                    >
                      {isSpeaking ? <Pause className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      {isSpeaking ? 'Stop / Simamisha' : detectedLang === 'sw' ? 'Sikiliza' : 'Listen'}
                    </button>
                    <button onClick={goToChat} className="px-3 py-2 text-[13px] font-bold text-primary">
                      Continue in Chat →
                    </button>
                  </div>
                </div>
              )}

              {isProcessing && (
                <div className="mt-5 flex items-center justify-center gap-2 text-[13.5px] font-semibold text-primary">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Processing... / Inachakata...
                </div>
              )}

              <div className="relative mt-8 flex justify-center pb-2">
                {isRecording && (
                  <>
                    <span className="absolute h-40 w-40 rounded-full bg-primary/10" style={{ animation: 'ping 1.2s cubic-bezier(0,0,0.2,1) infinite' }} />
                    <span className="absolute h-52 w-52 rounded-full bg-primary/5" style={{ animation: 'pulse 1.8s ease-in-out infinite' }} />
                  </>
                )}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`relative z-10 flex h-28 w-28 cursor-pointer items-center justify-center rounded-full shadow-lifted transition-all duration-200 active:scale-95 ${
                    isRecording ? 'bg-red-500' : 'grad-green'
                  }`}
                  aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                >
                  {isRecording && <span className="absolute inset-0 animate-pulse-ring rounded-full bg-red-500/60" />}
                  <Mic className={`h-10 w-10 text-white ${isRecording ? 'animate-pulse' : ''}`} />
                </button>
              </div>

              <div className="mt-4">
                <span className={`text-3xl font-extrabold tabular-nums tracking-widest ${isRecording ? 'text-red-500' : 'text-ink'}`}>
                  {formatTime(recordingTime)}
                </span>
              </div>

              {isRecording && (
                <div className="mt-5 flex h-10 items-center justify-center gap-1 overflow-hidden">
                  {[...Array(18)].map((_, i) => (
                    <div
                      key={i}
                      className="w-[5px] rounded-full bg-primary"
                      style={{
                        height: `${25 + Math.random() * 30}px`,
                        animation: `pulse 0.8s ease-in-out ${i * 0.08}s infinite`,
                      }}
                    />
                  ))}
                </div>
              )}

              <div className="mt-7 grid grid-cols-2 gap-3">
                <button
                  onClick={cancelRecording}
                  className="flex h-[52px] items-center justify-center gap-2 rounded-2xl border-2 border-black/10 bg-white py-3.5 text-[14px] font-bold text-ink-soft transition-all active:scale-95"
                >
                  <X className="h-5 w-5" />
                  Cancel
                </button>
                <button
                  onClick={isRecording ? stopRecording : goToChat}
                  disabled={!isRecording && !transcribedText}
                  className={`flex h-[52px] items-center justify-center gap-2 rounded-2xl py-3.5 text-[14px] font-extrabold text-white shadow-lifted transition-all active:scale-95 ${
                    isRecording || transcribedText ? 'grad-green' : 'cursor-not-allowed bg-black/10 text-black/30 shadow-none'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <MessageCircle className="h-5 w-5" />
                      Stop & Send
                    </>
                  ) : (
                    <>
                      <MessageCircle className="h-5 w-5" />
                      Go to Chat
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-black/[0.03] p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                <Lightbulb className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[13px] font-bold text-ink">Tip: Ask about pests, soil, or market prices</p>
                <p className="mt-0.5 text-[12px] text-ink-soft">Uliza kuhusu wadudu, udongo, au bei za soko</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <DockNavigation />
    </div>
  )
}

export default RecordPage