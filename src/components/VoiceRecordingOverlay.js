import React from 'react';
import { Mic, Trash2, Lock } from 'lucide-react';

const VoiceRecordingOverlay = ({ 
  isRecording, 
  recordingTime, 
  formattedTime,
  isCancelled,
  onCancel 
}) => {
  if (!isRecording) return null;

  // Generate waveform bars
  const bars = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    height: Math.random() * 60 + 20,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
      {/* Semi-transparent backdrop */}
      <div className="absolute inset-0 bg-black/60 pointer-events-auto" />
      
      {/* Recording UI */}
      <div className="relative w-full max-w-md mx-auto mb-4 px-4 pointer-events-auto">
        <div className="bg-[#1a1a1a] rounded-2xl p-6 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-3 h-3 rounded-full ${isCancelled ? 'bg-red-500' : 'bg-red-500 animate-pulse'}`} />
                <div className="absolute inset-0 w-3 h-3 rounded-full bg-red-500 animate-ping" />
              </div>
              <span className="text-white text-lg font-medium">
                {isCancelled ? 'Recording cancelled' : formattedTime}
              </span>
            </div>
            
            <button
              onClick={onCancel}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <Trash2 className="h-5 w-5 text-red-400" />
            </button>
          </div>
          
          {/* Waveform */}
          {!isCancelled && (
            <div className="flex items-center justify-center gap-1 h-16 mb-6">
              {bars.map((bar) => (
                <div
                  key={bar.id}
                  className="w-1 bg-green-500 rounded-full animate-pulse"
                  style={{
                    height: `${bar.height}%`,
                    animationDelay: `${bar.id * 0.05}s`,
                    animationDuration: '0.5s',
                  }}
                />
              ))}
            </div>
          )}
          
          {/* Instructions */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Mic className="h-5 w-5 text-green-500" />
              <span className="text-white/80 text-sm">
                Release to send, drag up to cancel
              </span>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-white/50 text-xs">
              <Lock className="h-3 w-3" />
              <span>Recording is secure and encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceRecordingOverlay;
