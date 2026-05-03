import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MoreVertical, 
  Camera, 
  Mic, 
  Tractor, 
  Settings, 
  Send,
  Play,
  Pause,
  Volume2,
  ChevronRight,
  SunMedium,
} from 'lucide-react';
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
} from '../services/api';
import VoiceRecordingOverlay from './VoiceRecordingOverlay';
import FileUploadModal from './FileUploadModal';
import DockNavigation from './DockNavigation';

const ExpertChatPage = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      type: 'bot',
      text: "Hello Mkulima! I'm your KilimoChat AI Expert. I can help you with crop diseases, fertilizer advice, weather, and market prices. What would you like to know? 🌾",
      timestamp: formatTimestamp(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [autoSpeak, setAutoSpeak] = useState(false); // Audio only plays when user clicks speak button
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [userLocation, setUserLocation] = useState(null);
  const [currentWeather, setCurrentWeather] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingCancelled, setRecordingCancelled] = useState(false);
  const messagesEndRef = useRef(null);
  const audioRef = useRef(new Audio());
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startYRef = useRef(null);
  const startTimeRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Get user location on mount
  useEffect(() => {
    const detectLocation = async () => {
      try {
        const location = await getUserLocation();
        setUserLocation(location);
        const weather = await getWeatherForLocation(location.lat, location.lon);
        if (weather.success) {
          setCurrentWeather(weather);
        }
      } catch (error) {
        console.log('Location detection failed:', error);
        const weather = await getWeatherByName('nairobi');
        if (weather.success) {
          setCurrentWeather(weather);
        }
      }
    };
    
    detectLocation();
  }, []);

  // Text-to-Speech using browser's native API
  const speakText = (text, language = 'en', messageId = null) => {
    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported');
      return;
    }
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'sw' ? 'sw-KE' : 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.lang.includes(language === 'sw' ? 'sw' : 'en') && v.name.includes('Google')
    ) || voices.find(v => 
      v.lang.includes(language === 'sw' ? 'sw' : 'en')
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.onstart = () => setPlayingAudio(messageId || 'tts');
    utterance.onend = () => setPlayingAudio(null);
    utterance.onerror = () => setPlayingAudio(null);
    
    window.speechSynthesis.speak(utterance);
  };

  // Stop TTS
  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setPlayingAudio(null);
  };

  // Handle weather click
  const handleWeatherClick = async () => {
    if (currentWeather) {
      const weatherMessage = {
        id: generateMessageId(),
        type: 'bot',
        text: currentWeather.message,
        timestamp: formatTimestamp(),
      };
      
      setMessages((prev) => [...prev, weatherMessage]);
      
      if (autoSpeak) {
        speakText(currentWeather.message);
      }
    } else {
      setIsLoading(true);
      try {
        let weather;
        if (userLocation) {
          weather = await getWeatherForLocation(userLocation.lat, userLocation.lon);
        } else {
          weather = await getWeatherByName('nairobi');
        }
        
        if (weather.success) {
          setCurrentWeather(weather);
          const weatherMessage = {
            id: generateMessageId(),
            type: 'bot',
            text: weather.message,
            timestamp: formatTimestamp(),
          };
          setMessages((prev) => [...prev, weatherMessage]);
          
          if (autoSpeak) {
            speakText(weather.message);
          }
        }
      } catch (error) {
        console.error('Weather fetch error:', error);
      }
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (text = inputMessage) => {
    if (!text.trim() || isLoading) return;

    const userMessage = {
      id: generateMessageId(),
      type: 'user',
      text: text.trim(),
      timestamp: formatTimestamp(),
    };

    // Add user message to chat
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Use streaming API for real-time TTS
    await handleStreamingMessage(userMessage.text);
  };

  // Streaming message handler for real-time TTS
  const handleStreamingMessage = async (messageText) => {
    const botMessageId = generateMessageId();
    let fullResponse = '';
    let detectedLang = 'en';
    let sentenceBuffer = '';
    let isSpeaking = false;

    try {
      // Create initial bot message
      const initialBotMessage = {
        id: botMessageId,
        type: 'bot',
        text: '',
        timestamp: formatTimestamp(),
        detectedLanguage: 'en',
        isStreaming: true,
      };
      setMessages((prev) => [...prev, initialBotMessage]);

      // Use fetch with streaming
      const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'metadata') {
                detectedLang = data.language || 'en';
                // Update message with detected language
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === botMessageId
                      ? { ...msg, detectedLanguage: detectedLang }
                      : msg
                  )
                );
              } else if (data.type === 'chunk') {
                const textChunk = data.text || '';
                fullResponse += textChunk;
                sentenceBuffer += textChunk;

                // Update the message text
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === botMessageId
                      ? { ...msg, text: fullResponse }
                      : msg
                  )
                );

                // Speak complete sentences for real-time TTS
                const sentenceEndings = /[.!?\n]+/;
                if (sentenceEndings.test(sentenceBuffer) && sentenceBuffer.length > 20) {
                  const sentences = sentenceBuffer.split(sentenceEndings);
                  
                  if (sentences.length > 1) {
                    const completeSentences = sentences.slice(0, -1).join('. ') + '.';
                    sentenceBuffer = sentences[sentences.length - 1];
                    
                    if (!isSpeaking && completeSentences.trim().length > 10) {
                      isSpeaking = true;
                      speakStreamingChunk(completeSentences.trim(), detectedLang, () => {
                        isSpeaking = false;
                      });
                    }
                  }
                }
              } else if (data.type === 'done') {
                // Stream complete - speak any remaining text
                if (sentenceBuffer.trim().length > 5 && !isSpeaking) {
                  speakStreamingChunk(sentenceBuffer.trim(), detectedLang);
                }
                
                // Mark message as complete
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === botMessageId
                      ? { ...msg, isStreaming: false }
                      : msg
                  )
                );
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      // Fallback to non-streaming
      try {
        const response = await sendChatMessage(messageText);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId
              ? {
                  ...msg,
                  text: response.message,
                  detectedLanguage: response.language || response.detected_language || 'en',
                  isStreaming: false,
                }
              : msg
          )
        );
      } catch (fallbackError) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMessageId
              ? {
                  ...msg,
                  text: 'Sorry, I had trouble connecting. Please try again.',
                  isStreaming: false,
                }
              : msg
          )
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Speak a chunk of text in real-time streaming
  const speakStreamingChunk = (text, language, onEnd) => {
    if (!window.speechSynthesis || !text.trim()) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'sw' ? 'sw-KE' : 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        v.lang.includes(language === 'sw' ? 'sw' : 'en') &&
        v.name.includes('Google')
    ) || voices.find((v) => v.lang.includes(language === 'sw' ? 'sw' : 'en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    if (onEnd) {
      utterance.onend = onEnd;
    }

    window.speechSynthesis.speak(utterance);
  };

  // Toggle TTS playback
  const toggleAudio = (text, isPlaying, language = 'en', messageId = null) => {
    if (isPlaying) {
      stopSpeaking();
    } else {
      speakText(text, language, messageId);
    }
  };

  // Start voice recording
  const startRecording = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') 
          ? 'audio/webm' 
          : 'audio/mp4'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        if (recordingCancelled) {
          setRecordingCancelled(false);
          return;
        }
        
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        
        if (duration < 1) return;
        
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const tempVoiceUrl = URL.createObjectURL(audioBlob);
        
        const voiceMessage = {
          id: generateMessageId(),
          type: 'user',
          messageType: 'voice',
          text: '🎤 Voice message',
          audioUrl: tempVoiceUrl,
          duration: duration,
          timestamp: formatTimestamp(),
        };
        
        setMessages((prev) => [...prev, voiceMessage]);
        setIsLoading(true);
        
        try {
          const response = await sendVoiceMessage(audioBlob);
          
          if (response.success) {
            const botMessage = {
              id: generateMessageId(),
              type: 'bot',
              text: response.message || response.transcription,
              timestamp: formatTimestamp(),
            };
            
            setMessages((prev) => [...prev, botMessage]);
            
            // Audio only plays when user clicks speak button
            // if (autoSpeak) {
            //   speakText(response.message || response.transcription);
            // }
          } else {
            const errorMessage = {
              id: generateMessageId(),
              type: 'bot',
              text: response.message || 'Sorry, I could not understand your voice message.',
              timestamp: formatTimestamp(),
            };
            setMessages((prev) => [...prev, errorMessage]);
          }
        } catch (error) {
          console.error('Voice send error:', error);
        }
        
        setIsLoading(false);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingCancelled(false);
      startTimeRef.current = Date.now();
      
      if (e.touches) {
        startYRef.current = e.touches[0].clientY;
      } else if (e.clientY) {
        startYRef.current = e.clientY;
      }
      
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingTime(elapsed);
      }, 100);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Microphone access denied. Please allow microphone permissions.');
    }
  };
  
  // Stop voice recording
  const stopRecording = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      setRecordingTime(0);
    }
  };
  
  // Handle touch move for cancel gesture
  const handleTouchMove = (e) => {
    if (!isRecording) return;
    
    let currentY;
    if (e.touches) {
      currentY = e.touches[0].clientY;
    } else if (e.clientY) {
      currentY = e.clientY;
    }
    
    if (startYRef.current && currentY) {
      const diff = startYRef.current - currentY;
      if (diff > 100) {
        setRecordingCancelled(true);
        
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      }
    }
  };
  
  // Format recording time
  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle file upload
  const handleFileUpload = async (file, preview) => {
    setIsFileModalOpen(false);
    
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    
    const displayText = isImage ? '📷 Photo' : 
                        isVideo ? '🎥 Video' : 
                        isAudio ? '🎤 Audio' : `📎 ${file.name}`;
    
    const fileMessage = {
      id: generateMessageId(),
      type: 'user',
      messageType: isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'file',
      text: displayText,
      fileUrl: preview,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      timestamp: formatTimestamp(),
    };

    setMessages((prev) => [...prev, fileMessage]);
    setIsLoading(true);

    try {
      const response = await uploadFile(file);

      if (response.success) {
        const botMessage = {
          id: generateMessageId(),
          type: 'bot',
          text: response.message,
          timestamp: formatTimestamp(),
        };

        setMessages((prev) => [...prev, botMessage]);
        
        // Audio only plays when user clicks speak button
        // if (autoSpeak) {
        //   speakText(response.message);
        // }
      } else {
        const errorMessage = {
          id: generateMessageId(),
          type: 'bot',
          text: response.message || 'Sorry, I could not process your file. Please try again.',
          timestamp: formatTimestamp(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('File upload error:', error);
      const errorMessage = {
        id: generateMessageId(),
        type: 'bot',
        text: 'Sorry, there was an error uploading your file. Please try again.',
        timestamp: formatTimestamp(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Render file content
  const renderFileContent = (msg) => {
    if (msg.messageType === 'image' && msg.fileUrl) {
      return (
        <img 
          src={msg.fileUrl} 
          alt="User upload" 
          className="max-w-[200px] max-h-[200px] rounded-lg cursor-pointer"
          onClick={() => window.open(msg.fileUrl, '_blank')}
        />
      );
    }
    if (msg.messageType === 'video' && msg.fileUrl) {
      return (
        <video 
          src={msg.fileUrl} 
          controls 
          className="max-w-[200px] max-h-[200px] rounded-lg"
        />
      );
    }
    if (msg.messageType === 'voice' && msg.audioUrl) {
      return (
        <div className="flex items-center gap-2 bg-green-100 rounded-full px-3 py-2">
          <button
            onClick={() => toggleAudio(msg.audioUrl)}
            className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center"
          >
            {playingAudio === msg.audioUrl ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>
          <div className="flex-1">
            <div className="h-1 bg-green-300 rounded-full w-20">
              <div className="h-1 bg-green-600 rounded-full w-1/2"></div>
            </div>
          </div>
          <span className="text-xs text-green-800">{msg.duration}s</span>
        </div>
      );
    }
    return <p className="text-body">{msg.text}</p>;
  };

  const handleQuickAction = (action) => {
    const quickMessages = {
      'Market Prices': 'What are the current market prices for maize and beans?',
      'Weather Alert': 'Will it rain this week? Should I apply fertilizer?',
      'Find Pest': 'I found insects eating my maize leaves. What should I do?',
    };

    setInputMessage(quickMessages[action] || action);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="mx-auto min-h-screen w-full max-w-[420px] border-x border-[#e6e6e6] bg-[#f5f5f5] flex flex-col">
        <header className="flex items-center justify-between border-b border-[#d5d5d5] px-3 py-2">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/')} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
              <ArrowLeft className="h-5 w-5 text-[#2f2f2f]" />
            </button>
            <div>
              <div className="text-title text-[#282828]">KilimoChat AI</div>
              <div className="text-title font-semibold text-[#1f8d46]">• Expert Assistant Online</div>
            </div>
          </div>
          <button className="p-1 hover:bg-gray-200 rounded-full transition-colors">
            <MoreVertical className="h-4 w-4 text-[#2f2f2f]" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {/* Date separator */}
          <div className="flex justify-center">
            <span className="rounded-full bg-[#e6e6e6] px-3 py-1 text-small text-[#666]">Today</span>
          </div>

          {/* Farm Status Card */}
          <div className="mt-3 rounded-2xl border border-[#d1d1d1] bg-white p-3">
            <div className="flex items-center gap-2 text-[14px] text-[#6a4e43]">
              <div className="h-8 w-8 rounded-xl bg-[#f3d5c6] flex items-center justify-center">
                <Tractor className="h-4 w-4" />
              </div>
              <div>
                <p className="text-subtitle text-[#3f3f3f]">Current Farm Status</p>
                <p className="text-title font-semibold text-[#2a2a2a]">Maize Field A</p>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-[#f2f2f2] p-2">
                <p className="text-caption text-[#555]">Soil Moisture</p>
                <p className="text-subtitle font-semibold text-[#1f8d46]">68% Optimal</p>
              </div>
              <div className="rounded-xl bg-[#f2f2f2] p-2">
                <p className="text-caption text-[#555]">Next Rain</p>
                <p className="text-subtitle font-semibold text-[#4b4b4b]">2 Days</p>
              </div>
            </div>
          </div>

          {/* Weather Card */}
          <div 
            onClick={handleWeatherClick}
            className="mt-3 rounded-2xl border border-[#b9c7b8] bg-[#f8f8f8] p-3 cursor-pointer hover:bg-[#f0f0f0] transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#f6c9b8] flex items-center justify-center">
                  <SunMedium className="h-4 w-4 text-[#8c7058]" />
                </div>
                <div>
                  <h3 className="text-caption text-[#835a49]">Local Weather</h3>
                  {currentWeather ? (
                    <>
                      <p className="text-body font-semibold text-[#222]">
                        {currentWeather.weather?.temperature?.toFixed(0)}°C • {currentWeather.weather?.description}
                      </p>
                      <p className="text-small text-[#3b3b3b]">
                        {currentWeather.weather?.recommendation?.substring(0, 50)}...
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-body font-semibold text-[#222]">Click for weather</p>
                      <p className="text-small text-[#3b3b3b]">Detecting your location...</p>
                    </>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#666]" />
            </div>
          </div>

          {/* Dynamic Messages */}
          {messages.map((msg) => (
            <div key={msg.id}>
              {msg.type === 'bot' ? (
                <>
                  <div className="mt-3 flex items-start gap-2">
                    <div className="h-8 w-8 rounded-full bg-[#2f8a38] text-white flex items-center justify-center">
                      <Tractor className="h-4 w-4" />
                    </div>
                    <div className="max-w-[305px] rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
                      <p className="text-chat-message text-[#232323]">{msg.text}</p>
                      {/* Audio play button for bot responses - manual trigger only */}
                      <button
                        onClick={() => toggleAudio(msg.text, playingAudio === msg.id, msg.detectedLanguage || 'en', msg.id)}
                        className="mt-2 flex items-center gap-1 text-green-600 hover:text-green-700 transition-colors"
                      >
                        {playingAudio === msg.id ? (
                          <>
                            <Pause className="h-4 w-4" />
                            <span className="text-xs">Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-4 w-4" />
                            <span className="text-xs">
                              {msg.detectedLanguage === 'sw' ? 'Sikiliza' : 'Listen'}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="ml-10 mt-1 text-chat-timestamp text-[#5d5d5d]">{msg.timestamp}</p>
                </>
              ) : (
                <>
                  <div className="mt-3 flex justify-end">
                    <div className="max-w-[305px] rounded-2xl rounded-tr-sm bg-[#2f8a38] px-4 py-3 text-white">
                      {renderFileContent(msg)}
                    </div>
                  </div>
                  <p className="mt-1 text-right text-chat-timestamp text-[#434343]">{msg.timestamp} ✓✓</p>
                </>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="mt-3 flex items-center gap-2 text-[#7b7b7b]">
              <div className="h-7 w-7 rounded-full bg-[#e3e3e3] flex items-center justify-center text-[18px] animate-pulse">
                ◉
              </div>
              <span className="text-title">AI is analyzing...</span>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-[#d2d2d2] bg-[#f6f6f6] px-2 py-3">
          {/* Quick Actions */}
          <div className="mb-2 flex gap-2 overflow-x-auto">
            <button 
              onClick={() => handleQuickAction('Market Prices')}
              className="whitespace-nowrap rounded-full border border-[#afafaf] bg-white px-3 py-1 text-button text-[#454545] hover:bg-gray-100 transition-colors"
            >
              Market Prices
            </button>
            <button 
              onClick={() => handleQuickAction('Weather Alert')}
              className="whitespace-nowrap rounded-full border border-[#afafaf] bg-white px-3 py-1 text-button text-[#454545] hover:bg-gray-100 transition-colors"
            >
              Weather Alert
            </button>
            <button 
              onClick={() => handleQuickAction('Find Pest')}
              className="whitespace-nowrap rounded-full border border-[#afafaf] bg-white px-3 py-1 text-button text-[#454545] hover:bg-gray-100 transition-colors"
            >
              Find Pest
            </button>
          </div>

          {/* Message Input */}
          <div className="flex items-center gap-2">
            {/* File Upload Button */}
            <button 
              onClick={() => setIsFileModalOpen(true)}
              className="h-6 w-6 rounded-full border border-[#7c7c7c] text-[#646464] flex items-center justify-center text-[16px] hover:bg-gray-200 transition-colors"
              disabled={isLoading || isRecording}
            >
              +
            </button>
            
            <div className="flex flex-1 items-center justify-between rounded-full border border-[#9da79c] bg-white px-3 py-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isRecording ? 'Recording voice...' : "Ask about your crops..."}
                className="w-full bg-transparent text-input text-[#6a6a6a] outline-none"
                disabled={isLoading || isRecording}
              />
              <Camera className="h-4 w-4 text-[#6b6b6b] cursor-pointer hover:text-[#117b36] transition-colors" />
            </div>
            
            {/* Send / Voice Record Button */}
            {inputMessage.trim() ? (
              <button 
                onClick={() => handleSendMessage()}
                disabled={isLoading}
                className="h-11 w-11 rounded-full text-white shadow-[0_4px_10px_rgba(0,0,0,0.25)] bg-[#117b36] hover:bg-[#0d662c] flex items-center justify-center transition-all"
              >
                <Send className="h-5 w-5" />
              </button>
            ) : (
              <button 
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                onTouchMove={handleTouchMove}
                className={`h-11 w-11 rounded-full text-white shadow-[0_4px_10px_rgba(0,0,0,0.25)] flex items-center justify-center transition-all select-none ${
                  isRecording 
                    ? 'bg-red-500 animate-pulse scale-110' 
                    : 'bg-[#117b36] hover:bg-[#0d662c]'
                }`}
              >
                <Mic className="h-5 w-5" />
              </button>
            )}
          </div>
          
          {/* Auto-speak toggle */}
          <div className="flex items-center justify-between mt-2 px-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSpeak}
                onChange={(e) => {
                  setAutoSpeak(e.target.checked);
                  if (!e.target.checked) {
                    stopSpeaking();
                  }
                }}
                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
              />
              <span className="text-xs text-gray-500">Auto-speak responses</span>
            </label>
            {isRecording && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-500 font-medium">
                  {formatRecordingTime(recordingTime)}
                </span>
                <span className="text-xs text-gray-500">
                  Release to send
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Voice Recording Overlay */}
      <VoiceRecordingOverlay 
        isRecording={isRecording}
        recordingTime={recordingTime}
        formattedTime={formatRecordingTime(recordingTime)}
        isCancelled={recordingCancelled}
        onCancel={() => {
          setRecordingCancelled(true);
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
          }
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }
        }}
      />
      
      {/* File Upload Modal */}
      <FileUploadModal
        isOpen={isFileModalOpen}
        onClose={() => setIsFileModalOpen(false)}
        onFileSelect={handleFileUpload}
      />
      
      <DockNavigation />
    </div>
  );
};

export default ExpertChatPage;
