import React, { useRef, useState } from 'react';
import { X, Image, Video, Mic, FileText, Upload } from 'lucide-react';

const FileUploadModal = ({ isOpen, onClose, onFileSelect }) => {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (file) => {
    // Validate file type
    const validTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime',
      'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4',
      'application/pdf', 'text/plain'
    ];
    
    if (!validTypes.includes(file.type)) {
      alert('Please select a valid file (image, video, audio, or document)');
      return;
    }
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }
    
    setSelectedFile(file);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      onFileSelect(selectedFile, preview);
      // Reset state
      setSelectedFile(null);
      setPreview(null);
      onClose();
    }
  };

  const handleQuickSelect = (type) => {
    let accept;
    switch (type) {
      case 'image':
        accept = 'image/*';
        break;
      case 'video':
        accept = 'video/*';
        break;
      case 'audio':
        accept = 'audio/*';
        break;
      default:
        accept = '*/*';
    }
    
    fileInputRef.current.accept = accept;
    fileInputRef.current.click();
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return <Image className="h-8 w-8 text-blue-500" />;
    if (type?.startsWith('video/')) return <Video className="h-8 w-8 text-purple-500" />;
    if (type?.startsWith('audio/')) return <Mic className="h-8 w-8 text-green-500" />;
    return <FileText className="h-8 w-8 text-gray-500" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full sm:w-[400px] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Send File</h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        {/* Quick Select Options */}
        {!selectedFile && (
          <div className="p-4">
            <div className="grid grid-cols-4 gap-3 mb-4">
              <button
                onClick={() => handleQuickSelect('image')}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Image className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-xs text-gray-600">Image</span>
              </button>
              
              <button
                onClick={() => handleQuickSelect('video')}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Video className="h-6 w-6 text-purple-600" />
                </div>
                <span className="text-xs text-gray-600">Video</span>
              </button>
              
              <button
                onClick={() => handleQuickSelect('audio')}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Mic className="h-6 w-6 text-green-600" />
                </div>
                <span className="text-xs text-gray-600">Audio</span>
              </button>
              
              <button
                onClick={() => handleQuickSelect('file')}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-gray-600" />
                </div>
                <span className="text-xs text-gray-600">Document</span>
              </button>
            </div>
            
            {/* Drag & Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-1">
                Drag & drop a file here
              </p>
              <p className="text-xs text-gray-400">
                or click to browse (max 10MB)
              </p>
            </div>
          </div>
        )}
        
        {/* Selected File Preview */}
        {selectedFile && (
          <div className="p-4">
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              {preview ? (
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="w-full h-48 object-contain rounded-lg"
                />
              ) : (
                <div className="flex items-center gap-3 py-4">
                  {getFileIcon(selectedFile.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setPreview(null);
                }}
                className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Change
              </button>
              <button
                onClick={handleUpload}
                className="flex-1 py-3 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 transition-colors"
              >
                Send File
              </button>
            </div>
          </div>
        )}
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>
    </div>
  );
};

export default FileUploadModal;
