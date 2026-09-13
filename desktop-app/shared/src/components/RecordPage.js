import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  Send,
  Trash2,
  Play,
  Pause,
  ArrowRight,
  Repeat,
  Languages,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { sendVoiceMessage, getTextToSpeech } from '../services/api';
import { useVoiceRecorder, speechRecognitionSupported } from '../hooks/useVoiceRecorder';

const RECORD_LIMIT = 45;

const RecordPage = () => {
  const navigate = useNavigate();
  const [transcribedText, setTranscribedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [showResponse, setShowResponse] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [detectedLang, setDetectedLang] = useState('en');
  const [audioUrl, setAudioUrl] = useState(null);
  const [errorText, setErrorText] = useState('');
  const [elapsed, setElapsed] = useState(0);

  const supportsWebSpeech = speechRecognitionSupported();
  const hasSpokenRef = useRef(false);

  const handleVoiceComplete = useCallback(async (blob, duration) => {
    setAudioUrl(URL.createObjectURL(blob));
    setIsProcessing(true);
    setErrorText('');
    setShowResponse(false);

    const res = await sendVoiceMessage(blob, 'web_user');
    setIsProcessing(false);

    if (!res || !res.success) {
      setErrorText(res?.message || 'Failed to process your voice message.');
      return;
    }

    const text = res.transcription || '';
    setTranscribedText(text);
    setDetectedLang(res.detected_language || 'en');
    setAiResponse(res.message || '');
    if (res.audio_response_url) setAudioUrl(res.audio_response_url);
    setShowResponse(true);
    hasSpokenRef.current = false;
  }, [elapsed]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { isRecording, recordingTime, formattedTime, cancelRecording, startRecording, stopRecording } =
    useVoiceRecorder(handleVoiceComplete);

  // Auto-limit the recording length and track elapsed time
  useEffect(() => {
    if (isRecording) {
      setElapsed(0);
      const tick = setInterval(() => setElapsed((v) => v + 1), 1000);
      return () => clearInterval(tick);
    }
    return undefined;
  }, [isRecording]);

  useEffect(() => {
    if (isRecording && recordingTime >= RECORD_LIMIT) stopRecording();
  }, [isRecording, recordingTime, stopRecording]);

  const toggleSpeak = async () => {
    if (!aiResponse) return;
    if (isSpeaking) {
      setIsSpeaking(false);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      return;
    }
    setIsSpeaking(true);
    try {
      const res = await getTextToSpeech(aiResponse, detectedLang === 'sw' ? 'sw' : 'en');
      if (res.success && res.audio_url) {
        const audio = new Audio(res.audio_url);
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => setIsSpeaking(false);
        audio.play();
      } else {
        speakBrowser(aiResponse, detectedLang === 'sw' ? 'sw-KE' : 'en-US');
      }
    } catch (err) {
      speakBrowser(aiResponse, detectedLang === 'sw' ? 'sw-KE' : 'en-US');
    }
  };

  const speakBrowser = (text, lang) => {
    if (!window.speechSynthesis) {
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const reset = () => {
    setTranscribedText('');
    setAiResponse('');
    setShowResponse(false);
    setErrorText('');
    setAudioUrl(null);
    setElapsed(0);
  };

  const continueInChat = () => {
    if (transcribedText) {
      navigate('/chat', { state: { initialMessage: transcribedText } });
    } else {
      navigate('/chat');
    }
  };

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col items-center justify-center gap-6 py-4 kc-fade-in">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold text-[#1f2937] md:text-3xl">
          Sikiliza — Speak to KilimoChat 🎙️
        </h1>
        <p className="mt-1 text-sm text-[#8a938c]">
          Hold a thought, release, and let AI listen — in English or Swahili.
        </p>
        {!supportsWebSpeech && (
          <div className="mx-auto mt-3 inline-flex max-w-md items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            Using the Whisper-powered backend transcription for desktop (recommended).
          </div>
        )}
      </div>

      {/* Mic stage */}
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          {isRecording && (
            <>
              <span className="absolute inset-0 animate-ping rounded-full bg-red-500/30" />
              <span className="absolute -inset-6 animate-ping rounded-full bg-primary/20" style={{ animationDelay: '0.4s' }} />
            </>
          )}
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`flex h-40 w-40 items-center justify-center rounded-full transition-all duration-300 md:h-48 md:w-48 ${
              isRecording
                ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-2xl scale-105'
                : 'bg-gradient-to-br from-primary-light to-primary text-white shadow-soft hover:scale-105'
            } ${isProcessing ? 'cursor-wait opacity-60' : ''}`}
          >
            {isProcessing ? (
              <Sparkles className="h-14 w-14 animate-pulse" />
            ) : (
              <Mic className={`h-16 w-16 md:h-20 md:w-20 ${isRecording ? 'animate-pulse' : ''}`} />
            )}
          </button>
        </div>

        {isRecording && (
          <div className="flex items-center gap-2 rounded-full bg-[#1f2937] px-4 py-2 text-white">
            <span className="h-2 w-2 animate-ping rounded-full bg-red-500" />
            <span className="text-sm font-bold tabular-nums">{formattedTime}</span>
            <span className="text-xs text-[#8a938c]">/ {RECORD_LIMIT}s max</span>
            <button type="button" onClick={cancelRecording} className="ml-2 text-red-400 hover:text-red-300">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}

        {!isRecording && !isProcessing && !showResponse && (
          <p className="text-sm text-[#8a938c]">
            {recordingTime > 0 ? 'Tap mic again to re-record' : 'Tap the mic to start'}
          </p>
        )}
      </div>

      {/* Error */}
      {errorText && (
        <div className="flex w-full max-w-lg items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {errorText}
        </div>
      )}

      {/* Transcription */}
      {transcribedText && (
        <div className="w-full max-w-lg kc-fade-in-up">
          <div className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8a938c]">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Transcription
            <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f5e9] px-2 py-0.5 text-[10px] font-bold text-primary">
              <Languages className="h-3 w-3" /> {detectedLang === 'sw' ? 'Swahili' : 'English'}
            </span>
          </div>
          <div className="kc-card p-4 text-sm text-[#1f2937]">{transcribedText}</div>
        </div>
      )}

      {/* AI response */}
      {showResponse && aiResponse && (
        <div className="w-full max-w-lg kc-fade-in-up">
          <div className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8a938c]">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Response
          </div>
          <div className="rounded-2xl border border-[#e4eae5] bg-gradient-to-br from-white to-[#f6faf7] p-4 text-sm leading-relaxed text-[#1f2937] shadow-card">
            {aiResponse}
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={toggleSpeak} className="kc-btn-outline !py-2 text-xs">
                {isSpeaking ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isSpeaking ? 'Stop' : 'Listen'}
              </button>
              {audioUrl && aiResponse && (
                <audio controls src={audioUrl} className="h-9 w-44 flex-1" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {(showResponse || transcribedText) && (
        <div className="flex flex-wrap justify-center gap-3 kc-fade-in-up">
          <button type="button" onClick={reset} className="kc-btn-outline">
            <Repeat className="h-4 w-4" />
            Record Again
          </button>
          <button type="button" onClick={continueInChat} className="kc-btn-primary">
            Continue in Chat
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default RecordPage;