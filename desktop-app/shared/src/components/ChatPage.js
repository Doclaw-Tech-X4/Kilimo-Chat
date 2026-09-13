import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Send,
  Paperclip,
  Mic,
  Play,
  Pause,
  CloudSun,
  MapPin,
  ShoppingBag,
  Bug,
  Sparkles,
  Trash2,
  FileText,
  FileImage,
  FileAudio,
  FileVideo,
  X,
} from 'lucide-react';
import {
  API_BASE_URL,
  sendChatMessage,
  sendVoiceMessage,
  uploadFile,
  getUserLocation,
  getWeatherForLocation,
  getWeatherByName,
  getTextToSpeech,
  generateMessageId,
  formatTimestamp,
} from '../services/api';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';

const QUICK_CHIPS = [
  { label: 'Market Prices', icon: ShoppingBag, text: 'Current market prices for maize in Kenya' },
  { label: 'Weather Alert', icon: CloudSun, text: 'Weather forecast and planting advice for this week' },
  { label: 'Find Pest', icon: Bug, text: 'How to identify and control fall armyworm' },
];

const ACCEPT_MAP = {
  image: 'image/jpeg,image/png,image/gif,image/webp',
  video: 'video/mp4,video/webm,video/quicktime',
  audio: 'audio/mpeg,audio/wav,audio/webm,audio/mp4',
  document: 'application/pdf,text/plain',
};

const MIME_LABEL = {
  image: { icon: FileImage, label: 'Image' },
  video: { icon: FileVideo, label: 'Video' },
  audio: { icon: FileAudio, label: 'Audio' },
  document: { icon: FileText, label: 'Document' },
};

const InitialMessage = () => ({
  id: 'welcome',
  type: 'bot',
  text: 'Karibu! 🌾 I am your AI farming assistant. Ask me about crop diseases, pests, fertilizers, weather or market prices — in English or Swahili.',
  timestamp: new Date(),
  detectedLanguage: 'en',
});

