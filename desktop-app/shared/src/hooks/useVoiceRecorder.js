import { useState, useRef, useCallback, useEffect } from 'react';

const STOP_PRECISION = 100;
const MIC_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/mp4;codecs=opus'];

const pickMimeType = () => {
  const supported = MIC_MIME_TYPES.find((mime) => MediaRecorder.isTypeSupported(mime));
  return supported || '';
};

/**
 * WhatsApp-style hold-to-record hook for the desktop app.
 * Records with MediaRecorder and returns the finished audio blob.
 * The blob is later sent to the shared KilimoChat backend
 * (`/api/voice/message` or `/api/voice/transcribe`).
 */
export const useVoiceRecorder = (onRecordingComplete) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isCancelled, setIsCancelled] = useState(false);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const startYRef = useRef(null);
  const cancelledRef = useRef(false);
  const callbackRef = useRef(onRecordingComplete);
  const durationRef = useRef(0);

  useEffect(() => {
    callbackRef.current = onRecordingComplete;
  }, [onRecordingComplete]);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setRecordingTime(0);
  }, []);

  const startRecording = useCallback(async (e) => {
    e?.preventDefault?.();
    if (isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      cancelledRef.current = false;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const type = mimeType.split(';')[0] || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        setAudioBlob(blob);
        if (!cancelledRef.current && blob.size > 0 && callbackRef.current) {
          callbackRef.current(blob, durationRef.current);
        }
        cleanup();
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setIsCancelled(false);
      startTimeRef.current = Date.now();

      if (e?.touches) startYRef.current = e.touches[0].clientY;
      else if (e?.clientY) startYRef.current = e.clientY;

      durationRef.current = 0;
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        durationRef.current = elapsed;
        setRecordingTime(elapsed);
      }, 250);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Microphone access denied. Please allow microphone permissions.');
    }
  }, [isRecording, cleanup]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      cancelledRef.current = false;
      setIsRecording(false);
      setIsCancelled(false);
      try {
        if (mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
      } catch (err) {
        cleanup();
      }
    }
  }, [isRecording, cleanup]);

  const checkCancel = useCallback(
    (e) => {
      if (!isRecording) return;
      let currentY;
      if (e?.touches) currentY = e.touches[0].clientY;
      else if (e?.clientY) currentY = e.clientY;

      if (startYRef.current != null && currentY != null) {
        if (startYRef.current - currentY > STOP_PRECISION) cancelRecording();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isRecording]
  );

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true;
    setIsCancelled(true);
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        cleanup();
      }
    } else {
      cleanup();
    }
  }, [cleanup]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => () => cleanup(), [cleanup]);

  return {
    isRecording,
    recordingTime,
    formattedTime: formatTime(recordingTime),
    audioBlob,
    isCancelled,
    startRecording,
    stopRecording,
    checkCancel,
    cancelRecording,
    recordingProps: {
      onMouseDown: startRecording,
      onMouseUp: stopRecording,
      onMouseLeave: stopRecording,
      onTouchStart: startRecording,
      onTouchEnd: stopRecording,
      onTouchMove: checkCancel,
    },
  };
};

/**
 * Keyboard-friendly speech to text helper used by Record / Market pages.
 *
 * The Electron runtime does not ship Google's Web Speech API, so we expose a
 * graceful fallback: when SpeechRecognition is unavailable we fall back to the
 * native MediaRecorder + the backend Whisper transcription endpoint.
 */
export const speechRecognitionSupported = () =>
  typeof window !== 'undefined' &&
  Boolean(window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition);

export const createSpeechRecognition = () => {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition;
  if (!Ctor) return null;
  try {
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    return recognition;
  } catch (err) {
    console.error('SpeechRecognition init failed', err);
    return null;
  }
};

export default useVoiceRecorder;