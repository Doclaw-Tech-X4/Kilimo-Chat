import { useState, useRef, useCallback } from 'react';

/**
 * WhatsApp-style voice recording hook
 * Features:
 * - Hold to record (onMouseDown/onTouchStart)
 * - Release to send (onMouseUp/onTouchEnd)
 * - Cancel if dragged away
 * - Visual feedback (recording time, waveform)
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

  const startRecording = useCallback(async (e) => {
    e.preventDefault();
    
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Create media recorder
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
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        
        if (!isCancelled && onRecordingComplete) {
          onRecordingComplete(audioBlob, recordingTime);
        }
        
        // Cleanup
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setIsCancelled(false);
      startTimeRef.current = Date.now();
      
      // Store initial Y position for cancel detection
      if (e.touches) {
        startYRef.current = e.touches[0].clientY;
      } else if (e.clientY) {
        startYRef.current = e.clientY;
      }
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Microphone access denied. Please allow microphone permissions.');
    }
  }, [onRecordingComplete, recordingTime, isCancelled]);

  const stopRecording = useCallback((e) => {
    e.preventDefault();
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Reset states
      setRecordingTime(0);
    }
  }, [isRecording]);

  const checkCancel = useCallback((e) => {
    if (!isRecording) return;
    
    // Check if user dragged up (cancel gesture like WhatsApp)
    let currentY;
    if (e.touches) {
      currentY = e.touches[0].clientY;
    } else if (e.clientY) {
      currentY = e.clientY;
    }
    
    if (startYRef.current && currentY) {
      const diff = startYRef.current - currentY;
      if (diff > 100) { // Dragged up more than 100px
        setIsCancelled(true);
        
        // Stop recording without sending
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      }
    }
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    setIsCancelled(true);
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    setRecordingTime(0);
  }, [isRecording]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
    // Event handlers for WhatsApp-style interaction
    recordingProps: {
      onMouseDown: startRecording,
      onMouseUp: stopRecording,
      onMouseLeave: stopRecording,
      onTouchStart: startRecording,
      onTouchEnd: stopRecording,
      onTouchMove: checkCancel,
    }
  };
};

export default useVoiceRecorder;