const ChatPage = () => {
  const location = useLocation();
  const [messages, setMessages] = useState([InitialMessage()]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [currentWeather, setCurrentWeather] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const sessionIdRef = useRef('');
  const chunkBufferRef = useRef('');
  const handleSendRef = useRef(null);
  const processedInitialRef = useRef(false);

  useEffect(() => {
    const sid = `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    sessionIdRef.current = sid;
    setSessionId(sid);

    const loadWeather = async () => {
      try {
        const loc = await getUserLocation();
        const res = await getWeatherForLocation(loc.lat, loc.lon);
        if (res.success && res.weather) setCurrentWeather(res.weather);
      } catch (err) {
        try {
          const res = await getWeatherByName('nairobi');
          if (res.success && res.weather) setCurrentWeather(res.weather);
        } catch (e2) {
          /* ignore */
        }
      }
    };
    loadWeather();
  }, []);

  // Keep the latest handleSend available to the queued initial message.
  useEffect(() => {
    handleSendRef.current = handleSend;
  });

  // Consume an initial message handed over from the Voice Record page.
  useEffect(() => {
    const initial = location.state?.initialMessage;
    if (initial && !processedInitialRef.current) {
      processedInitialRef.current = true;
      window.history.replaceState({}, document.title);
      const timer = setTimeout(() => {
        handleSendRef.current?.(initial);
      }, 400);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [location.state]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const speakStreamText = useCallback(
    (fullText) => {
      if (
        !autoSpeak ||
        typeof window.speechSynthesis === 'undefined' ||
        playingId !== null
      ) {
        return;
      }
      const sentences = fullText.match(/[^.!?]+[.!?]+/g);
      if (!sentences) return;
      const sentence = sentences[sentences.length - 1]?.trim();
      if (!sentence) return;
      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.lang = 'en-US';
      utterance.rate = 0.95;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    },
    [autoSpeak, playingId]
  );

  const handleSend = async (textOverride) => {
    const text = (textOverride || inputMessage).trim();
    if (!text || isLoading) return;

    setInputMessage('');
    const userMsg = {
      id: generateMessageId(),
      type: 'user',
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const botId = generateMessageId();
    setMessages((prev) => [
      ...prev,
      { id: botId, type: 'bot', text: '', timestamp: new Date(), isStreaming: true },
    ]);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: sessionIdRef.current,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.includes('text/event-stream') || contentType.includes('application/x-ndjson')) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let acc = '';
        chunkBufferRef.current = '';

        const parseChunk = () => {
          const lines = acc.split('\n');
          acc = lines.pop();
          lines.forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) return;
            const payload = trimmed.slice(5).trim();
            if (!payload) return;
            let data;
            try {
              data = JSON.parse(payload);
            } catch (err) {
              return;
            }

            if (data.type === 'metadata' && data.language) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === botId ? { ...m, detectedLanguage: data.language } : m
                )
              );
            } else if (data.type === 'chunk' && data.text) {
              chunkBufferRef.current += data.text;
              setMessages((prev) =>
                prev.map((m) => (m.id === botId ? { ...m, text: chunkBufferRef.current } : m))
              );
            } else if (data.type === 'done' && data.full_text) {
              chunkBufferRef.current = data.full_text;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === botId
                    ? {
                        ...m,
                        text: data.full_text,
                        isStreaming: false,
                        detectedLanguage: data.language || m.detectedLanguage,
                      }
                    : m
                )
              );
              speakStreamText(data.full_text);
            } else if (data.type === 'error') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === botId
                    ? { ...m, text: data.message || 'Something went wrong.', isStreaming: false }
                    : m
                )
              );
            }
          });
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          parseChunk();
        }
        parseChunk();

        setMessages((prev) =>
          prev.map((m) =>
            m.id === botId
              ? {
                  ...m,
                  text: chunkBufferRef.current || m.text,
                  isStreaming: false,
                }
              : m
          )
        );
      } else {
        const data = await response.json();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botId
              ? {
                  ...m,
                  text: data.response || data.message || 'No response.',
                  isStreaming: false,
                  detectedLanguage: data.detected_language || data.language,
                }
              : m
          )
        );
      }
    } catch (error) {
      console.error('Stream error:', error);
      try {
        const fallback = await sendChatMessage(text, 'web_user');
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botId
              ? { ...m, text: fallback.message || 'Please try again.', isStreaming: false }
              : m
          )
        );
      } catch (e2) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botId
              ? { ...m, text: 'I am having trouble connecting to the server. Please try again.', isStreaming: false }
              : m
          )
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickChip = (text) => {
    handleSend(text);
  };

  const handleVoiceComplete = useCallback(async (blob, duration) => {
    setMessages((prev) => [
      ...prev,
      {
        id: generateMessageId(),
        type: 'user',
        text: '🎙️ Voice message',
        timestamp: new Date(),
        messageType: 'voice',
        audioUrl: URL.createObjectURL(blob),
        duration,
      },
    ]);

    setIsLoading(true);
    const botId = generateMessageId();
    setMessages((prev) => [
      ...prev,
      { id: botId, type: 'bot', text: '', timestamp: new Date(), isStreaming: true },
    ]);

    const res = await sendVoiceMessage(blob, 'web_user');
    const reply = res.message || res.transcription || 'I received your voice message.';
    setMessages((prev) =>
      prev.map((m) =>
        m.id === botId
          ? { ...m, text: reply, isStreaming: false, detectedLanguage: res.detected_language }
          : m
      )
    );
    setIsLoading(false);
    if (autoSpeak) speakStreamText(reply);
  }, [autoSpeak, speakStreamText]);

  const { isRecording, recordingTime, formattedTime, isCancelled, cancelRecording, recordingProps } =
    useVoiceRecorder(handleVoiceComplete);

  const pickFileType = (type) => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.accept = ACCEPT_MAP[type] || '*';
      fileInputRef.current.click();
    }
  };

  const onFilePicked = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File is too large (max 10MB).');
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
    setIsFileModalOpen(true);
    e.target.value = '';
  };

  const sendSelectedFile = async () => {
    if (!selectedFile) return;
    setIsFileModalOpen(false);

    setMessages((prev) => [
      ...prev,
      {
        id: generateMessageId(),
        type: 'user',
        text: `📎 ${selectedFile.name}`,
        timestamp: new Date(),
        messageType: selectedFile.type.startsWith('image/') ? 'image' : 'file',
        fileUrl: filePreview || undefined,
        fileType: selectedFile.type,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
      },
    ]);

    setIsLoading(true);
    const botId = generateMessageId();
    setMessages((prev) => [
      ...prev,
      { id: botId, type: 'bot', text: '', timestamp: new Date(), isStreaming: true },
    ]);

    const res = await uploadFile(selectedFile, 'web_user', '');
    setMessages((prev) =>
      prev.map((m) =>
        m.id === botId
          ? { ...m, text: res.message || 'I analyzed your file.', isStreaming: false }
          : m
      )
    );
    setIsLoading(false);
    setSelectedFile(null);
    setFilePreview(null);
  };

  const togglePlay = async (msg) => {
    if (!msg.text) return;
    if (playingId === msg.id) {
      setPlayingId(null);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      return;
    }

    setPlayingId(msg.id);
    try {
      const res = await getTextToSpeech(msg.text, msg.detectedLanguage === 'sw' ? 'sw' : 'en');
      if (res.success && res.audio_url) {
        const audio = new Audio(res.audio_url);
        audio.onended = () => setPlayingId(null);
        audio.onerror = () => {
          setPlayingId(null);
          speakBrowser(msg.text, msg.detectedLanguage === 'sw' ? 'sw-KE' : 'en-US');
        };
        audio.play();
      } else {
        speakBrowser(msg.text, msg.detectedLanguage === 'sw' ? 'sw-KE' : 'en-US');
      }
    } catch (err) {
      setPlayingId(null);
      speakBrowser(msg.text, msg.detectedLanguage === 'sw' ? 'sw-KE' : 'en-US');
    }
  };

  const speakBrowser = (text, lang) => {
    if (!window.speechSynthesis) {
      setPlayingId(null);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang || 'en-US';
    utterance.rate = 0.95;
    utterance.onend = () => setPlayingId(null);
    utterance.onerror = () => setPlayingId(null);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const copyMessage = (text) => {
    navigator.clipboard?.writeText(text).then(() => {
      // transient feedback could go here
    }).catch(() => {});
  };

  return (
    <div className="flex h-full flex-col kc-fade-in">
      {/* Weather strip */}
      {currentWeather && (
        <div className="mb-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#e6f5e9] to-[#d1efd6] px-4 py-2.5">
          <CloudSun className="h-5 w-5 flex-shrink-0 text-primary" />
          <div className="min-w-0 flex-1 truncate text-xs text-[#5d6a60]">
            <span className="font-bold text-[#1f2937]">{Math.round(currentWeather.temperature ?? 0)}°C</span> ·{' '}
            {currentWeather.description}
            {currentWeather.recommendation && (
              <span className="hidden xl:inline"> — {String(currentWeather.recommendation).slice(0, 70)}…</span>
            )}
          </div>
          <MapPin className="h-4 w-4 flex-shrink-0 text-primary/60" />
        </div>
      )}

      {/* Chat area */}
      <div className="kc-card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 md:p-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} kc-fade-in-up`}
            >
              {msg.type === 'bot' && (
                <div className="mr-2 mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-light to-primary text-sm">
                  🌱
                </div>
              )}
              <div className={msg.type === 'user' ? 'kc-bubble-user' : 'kc-bubble-bot'}>
                {msg.isStreaming && !msg.text ? (
                  <div className="kc-typing flex items-center">
                    <span />
                    <span />
                    <span />
                  </div>
                ) : null}

                {msg.messageType === 'voice' && msg.audioUrl ? (
                  <div className="flex items-center gap-2">
                    <FileAudio className="h-4 w-4" />
                    <span>Voice message</span>
                    <audio controls src={msg.audioUrl} className="h-8 w-44" />
                  </div>
                ) : msg.messageType === 'image' && msg.fileUrl ? (
                  <div className="w-full max-w-[340px] overflow-hidden rounded-lg">
                    <img src={msg.fileUrl} alt="Upload" className="max-h-48 w-full object-cover" />
                  </div>
                ) : msg.messageType === 'file' ? (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <a
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      className="text-sm font-semibold underline"
                    >
                      {msg.fileName}
                    </a>
                  </div>
                ) : null}

                {msg.text && <div className="break-words">{msg.text}</div>}

                <div className="mt-1.5 flex items-center gap-2">
                  <span
                    className={`text-[10px] ${
                      msg.type === 'user' ? 'text-white/70' : 'text-[#a2aca4]'
                    }`}
                  >
                    {formatTimestamp(msg.timestamp)}
                  </span>
                  {msg.detectedLanguage && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                        msg.type === 'user'
                          ? 'bg-white/20 text-white'
                          : 'bg-[#e6f5e9] text-primary'
                      }`}
                    >
                      {msg.detectedLanguage}
                    </span>
                  )}
                  {msg.type === 'bot' && msg.text && !msg.isStreaming && (
                    <>
                      <button
                        type="button"
                        onClick={() => togglePlay(msg)}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e6f5e9] text-primary transition-all hover:scale-110"
                        title={playingId === msg.id ? 'Stop' : 'Listen'}
                      >
                        {playingId === msg.id ? (
                          <Pause className="h-3 w-3" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyMessage(msg.text)}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f3f6f3] text-[#8a938c] transition-all hover:scale-110 hover:text-primary"
                        title="Copy"
                      >
                        <FileText className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start kc-fade-in-up">
              <div className="mr-2 mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-light to-primary text-sm">
                🌱
              </div>
              <div className="kc-bubble-bot">
                <div className="kc-typing flex items-center">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick chips */}
        <div className="flex flex-wrap gap-2 border-t border-[#f0f3f0] px-4 py-2.5">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => handleQuickChip(chip.text)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#dde5de] bg-white px-3 py-1.5 text-xs font-semibold text-[#5d6a60] transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:opacity-50"
            >
              <chip.icon className="h-3.5 w-3.5" />
              {chip.label}
            </button>
          ))}
          <label className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-[#8a938c]">
            <input
              type="checkbox"
              checked={autoSpeak}
              onChange={(e) => setAutoSpeak(e.target.checked)}
              className="h-3.5 w-3.5 accent-primary"
            />
            Auto-speak replies
          </label>
        </div>

        {/* Input */}
        <div className="flex items-end gap-2 border-t border-[#eef2ef] p-3">
          <button
            type="button"
            onClick={() => setIsFileModalOpen(true)}
            className="kc-btn-ghost !px-2.5"
            title="Attach a file"
          >
            <Paperclip className="h-5 w-5" />
          </button>

          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask about crops, pests, weather, prices…"
              className="kc-input min-h-[46px] resize-none !py-2.5 pr-10"
              rows={1}
            />
            <Sparkles className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c2ccc4]" />
          </div>

          {inputMessage.trim() ? (
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={isLoading}
              className="kc-btn-primary h-[46px] w-[46px] !rounded-full !p-0"
              title="Send message"
            >
              <Send className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              {...recordingProps}
              className={`relative flex h-[46px] w-[46px] items-center justify-center rounded-full transition-all duration-200 ${
                isRecording
                  ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg'
                  : 'bg-gradient-to-br from-primary-light to-primary text-white shadow-soft hover:scale-105'
              }`}
              title={isRecording ? 'Recording… release to send' : 'Hold to record voice'}
            >
              {isRecording && (
                <span className="absolute inset-0 animate-ping rounded-full bg-red-500/40" />
              )}
              <Mic className="h-5 w-5" />
              {isRecording && (
                <span className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#1f2937] px-2 py-1 text-[10px] font-bold text-white">
                  {formattedTime}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Recording overlay */}
      {isRecording && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onMouseUp={recordingProps.onMouseUp}
          onMouseLeave={recordingProps.onMouseUp}
          onTouchEnd={recordingProps.onTouchEnd}
        >
          <div className="flex flex-col items-center gap-5 text-white kc-scale-in">
            <div className="relative">
              <span className="absolute inset-0 animate-ping rounded-full bg-red-500/40" />
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 shadow-2xl">
                <Mic className="h-10 w-10" />
              </div>
            </div>
            <div className="text-3xl font-extrabold">{formattedTime}</div>
            <div className="flex items-center gap-1">
              {Array.from({ length: 22 }).map((_, i) => (
                <span
                  key={i}
                  className="w-1 rounded-full bg-white"
                  style={{
                    height: `${8 + Math.random() * 28}px`,
                    animation: `waveform 1s ease-in-out ${(i * 0.05).toFixed(2)}s infinite`,
                  }}
                />
              ))}
            </div>
            <div className="text-sm text-white/80">Release to send · drag away to cancel</div>
            <button
              type="button"
              onClick={cancelRecording}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-red-500"
            >
              <Trash2 className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      {/* File modal */}
      {(isFileModalOpen || selectedFile) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => {
            setIsFileModalOpen(false);
            setSelectedFile(null);
            setFilePreview(null);
          }}
        >
          <div
            className="kc-card w-full max-w-lg overflow-hidden kc-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#eef2ef] px-5 py-3.5">
              <h3 className="text-[15px] font-bold text-[#1f2937]">Attach a file</h3>
              <button
                type="button"
                onClick={() => {
                  setIsFileModalOpen(false);
                  setSelectedFile(null);
                }}
                className="kc-btn-ghost !px-1.5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              {!selectedFile ? (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {Object.entries(MIME_LABEL).map(([key, meta]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => pickFileType(key)}
                        className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[#d7dfd8] p-4 transition-all hover:border-primary hover:bg-primary/5"
                      >
                        <meta.icon className="h-6 w-6 text-primary" />
                        <span className="text-xs font-semibold text-[#5d6a60]">{meta.label}</span>
                      </button>
                    ))}
                  </div>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={onFilePicked} />
                </>
              ) : (
                <div>
                  {filePreview ? (
                    <img src={filePreview} alt="preview" className="mx-auto max-h-52 rounded-xl object-contain" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 rounded-2xl bg-[#f3f6f3] p-6">
                      <FileText className="h-10 w-10 text-primary" />
                      <div className="text-sm font-semibold text-[#1f2937]">{selectedFile.name}</div>
                      <div className="text-xs text-[#8a938c]">
                        {(selectedFile.size / 1024).toFixed(1)} KB · {selectedFile.type || 'unknown type'}
                      </div>
                    </div>
                  )}
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      className="kc-btn-outline"
                      onClick={() => {
                        setSelectedFile(null);
                        setFilePreview(null);
                      }}
                    >
                      Change
                    </button>
                    <button type="button" className="kc-btn-primary" onClick={sendSelectedFile}>
                      <Send className="h-4 w-4" />
                      Send File
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;