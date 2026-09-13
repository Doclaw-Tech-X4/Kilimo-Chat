import React, { useState, useEffect, useCallback } from 'react';
import {
  UploadCloud,
  FileText,
  FolderKanban,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { API_BASE_URL } from '../services/api';

const SOURCE_TYPES = ['KALRO', 'FAO', 'MINISTRY', 'KEPHIS'];

const AdminDashboard = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ ok: false, text: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [sourceType, setSourceType] = useState('KALRO');
  const [title, setTitle] = useState('');

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/documents`, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();
      if (data.success) setDocuments(data.documents || []);
      else setMessage({ ok: false, text: data.detail || 'Failed to load documents.' });
    } catch (err) {
      setMessage({ ok: false, text: 'Cannot reach the backend for documents.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const upload = async () => {
    if (!selectedFile) {
      setMessage({ ok: false, text: 'Please choose a PDF document first.' });
      return;
    }

    setUploading(true);
    setMessage({ ok: false, text: '' });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('source_type', sourceType);
      formData.append('title', title || selectedFile.name.replace(/\.pdf$/i, ''));
      formData.append('compliance_approved', 'true');

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/admin/documents/upload`, {
        method: 'POST',
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: controller.signal,
      });
      const data = await response.json();

      if (data.success || (response.ok && !data.error)) {
        setMessage({
          ok: true,
          text: `Document processed — ${data.facts_extracted ?? 0} facts extracted.`,
        });
        setSelectedFile(null);
        setTitle('');
        loadDocuments();
      } else {
        setMessage({ ok: false, text: data.error || data.detail || 'Upload failed.' });
      }
    } catch (err) {
      setMessage({
        ok: false,
        text: err.name === 'AbortError' ? 'Upload timed out after 60s.' : 'Upload failed — check backend.',
      });
    } finally {
      clearTimeout(timeout);
      setUploading(false);
    }
  };

  const resetList = async () => {
    await loadDocuments();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 kc-fade-in">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1f2937] via-[#293b2e] to-primary p-6 text-white shadow-soft md:p-8">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-300">
            <ShieldCheck className="h-4 w-4" /> Admin
          </div>
          <h1 className="mt-1 text-2xl font-extrabold md:text-3xl">Document Manager</h1>
          <p className="mt-1 max-w-xl text-sm text-white/80">
            Manage the KALRO / FAO / ministry reference documents that ground KilimoChat&apos;s agricultural advice.
          </p>
        </div>
      </section>

      {/* Upload form */}
      <section className="kc-card p-5 md:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-[#1f2937]">
          <UploadCloud className="h-5 w-5 text-primary" /> Upload a document
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="kc-label">Source type</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SOURCE_TYPES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSourceType(s)}
                  className={`rounded-xl border px-2 py-2 text-xs font-bold transition-all ${
                    sourceType === s
                      ? 'border-primary bg-primary text-white shadow-soft'
                      : 'border-[#dde5de] bg-white text-[#5d6a60] hover:border-primary/40'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="kc-label">Title (optional)</label>
            <input
              className="kc-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Maize Fertilizer Recommendations"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="kc-label">PDF document</label>
          <label className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#d7dfd8] bg-[#fafcfa] p-8 text-center transition-colors hover:border-primary hover:bg-primary/5">
            <FileText className="h-8 w-8 text-primary" />
            <span className="text-sm font-semibold text-[#1f2937]">
              {selectedFile ? selectedFile.name : 'Click to choose a PDF'}
            </span>
            <span className="text-xs text-[#8a938c]">
              {selectedFile
                ? `${(selectedFile.size / 1024).toFixed(1)} KB — click to change`
                : 'KALRO, FAO, ministry or KEPHIS publications (.pdf)'}
            </span>
            <input type="file" accept=".pdf" className="hidden" onChange={handleFile} />
          </label>
        </div>

        {selectedFile && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#f3f6f3] p-3 text-xs text-[#5d6a60] kc-fade-in">
            <FolderKanban className="h-4 w-4 text-primary" />
            {selectedFile.name}
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              className="ml-auto text-red-500 hover:underline"
            >
              Remove
            </button>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={upload} disabled={uploading} className="kc-btn-primary">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {uploading ? 'Uploading & extracting facts…' : 'Upload Document'}
          </button>
          {message.text && (
            <span
              className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                message.ok ? 'text-primary' : 'text-red-600'
              }`}
            >
              {message.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {message.text}
            </span>
          )}
        </div>
      </section>

      {/* Documents list */}
      <section className="kc-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#eef2ef] px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-base font-bold text-[#1f2937]">
            <FolderKanban className="h-5 w-5 text-primary" /> Uploaded documents
            <span className="kc-badge bg-[#e6f5e9] text-primary">{documents.length}</span>
          </h2>
          <button type="button" onClick={resetList} className="kc-btn-ghost !py-1 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 rounded-xl kc-shimmer" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="py-10 text-center">
              <FileText className="mx-auto h-10 w-10 text-[#c2ccc4]" />
              <p className="mt-3 text-sm text-[#8a938c]">No documents uploaded yet.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {documents.map((doc) => (
                <div
                  key={doc.document_id || doc.title}
                  className="flex items-center gap-3 rounded-2xl border border-[#e4eae5] p-3.5 transition-shadow hover:shadow-card"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#e6f5e9]">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-[#1f2937]">
                      {doc.title || 'Untitled document'}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#8a938c]">
                      <span className="kc-badge bg-[#f3f6f3] text-[#5d6a60]">{doc.source_type}</span>
                      <span>{doc.facts_extracted ?? 0} facts extracted</span>
                      <span>· {doc.upload_date ? new Date(doc.upload_date).toLocaleDateString() : 'recently'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;