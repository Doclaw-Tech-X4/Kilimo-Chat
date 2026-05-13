import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Mic, Send, X, ArrowLeft, Volume2, Pause } from 'lucide-react'
import { sendChatMessage } from '../services/api'
import DockNavigation from './DockNavigation'

function RecordPage() {
    const navigate = useNavigate();
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [transcribedText, setTranscribedText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [aiResponse, setAiResponse] = useState('');
    const [showResponse, setShowResponse] = useState(false);
    
    const timerRef = useRef(null);
    const recognitionRef = useRef(null);
    const isRecordingRef = useRef(false);
    const startRecordingRef = useRef(null);
    const isNavigatingRef = useRef(false);
    const hasProcessedRef = useRef(false);

    // State for manual audio playback
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [detectedLang, setDetectedLang] = useState('en');

    // Text-to-Speech function - manual only
    const speakResponse = (text, language = 'en') => {
        if (!window.speechSynthesis) {
            console.error('Speech synthesis not supported');
            return;
        }
        
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language === 'sw' ? 'sw-KE' : 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        
        // Try to find a good voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => 
            v.lang.includes(language === 'sw' ? 'sw' : 'en') && v.name.includes('Google')
        ) || voices.find(v => 
            v.lang.includes(language === 'sw' ? 'sw' : 'en')
        );
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        
        window.speechSynthesis.speak(utterance);
    };

    // Stop speaking
    const stopSpeaking = () => {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        setIsSpeaking(false);
    };

    // Detect language from text (simple heuristic)
    const detectLanguage = (text) => {
        const swahiliWords = ['bei', 'soko', 'mkulima', 'mboga', 'matunda', 'mahindi', 'mchele', 'samaki', 'nyama', 'nunga', 
                              'nini', 'wapi', 'ngapi', 'karibu', 'asante', 'tafadhali', 'ndege', 'mbegu', 'dawa', 'shamba',
                              'habari', 'mambo', 'poa', 'nzuri', 'jambo', 'sijambo', 'hujambo', 'unaendeleaje'];
        const textLower = text.toLowerCase();
        const swahiliCount = swahiliWords.filter(word => textLower.includes(word)).length;
        return swahiliCount > 0 ? 'sw' : 'en';
    };

    // Initialize speech recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'sw-TZ,en-US'; // Support Swahili and English
            
            recognitionRef.current.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    setTranscribedText(prev => prev + ' ' + finalTranscript);
                }
            };
            
            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsRecording(false);
            };
        }
        
        // Auto-start recording when page loads
        setTimeout(() => {
            if (!isRecordingRef.current && !hasProcessedRef.current) {
                startRecordingRef.current?.();
            }
        }, 500);
        
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    useEffect(() => {
        isRecordingRef.current = isRecording;
    }, [isRecording]);

    // Update timer
    useEffect(() => {
        if (isRecording) {
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isRecording]);

    const startRecording = useCallback(() => {
        setIsRecording(true);
        setRecordingTime(0);
        setTranscribedText('');
        setShowResponse(false);
        
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
            } catch (e) {
                console.log('Recognition already started');
            }
        }
    }, []);

    useEffect(() => {
        startRecordingRef.current = startRecording;
    }, [startRecording]);

    const stopRecording = async () => {
        setIsRecording(false);
        
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        
        // If we have transcribed text and not already processed or navigating
        if (transcribedText.trim() && !hasProcessedRef.current && !isNavigatingRef.current) {
            hasProcessedRef.current = true;
            setIsProcessing(true);
            const response = await sendChatMessage(transcribedText.trim());
            setAiResponse(response.message);
            // Store detected language from response
            const lang = response.language || response.detected_language || detectLanguage(transcribedText.trim());
            setDetectedLang(lang);
            setShowResponse(true);
            setIsProcessing(false);
            
            // Audio only plays when user clicks the speak button (removed auto-play)
            // setTimeout(() => {
            //     speakResponse(response.message, lang);
            // }, 500);
        }
    };

    const cancelRecording = () => {
        setIsRecording(false);
        setRecordingTime(0);
        setTranscribedText('');
        setShowResponse(false);
        
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const goToChat = () => {
        isNavigatingRef.current = true;
        // Stop recording without processing
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsRecording(false);
        
        // Navigate to chat with the transcribed text
        navigate('/chat', { state: { initialMessage: transcribedText } });
    };

    return (
        <div className="min-h-dvh min-h-screen bg-gray-50">
            <style
                dangerouslySetInnerHTML={{
                    __html:
                        "\n        .material-symbols-outlined {\n            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;\n        }\n        .wave-bar {\n            transition: height 0.15s ease-in-out;\n        }\n    "
                }}
            />
            {/* App Shell: TopAppBar (Shared Component) */}
            <header className="fixed top-0 w-full z-50 flex items-center justify-between px-5 h-16 bg-white border-b border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/home')} 
                        className="p-2 hover:bg-gray-100 rounded-full transition-all"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center overflow-hidden">
                        <img
                            alt="Farmer Profile"
                            className="w-full h-full object-cover"
                            data-alt="Portrait of a smiling East African farmer wearing a straw hat in a sunlit field, soft focus agricultural background"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuB31XcFdmwX_RVOE9PwHMe0g4KPOg27PZywKZy06Lbyk-MQU8QxZCK8YvdZqMbaCjrVZ-qAaNFfm-5A75pIs-6FGSKRioOwyxufvnX11d0kMUjcQYpiLh8Nq7OOf_lHLvY6MHubQu4I8FYid89KNBl52oudW31XIfbbnOxirL2P6V1GC1ELhkU3v6iTgteX-am27aE4tt7LRbpWis-OWGf3utkA82vnZArvr-27d4hqoi62ddMLh68JqQ4YXW1MYrkh-CjXUaJYkjjL"
                        />
                    </div>
                    <span className="text-body font-bold text-primary">
                        KilimoChat
                    </span>
                </div>
                <button className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-all duration-200 active:scale-95 rounded-full">
                    <span className="material-symbols-outlined" data-icon="help">
                        help
                    </span>
                </button>
            </header>
            {/* Main Content Canvas */}
            <main className="min-h-dvh min-h-screen pt-16 pb-32 flex flex-col items-center justify-start relative overflow-y-auto overflow-x-hidden px-5 py-6">
                {/* Background Artistic Element */}
                <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
                    <img
                        alt="Background texture"
                        className="w-full h-full object-cover"
                        data-alt="Aerial view of terraced green farming fields creating a beautiful organic pattern with soft earthy tones"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuD8ViA6oNoswPFBxrupqPOGJaHXMs7mi3p9FAkqYbc4RDakBqkIAt8JP4C1A0ulG08LXGCmuUwG1oQ0ARUYh8tX_RceobwQPxO79urq2r93CI0biiVN1ZsvoXmJUevkjpVK8Eodlq8ff5iYKVhWE3UO8vi8CH_OQTiqmjsRvJSrS6fqFF9cF1f87tIPtMX2QW9e2TRizJS1KKzgBAalxEB9ZHuQwyYH_9v32uVVm4QIQX2hzr0UbdG-DvGzy5EM5DOh1SeE4tTKtEpJ"
                    />
                </div>
                {/* Voice Recording Overlay Interface */}
                <div className="z-10 w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-2xl flex flex-col items-center border border-white">
                    <div className="text-center mb-6">
                        <h2 className="text-display font-bold text-primary mb-2">
                            {isRecording ? 'Sikiliza... / Listening...' : 'Sema sasa... / Speak now...'}
                        </h2>
                        <p className="text-body text-secondary opacity-80">
                            {isRecording ? 'Recording... / Inarekodi...' : 'Recording starts automatically / Rekodi inaanza kiotomatiki'}
                        </p>
                    </div>
                    
                    {/* Transcribed Text Preview */}
                    {(transcribedText || isRecording) && (
                        <div className="w-full mb-6 p-4 bg-white/50 rounded-xl border border-gray-200">
                            <p className="text-caption text-gray-500 mb-1">Transcribed / Kilichotamkwa:</p>
                            <p className="text-body text-gray-800">{transcribedText || 'Listening...'}</p>
                        </div>
                    )}
                
                {/* AI Response */}
                {showResponse && aiResponse && (
                    <div className="w-full mb-6 p-4 bg-green-50 rounded-xl border border-green-200">
                        <p className="text-caption text-green-600 mb-1 font-semibold">AI Response / Majibu:</p>
                        <p className="text-small text-gray-800 whitespace-pre-line">{aiResponse}</p>
                        
                        {/* Manual Audio Playback Button */}
                        <div className="mt-3 flex gap-2">
                            <button
                                onClick={() => isSpeaking ? stopSpeaking() : speakResponse(aiResponse, detectedLang)}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                {isSpeaking ? (
                                    <>
                                        <Pause className="h-4 w-4" />
                                        <span className="text-sm">Stop</span>
                                    </>
                                ) : (
                                    <>
                                        <Volume2 className="h-4 w-4" />
                                        <span className="text-sm">{detectedLang === 'sw' ? 'Sikiliza' : 'Listen'}</span>
                                    </>
                                )}
                            </button>
                            <button 
                                onClick={goToChat}
                                className="text-button text-green-700 hover:text-green-800 underline px-4 py-2"
                            >
                                Continue in Chat →
                            </button>
                        </div>
                    </div>
                )}
                    
                    {/* Processing Indicator */}
                    {isProcessing && (
                        <div className="mb-6 flex items-center gap-2 text-primary">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                            <span className="text-body">Processing... / Inachakata...</span>
                        </div>
                    )}
                    
                    {/* Central Pulse / Microphone Anchor */}
                    <div className="relative flex items-center justify-center mb-8">
                        {/* Sonar Rings - only show when recording */}
                        {isRecording && (
                            <>
                                <div className="absolute w-48 h-48 bg-primary/10 rounded-full animate-ping" />
                                <div className="absolute w-64 h-64 bg-primary/5 rounded-full animate-pulse" />
                            </>
                        )}
                        {/* Main Mic Button */}
                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`relative w-32 h-32 rounded-full flex items-center justify-center shadow-lg transform transition-all ${
                                isRecording 
                                    ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                                    : 'bg-primary-container hover:scale-105'
                            }`}
                        >
                            {isRecording ? (
                                <Mic className="h-12 w-12 text-white" />
                            ) : (
                                <span
                                    className="material-symbols-outlined !text-5xl"
                                    data-icon="mic"
                                    data-weight="fill"
                                    style={{ fontVariationSettings: '"FILL" 1' }}
                                >
                                    mic
                                </span>
                            )}
                        </button>
                    </div>
                    
                    {/* Real-time Timer */}
                    <div className="mb-6">
                        <span className={`text-display font-bold tracking-wider ${isRecording ? 'text-red-500' : ''}`}>
                            {formatTime(recordingTime)}
                        </span>
                    </div>
                    
                    {/* Visual Waveform - only show when recording */}
                    {isRecording && (
                        <div className="flex items-center justify-center gap-1 h-12 w-full mb-8 overflow-hidden">
                            {[...Array(14)].map((_, i) => (
                                <div 
                                    key={i}
                                    className="wave-bar w-1 bg-primary rounded-full animate-pulse"
                                    style={{ 
                                        height: `${Math.random() * 40 + 10}px`,
                                        animationDelay: `${i * 0.1}s`
                                    }} 
                                />
                            ))}
                        </div>
                    )}
                    
                    {/* Action Controls */}
                    <div className="grid grid-cols-2 gap-4 w-full">
                        <button 
                            type="button" 
                            onClick={cancelRecording}
                            className="font-button-text flex items-center justify-center gap-2 h-14 rounded-xl text-button text-secondary border-2 border-secondary/20 hover:bg-secondary/5 transition-all active:scale-95"
                        >
                            <X className="h-5 w-5" />
                            <span>Cancel</span>
                        </button>
                        <button 
                            type="button" 
                            onClick={isRecording ? stopRecording : goToChat}
                            disabled={!isRecording && !transcribedText}
                            className={`font-button-text flex items-center justify-center gap-2 h-14 rounded-xl text-button shadow-md transition-all active:scale-95 ${
                                isRecording || transcribedText
                                    ? 'bg-primary text-white hover:bg-primary/90'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            {isRecording ? (
                                <>
                                    <Send className="h-5 w-5" />
                                    <span>Stop &amp; Send</span>
                                </>
                            ) : (
                                <>
                                    <MessageCircle className="h-5 w-5" />
                                    <span>Go to Chat</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
                {/* Quick Tips for Farmers */}
                <div className="z-10 mt-8 w-full max-w-md">
                    <div className="bg-[#e8e8e8]/50 p-5 rounded-2xl border border-secondary/20">
                        <div className="flex items-start gap-3">
                            <span
                                className="material-symbols-outlined text-secondary"
                                data-icon="lightbulb"
                            >
                                lightbulb
                            </span>
                            <div>
                                <p className="text-caption font-medium text-on-secondary-fixed">
                                    Tip: Ask about pests, soil, or market prices
                                </p>
                                <p className="text-xs text-secondary/70 mt-1">
                                    Uliza kuhusu wadudu, udongo, au bei za soko
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            
            <DockNavigation />
        </div>
    );
};

export default RecordPage;