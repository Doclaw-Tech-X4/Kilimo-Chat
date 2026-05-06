import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../services/api';
import '../styles/AdminDashboard.css';

const AdminDashboard = () => {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [sourceType, setSourceType] = useState('KALRO');

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/documents`);
      const data = await response.json();
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setMessage('Please select a file');
      return;
    }

    setUploading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('source_type', sourceType);
    formData.append('title', selectedFile.name);
    formData.append('compliance_approved', 'true');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      
      const response = await fetch(`${API_BASE_URL}/api/admin/documents/upload`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      const data = await response.json();

      if (data.success) {
        setMessage(`✅ Uploaded! Extracted ${data.facts_extracted} facts`);
        fetchDocuments();
        setSelectedFile(null);
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage('❌ Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="admin-dashboard">
      <h2>📚 Document Management</h2>
      
      <div className="upload-section">
        <h3>Upload KALRO/FAO/Ministry PDF</h3>
        <form onSubmit={handleUpload}>
          <select value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
            <option value="KALRO">KALRO</option>
            <option value="FAO">FAO</option>
            <option value="MINISTRY">Ministry of Agriculture</option>
            <option value="KEPHIS">KEPHIS</option>
          </select>
          
          <input type="file" accept=".pdf" onChange={handleFileChange} />
          
          <button type="submit" disabled={uploading || !selectedFile}>
            {uploading ? 'Uploading...' : 'Upload PDF'}
          </button>
        </form>
        
        {message && <p className="message">{message}</p>}
      </div>

      <div className="documents-list">
        <h3>Uploaded Documents ({documents.length})</h3>
        {documents.map((doc) => (
          <div key={doc.document_id} className="document-card">
            <h4>{doc.title}</h4>
            <p>Source: {doc.source_type}</p>
            <p>Facts: {doc.facts_extracted}</p>
            <p>Date: {new Date(doc.upload_date).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
