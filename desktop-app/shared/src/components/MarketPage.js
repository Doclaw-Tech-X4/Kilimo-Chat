import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Mic,
  X,
  TrendingUp,
  TrendingDown,
  MapPin,
  Phone,
  Navigation,
  Play,
  StopCircle,
  AlertTriangle,
  Clock,
  ShoppingBag,
  Sparkles,
  BadgeCheck,
} from 'lucide-react';
import {
  searchMarketCrop,
  getUserLocation,
  playAudio,
  API_BASE_URL,
} from '../services/api';
import { speechRecognitionSupported, createSpeechRecognition, useVoiceRecorder } from '../hooks/useVoiceRecorder';

const POPULAR_CROPS = ['maize', 'beans', 'tomatoes', 'potatoes', 'cabbage', 'onions', 'coffee', 'tea', 'bananas', 'rice'];

const SWAHILI_MARKERS = [
  'bei', 'soko', 'mazao', 'mahindi', 'kuku', 'mboga', 'muhindi', 'ghanja', 'ngoma',
  'agrovet', 'shamba', 'kilimo', 'na', 'ya', 'za', 'kwa', 'ni', 'imeongezeka', 'imepungua',
];

const detectLang = (text = '') => {
  const t = text.toLowerCase();
  if (/[āēīōūñç]/.test(t)) return 'sw';
  const hits = SWAHILI_MARKERS.filter((m) => t.includes(m)).length;
  return hits >= 2 ? 'sw' : 'en';
};

const VOICE_STEPS = [
  'Ask for any crop — e.g. "Maize"',
  'We fetch live prices & verified dealers',
  'Listen and read the market analysis',
];

const MarketPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [userLocation, setUserLocation] = useState({ lat: -1.2921, lon: 36.8219, city: 'Nairobi' });
  const [detectedLanguage, setDetectedLanguage] = useState('en');
  const [error, setError] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcription, setTranscription] = useState('');

  const searchInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const searchQueryRef = useRef('');

  const speakSearchResult = useCallback(
    async (result = searchResult, lang = detectedLanguage) => {
      if (!result) return;
      if (isSpeaking) {
        setIsSpeaking(false);
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        return;
      }
      setIsSpeaking(true);
      const text = `${result.crop_name}: ${result.analysis}`;
      try {
        const res = await import('../services/api').then((m) => m.getTextToSpeech(text, lang === 'sw' ? 'sw' : 'en'));
        if (res.success && res.audio_url) {
          await playAudio(res.audio_url);
          setIsSpeaking(false);
        } else {
          speakBrowser(text, lang === 'sw' ? 'sw-KE' : 'en-US');
        }
      } catch (err) {
        speakBrowser(text, lang === 'sw' ? 'sw-KE' : 'en-US');
      }
    },
    [searchResult, detectedLanguage, isSpeaking]
  );

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
    setIsSpeaking(true);
  };

  const storeRecent = (query, lang) => {
    const list = [{ query, timestamp: new Date().toISOString(), lang }, ...recentSearches]
      .filter((r) => r.query.toLowerCase() !== query.toLowerCase())
      .slice(0, 10);
    setRecentSearches(list);
    localStorage.setItem('kilimoMarketSearches', JSON.stringify(list));
  };

  const handleSearch = useCallback(
    async (query, location, lang) => {
      const q = (query || '').trim().toLowerCase();
      if (!q || isSearching) return;

      setIsSearching(true);
      setError('');
      setSearchResult(null);
      setTranscription('');

      const res = await searchMarketCrop(q, location || userLocation, lang || detectedLanguage);
      setIsSearching(false);

      if (res.success && (res.current_price != null || res.dealers)) {
        setSearchResult(res);
        setDetectedLanguage(detectLang(q));
        storeRecent(q, detectLang(q));
      } else {
        setError(res.message || 'No market data found for that crop. Try another name.');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isSearching, userLocation, detectedLanguage]
  );

  const onSearchSubmit = (e) => {
    e?.preventDefault?.();
    const lang = detectLang(searchQuery);
    handleSearch(searchQuery, userLocation, lang);
  };

  const onPopularClick = (crop) => {
    setSearchQuery(crop);
    handleSearch(crop, userLocation, detectLang(crop));
  };

  // Voice search
  const supportsWebSpeech = speechRecognitionSupported();
  const useWebRecognition = supportsWebSpeech;

  const handleVoiceComplete = useCallback(
    async (blob) => {
      setTranscription('Transcribing voice…');
      setIsSearching(true);
      setIsSpeaking(false);
      const fd = new FormData();
      fd.append('audio', blob, 'search.webm');
      fd.append('user_id', 'web_user');
      try {
        const resp = await fetch(
          `${API_BASE_URL}/api/voice/transcribe`,
          { method: 'POST', body: fd }
        );
        const data = await resp.json();
        setIsSearching(false);
        const text = data.transcription || '';
        setTranscription(text || 'No speech detected. Try again.');
        if (text) {
          setSearchQuery(text);
          const lang = detectLang(text);
          setDetectedLanguage(lang);
          handleSearch(text, userLocation, lang);
        }
      } catch (err) {
        setIsSearching(false);
        setError('Voice search failed. Please type the crop name instead.');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userLocation]
  );

  const { isRecording, formattedTime, startRecording, stopRecording } = useVoiceRecorder(handleVoiceComplete);

  const toggleVoiceSearch = () => {
    if (isRecording) {
      stopRecording();
      return;
    }
    if (useWebRecognition) {
      const rec = createSpeechRecognition();
      if (rec) {
        recognitionRef.current = rec;
        rec.lang = 'en-US';
        rec.continuous = false;
        rec.interimResults = true;
        rec.onstart = () => setIsSpeaking(true);
        rec.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map((r) => r[0].transcript)
            .join(' ');
          setTranscription(transcript);
          if (event.results[event.results.length - 1].isFinal) {
            setSearchQuery(transcript);
            const lang = detectLang(transcript);
            setDetectedLanguage(lang);
            handleSearch(transcript, userLocation, lang);
            rec.stop();
          }
        };
        rec.onerror = () => {
          setIsSpeaking(false);
          setError('Could not start voice search.');
        };
        rec.onend = () => setIsSpeaking(false);
        rec.start();
        setIsSpeaking(true);
      }
    } else {
      // Electron: hold-and-release pattern will not work here; single tap to record
      startRecording();
      setIsSpeaking(true);
    }
  };

  const cancelVoice = () => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setIsSpeaking(false);
    setTranscription('');
  };

  return (
    <div className="space-y-6 kc-fade-in">
      {/* Header + search */}
      <section className="kc-card p-5 md:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-extrabold text-[#1f2937]">
              <ShoppingBag className="h-6 w-6 text-primary" /> Market Prices
            </h1>
            <p className="mt-0.5 text-sm text-[#8a938c]">
              Live prices & verified dealers across Kenya. Speaks EN & SW.
            </p>
          </div>
          <span className="kc-badge bg-[#e6f5e9] text-primary">
            <Sparkles className="h-3 w-3" /> {detectedLanguage === 'sw' ? 'Swahili' : 'English'}
          </span>
        </div>

        <form onSubmit={onSearchSubmit} className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9aa39c]" />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search a crop… e.g. Maize, Beans, Tomatoes"
            className="kc-input !py-3.5 !pl-12 !pr-24 !text-[15px]"
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#8a938c] hover:bg-[#f3f6f3]"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={toggleVoiceSearch}
              title={isRecording ? 'Stop recording' : 'Voice search'}
              className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-[#e6f5e9] text-primary hover:scale-105'
                }`}
            >
              <Mic className="h-4 w-4" />
            </button>
          </div>
        </form>

        {isSpeaking && transcription && (
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-[#e6f5e9] p-2.5 text-xs text-primary kc-fade-in">
            <span className="h-2 w-2 animate-ping rounded-full bg-primary" />
            {transcription}
            <button type="button" onClick={cancelVoice} className="ml-auto hover:text-primary/70">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {isRecording && (
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-red-50 p-2.5 text-xs text-red-600 kc-fade-in">
            <span className="h-2 w-2 animate-ping rounded-full bg-red-500" />
            Recording… {formattedTime} — speak a crop name, then tap mic to stop
          </div>
        )}

        {/* Popular crops */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[#8a938c]">Popular:</span>
          {POPULAR_CROPS.map((crop) => (
            <button
              key={crop}
              type="button"
              onClick={() => onPopularClick(crop)}
              className="rounded-full border border-[#dde5de] bg-white px-3 py-1 text-xs font-semibold text-[#5d6a60] transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
            >
              {crop.charAt(0).toUpperCase() + crop.slice(1)}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 kc-fade-in">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {isSearching && (
        <div className="kc-card grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-xl kc-shimmer" />
          ))}
        </div>
      )}

      {/* Result */}
      {searchResult && !isSearching && (
        <section className="space-y-4 kc-fade-in-up">
          {/* Hero */}
          <div className="kc-card overflow-hidden">
            <div className="flex flex-col gap-4 bg-gradient-to-br from-[#2b8b3a] via-[#16813a] to-[#0f7e39] p-5 text-white md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xl font-extrabold">{searchResult.crop_name}</div>
                <div className="text-sm text-white/80">{searchResult.category}</div>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-4xl font-extrabold">Ksh {searchResult.current_price}</div>
                  <div className="flex items-center gap-1 text-xs text-white/80">
                    {searchResult.price_trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-emerald-200" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-orange-200" />
                    )}
                    {searchResult.price_change}% {searchResult.price_trend}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => speakSearchResult()}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary shadow-lg transition-transform hover:scale-110"
                  title={isSpeaking ? 'Stop' : 'Listen to analysis'}
                >
                  {isSpeaking ? <StopCircle className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                </button>
              </div>
            </div>

            {/* Analysis */}
            <div className="p-5">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#8a938c]">Market analysis</h3>
              <p className="text-sm leading-relaxed text-[#4b554f]">{searchResult.analysis}</p>
            </div>

            {/* Chart */}
            {searchResult.price_history?.length > 0 && (
              <div className="border-t border-[#eef2ef] p-5">
                <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#8a938c]">
                  Price history (Ksh / {searchResult.crop_name})
                </h3>
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-44 w-full overflow-visible">
                  {(() => {
                    const points = searchResult.price_history;
                    const prices = points.map((p) => Number(p.price));
                    const min = Math.min(...prices);
                    const range = Math.max(...prices) - min || 1;
                    const coords = points.map((p, i) => `${points.length === 1 ? 50 : (i / (points.length - 1)) * 96 + 2},${92 - ((Number(p.price) - min) / range) * 78}`).join(' ');
                    return <>
                      <polyline points={coords} fill="none" stroke="#0f7e39" strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                      {points.map((p, i) => <circle key={p.year || i} cx={points.length === 1 ? 50 : (i / (points.length - 1)) * 96 + 2} cy={92 - ((Number(p.price) - min) / range) * 78} r="2.5" fill="white" stroke="#0f7e39" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />)}
                    </>;
                  })()}
                </svg>
                <div className="mt-1 flex justify-between text-[10px] text-[#8a938c]">
                  {searchResult.price_history.map((p, i) => <span key={p.year || i}>{p.year || 'Latest'}</span>)}
                </div>
              </div>
            )}

            {/* Dealers */}
            {searchResult.dealers?.length > 0 && (
              <div className="border-t border-[#eef2ef] p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#8a938c]">
                    Verified dealers near you
                  </h3>
                  <span className="text-[11px] text-[#8a938c]">{searchResult.dealers.length} found</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {searchResult.dealers.map((dealer, i) => (
                    <div key={i} className="rounded-2xl border border-[#e4eae5] p-4 transition-shadow hover:shadow-card">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 text-sm font-bold text-[#1f2937]">
                            {dealer.name}
                            {dealer.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                          </div>
                          <div className="text-xs text-[#8a938c]">{dealer.specialty}</div>
                        </div>
                        {dealer.distance != null && (
                          <span className="kc-badge bg-[#e6f5e9] text-primary whitespace-nowrap">
                            <MapPin className="h-3 w-3" /> {dealer.distance} km
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-[#5d6a60]">
                        <div>{dealer.location} · {dealer.region}</div>
                        <div className="text-[#8a938c]">{dealer.address}</div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        {dealer.phone && (
                          <a
                            href={`tel:${dealer.phone.replace(/\s/g, '')}`}
                            className="kc-btn-outline flex-1 !py-2 text-xs"
                          >
                            <Phone className="h-3.5 w-3.5" /> Call
                          </a>
                        )}
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            `${dealer.address}, ${dealer.location}`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="kc-btn-outline flex-1 !py-2 text-xs"
                        >
                          <Navigation className="h-3.5 w-3.5" /> Directions
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Recent searches */}
      {recentSearches.length > 0 && !searchResult && !isSearching && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-[#1f2937]">Recent searches</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onPopularClick(r.query)}
                className="kc-btn-outline !py-1.5 text-xs"
              >
                {r.query}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default MarketPage;