import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Sprout, 
  TrendingUp, 
  MapPin, 
  Store, 
  Phone, 
  ChevronRight, 
  Mic,
  Loader2,
  X,
  BarChart3,
  Navigation,
  Volume2
} from 'lucide-react';
import DockNavigation from './DockNavigation';
import { 
  searchMarketCrop, 
  getUserLocation, 
  playAudio
} from '../services/api';

// Chart component for price history
const PriceChart = ({ data, cropName, language }) => {
  console.log('PriceChart received data:', data); // Debug logging
  
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.log('No data for chart');
    return null;
  }

  // Ensure all data points have valid prices
  const validData = data.filter(d => d && typeof d.price === 'number' && !isNaN(d.price));
  
  if (validData.length === 0) {
    console.log('No valid price data');
    return null;
  }

  const prices = validData.map(d => d.price);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const range = maxPrice - minPrice || 1;

  const labels = language === 'sw' ? {
    price: 'Bei (Ksh)',
    year: 'Mwaka',
    trend: 'Mwelekeo wa Bei',
    min: 'Chini',
    max: 'Juu'
  } : {
    price: 'Price (Ksh)',
    year: 'Year',
    trend: 'Price Trend',
    min: 'Min',
    max: 'Max'
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-[#e2e2e2] shadow-sm">
      <h4 className="text-sm font-semibold text-[#2d2d2d] mb-4 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-[#0f7e39]" />
        {labels.trend} - {cropName}
      </h4>
      
      {/* Chart Container */}
      <div className="relative h-48 mb-4">
        {/* Y-axis grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          <div className="border-b border-dashed border-[#e2e2e2] h-0" />
          <div className="border-b border-dashed border-[#e2e2e2] h-0" />
          <div className="border-b border-dashed border-[#e2e2e2] h-0" />
          <div className="border-b border-dashed border-[#e2e2e2] h-0" />
          <div className="border-b border-[#e2e2e2] h-0" />
        </div>
        
        {/* Bars */}
        <div className="absolute inset-0 flex items-end justify-around gap-2 px-2">
          {validData.map((point, index) => {
            // Calculate height as percentage (minimum 10% so bar is visible)
            const heightPercent = Math.max(10, ((point.price - minPrice) / range) * 70 + 15);
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                {/* Price tooltip */}
                <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 bg-[#2d2d2d] text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap mb-1 shadow-lg">
                  Ksh {point.price.toLocaleString()}
                </div>
                
                {/* Bar */}
                <div 
                  className="w-full max-w-[40px] bg-gradient-to-t from-[#0f7e39] via-[#22c55e] to-[#86efac] rounded-t-lg shadow-md transition-all duration-500 group-hover:from-[#0c6a2f] group-hover:to-[#4ade80] relative overflow-hidden"
                  style={{ height: `${heightPercent}%`, minHeight: '20px' }}
                >
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12" />
                </div>
                
                {/* Year label */}
                <span className="text-[10px] text-[#666] font-medium bg-[#f5f5f5] px-2 py-0.5 rounded">
                  {point.year}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex justify-between items-center text-xs text-[#666] pt-3 border-t border-[#e2e2e2]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#0f7e39]" />
            {labels.min}: <strong className="text-[#2d2d2d]">Ksh {minPrice.toLocaleString()}</strong>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
            {labels.max}: <strong className="text-[#2d2d2d]">Ksh {maxPrice.toLocaleString()}</strong>
          </span>
        </div>
        <span className="text-[#888]">{validData.length} {language === 'sw' ? 'miaka' : 'years'}</span>
      </div>
    </div>
  );
};

// Dealer card component
const DealerCard = ({ dealer, index, isNearby, language }) => {
  const labels = language === 'sw' ? {
    nearby: 'Karibu Nawe',
    contact: 'Wasiliana',
    directions: 'Mwelekeo',
    verified: 'Imeidhinishwa'
  } : {
    nearby: 'Near You',
    contact: 'Contact',
    directions: 'Directions',
    verified: 'Verified'
  };

  return (
    <div className={`rounded-xl p-4 border transition-all duration-300 hover:shadow-lg ${
      isNearby 
        ? 'bg-gradient-to-br from-[#0f7e39]/10 to-[#16813a]/5 border-[#0f7e39]/30' 
        : 'bg-white border-[#e2e2e2]'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-xl ${
          isNearby ? 'bg-[#0f7e39] text-white' : 'bg-[#f1f1f1] text-[#666]'
        }`}>
          <Store className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-[#2d2d2d]">{dealer.name}</h4>
            {dealer.verified && (
              <span className="text-[10px] bg-[#0f7e39]/10 text-[#0f7e39] px-2 py-0.5 rounded-full">
                {labels.verified}
              </span>
            )}
          </div>
          <p className="text-sm text-[#666] mt-0.5">{dealer.specialty}</p>
          <div className="flex items-center gap-1 mt-1 text-xs text-[#888]">
            <MapPin className="h-3 w-3" />
            <span>{dealer.location}</span>
            {dealer.distance && (
              <span className="text-[#0f7e39] font-medium">({dealer.distance} km)</span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs text-[#888]">
            <Navigation className="h-3 w-3" />
            <span className="truncate">{dealer.address}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <a 
          href={`tel:${dealer.phone}`}
          className="flex-1 flex items-center justify-center gap-1 bg-[#0f7e39] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#0c6a2f] transition-colors"
        >
          <Phone className="h-4 w-4" />
          {labels.contact}
        </a>
        <a 
          href={`https://maps.google.com/?q=${encodeURIComponent(dealer.address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 bg-[#f1f1f1] text-[#2d2d2d] px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#e5e5e5] transition-colors"
        >
          <Navigation className="h-4 w-4" />
          {labels.directions}
        </a>
      </div>
    </div>
  );
};

const MarketPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [detectedLanguage, setDetectedLanguage] = useState('en');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  
  const searchInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const searchQueryRef = useRef('');
  const handleSearchRef = useRef(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('kilimoMarketSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Get user location on mount
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const location = await getUserLocation();
        setUserLocation(location);
      } catch (err) {
        console.log('Location access denied or unavailable');
        // Default to Nairobi coordinates
        setUserLocation({ lat: -1.2921, lon: 36.8219, city: 'Nairobi' });
      }
    };
    fetchLocation();
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onstart = () => setIsListening(true);
      
      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        setSearchQuery(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (searchQueryRef.current.trim()) {
          handleSearchRef.current?.();
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }
  }, []);

  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  // Detect language from text
  const detectLanguage = useCallback((text) => {
    // Simple detection based on common Swahili words and patterns
    const swahiliWords = ['bei', 'soko', 'mkulima', 'mboga', 'matunda', 'mahindi', 'mchele', 'samaki', 'nyama', 'nunga', 
                          'nini', 'wapi', 'ngapi', 'karibu', 'asante', 'tafadhali', 'ndege', 'mbegu', 'dawa', 'shamba'];
    const textLower = text.toLowerCase();
    const swahiliCount = swahiliWords.filter(word => textLower.includes(word)).length;
    
    // Check for Swahili-specific characters
    const hasSwahiliChars = /[āēīōūñç]/.test(textLower);
    
    return (swahiliCount > 0 || hasSwahiliChars) ? 'sw' : 'en';
  }, []);

  // Handle search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);

    // Detect language from query
    const lang = detectLanguage(searchQuery);
    setDetectedLanguage(lang);

    try {
      const result = await searchMarketCrop(searchQuery, userLocation, lang);
      setSearchResult(result);

      // Save to recent searches
      const newSearch = { query: searchQuery, timestamp: Date.now(), lang };
      const updated = [newSearch, ...recentSearches.slice(0, 9)];
      setRecentSearches(updated);
      localStorage.setItem('kilimoMarketSearches', JSON.stringify(updated));

      // Auto-play audio response if available
      if (result.audio_url) {
        playAudioResponse(result.audio_url);
      }
    } catch (err) {
      setError(lang === 'sw' 
        ? 'Samahani, hitilafu ilitokea. Tafadhali jaribu tena.' 
        : 'Sorry, an error occurred. Please try again.'
      );
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, userLocation, recentSearches, detectLanguage]);

  useEffect(() => {
    handleSearchRef.current = handleSearch;
  }, [handleSearch]);

  // Play audio response
  const playAudioResponse = async (audioUrl) => {
    try {
      setIsPlayingAudio(true);
      await playAudio(audioUrl);
    } catch (err) {
      console.error('Audio playback error:', err);
    } finally {
      setIsPlayingAudio(false);
    }
  };

  // Toggle voice input
  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Voice input is not supported in your browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setSearchQuery('');
      recognitionRef.current.start();
    }
  };

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResult(null);
    setError(null);
    searchInputRef.current?.focus();
  };

  // Labels based on language
  const labels = detectedLanguage === 'sw' ? {
    title: 'Soko la Kilimo',
    subtitle: 'Tafuta bei za mazao, wauzaji, na mwelekeo wa soko',
    searchPlaceholder: 'Tafuta mazao (mfano: mahindi, mboga, matunda...)',
    searchButton: 'Tafuta',
    voiceButton: 'Tumia Sauti',
    recentSearches: 'Utafutaji wa Hivi Karibuni',
    popularCrops: 'Mazao maarufu',
    analysis: 'Uchambuzi wa Soko',
    priceHistory: 'Historia ya Bei',
    dealers: 'Wauzaji',
    noResults: 'Hakuna matokeo yaliyopatikana',
    tryAgain: 'Jaribu neno lingine au cheki muundo wa kuhifadhi data',
    loading: 'Inatafuta...',
    error: 'Hitilafu ilitokea'
  } : {
    title: 'Agricultural Market',
    subtitle: 'Search crop prices, dealers, and market trends',
    searchPlaceholder: 'Search crops (e.g., maize, vegetables, fruits...)',
    searchButton: 'Search',
    voiceButton: 'Use Voice',
    recentSearches: 'Recent Searches',
    popularCrops: 'Popular Crops',
    analysis: 'Market Analysis',
    priceHistory: 'Price History',
    dealers: 'Dealers',
    noResults: 'No results found',
    tryAgain: 'Try a different term or check spelling',
    loading: 'Searching...',
    error: 'An error occurred'
  };

  const popularCrops = ['Maize', 'Beans', 'Rice', 'Tomatoes', 'Potatoes', 'Onions', 'Bananas', 'Avocado'];

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="mx-auto min-h-screen w-full max-w-[420px] bg-[#f5f5f5] border-x border-[#e6e6e6] pb-24">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-[#f5f5f5]/95 backdrop-blur-sm px-4 pb-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => navigate('/home')}
                className="h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-sm hover:bg-[#f0f0f0] transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-[#666] rotate-180" />
              </button>
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[#0f7e39] to-[#16813a] flex items-center justify-center shadow-lg">
                <Sprout className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-small font-semibold text-[#0f7e39]">KilimoChat</span>
            </div>
            <div className="flex items-center gap-2">
              {detectedLanguage === 'sw' ? (
                <span className="text-xs bg-[#0f7e39]/10 text-[#0f7e39] px-2 py-1 rounded-full">Kiswahili</span>
              ) : (
                <span className="text-xs bg-[#0f7e39]/10 text-[#0f7e39] px-2 py-1 rounded-full">English</span>
              )}
            </div>
          </div>
        </header>

        <main className="px-4">
          {/* Title Section */}
          <section className="mb-6">
            <h1 className="text-2xl font-bold text-[#196d35] flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              {labels.title}
            </h1>
            <p className="mt-1 text-body text-[#666]">{labels.subtitle}</p>
          </section>

          {/* Search Bar */}
          <section className="mb-6">
            <div className="relative">
              <div className={`flex items-center gap-2 bg-white rounded-2xl border-2 px-4 py-3 transition-all duration-300 ${
                isListening ? 'border-[#0f7e39] shadow-lg shadow-[#0f7e39]/20' : 'border-[#e2e2e2] focus-within:border-[#0f7e39]'
              }`}>
                <Search className="h-5 w-5 text-[#888]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={labels.searchPlaceholder}
                  className="flex-1 bg-transparent outline-none text-[#2d2d2d] placeholder:text-[#999]"
                />
                {searchQuery && (
                  <button onClick={clearSearch} className="p-1 hover:bg-[#f1f1f1] rounded-full transition-colors">
                    <X className="h-4 w-4 text-[#888]" />
                  </button>
                )}
                <button
                  onClick={toggleVoiceInput}
                  className={`p-2 rounded-xl transition-all duration-300 ${
                    isListening 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'bg-[#f1f1f1] text-[#666] hover:bg-[#e5e5e5]'
                  }`}
                  title={labels.voiceButton}
                >
                  <Mic className="h-4 w-4" />
                </button>
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-4 py-2 bg-[#0f7e39] text-white rounded-xl font-medium hover:bg-[#0c6a2f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : labels.searchButton}
                </button>
              </div>
            </div>

            {/* Voice listening indicator */}
            {isListening && (
              <div className="mt-2 text-center">
                <p className="text-sm text-[#0f7e39] animate-pulse">
                  {detectedLanguage === 'sw' ? 'Nasikiliza...' : 'Listening...'}
                </p>
              </div>
            )}
          </section>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Search Results */}
          {searchResult && (
            <section className="mb-6 space-y-4 animate-fade-in">
              {/* Crop Info Card */}
              <div className="bg-gradient-to-br from-[#0f7e39] to-[#16813a] rounded-2xl p-5 text-white shadow-xl">
                <div className="flex items-start gap-4">
                  {searchResult.image_url ? (
                    <img 
                      src={searchResult.image_url} 
                      alt={searchResult.crop_name}
                      className="w-24 h-24 rounded-xl object-cover shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-white/20 flex items-center justify-center">
                      <Sprout className="h-12 w-12 text-white" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h2 className="text-xl font-bold">{searchResult.crop_name}</h2>
                    <p className="text-white/80 text-sm mt-1">{searchResult.category}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <div>
                        <p className="text-xs text-white/70">{detectedLanguage === 'sw' ? 'Bei ya Leo' : 'Today\'s Price'}</p>
                        <p className="text-lg font-bold">Ksh {searchResult.current_price?.toLocaleString()}/kg</p>
                      </div>
                      <div className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        searchResult.price_trend === 'up' ? 'bg-green-400 text-green-900' :
                        searchResult.price_trend === 'down' ? 'bg-red-400 text-red-900' :
                        'bg-yellow-400 text-yellow-900'
                      }`}>
                        {searchResult.price_change > 0 ? '+' : ''}{searchResult.price_change}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audio playback button */}
                {searchResult.audio_url && (
                  <button
                    onClick={() => playAudioResponse(searchResult.audio_url)}
                    disabled={isPlayingAudio}
                    className="mt-4 flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                  >
                    <Volume2 className={`h-4 w-4 ${isPlayingAudio ? 'animate-pulse' : ''}`} />
                    {isPlayingAudio 
                      ? (detectedLanguage === 'sw' ? 'Inacheza...' : 'Playing...')
                      : (detectedLanguage === 'sw' ? 'Sikiliza Majibu' : 'Listen to Response')
                    }
                  </button>
                )}
              </div>

              {/* Market Analysis */}
              {searchResult.analysis && (
                <div className="bg-white rounded-xl p-4 border border-[#e2e2e2]">
                  <h3 className="font-semibold text-[#2d2d2d] mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#0f7e39]" />
                    {labels.analysis}
                  </h3>
                  <p className="text-sm text-[#666] leading-relaxed">{searchResult.analysis}</p>
                </div>
              )}

              {/* Price History Graph */}
              {searchResult.price_history && Array.isArray(searchResult.price_history) && searchResult.price_history.length > 0 ? (
                <div className="animate-fade-in">
                  <PriceChart 
                    data={searchResult.price_history} 
                    cropName={searchResult.crop_name}
                    language={detectedLanguage}
                  />
                </div>
              ) : (
                <div className="bg-white rounded-xl p-4 border border-[#e2e2e2] text-center">
                  <TrendingUp className="h-8 w-8 text-[#ccc] mx-auto mb-2" />
                  <p className="text-sm text-[#888]">
                    {detectedLanguage === 'sw' 
                      ? 'Hakuna data ya bei kwa sasa' 
                      : 'No price history data available'}
                  </p>
                </div>
              )}

              {/* Dealers Section */}
              {searchResult.dealers && searchResult.dealers.length > 0 && (
                <div>
                  <h3 className="font-semibold text-[#2d2d2d] mb-3 flex items-center gap-2">
                    <Store className="h-4 w-4 text-[#0f7e39]" />
                    {labels.dealers}
                    {userLocation && (
                      <span className="text-xs font-normal text-[#888]">
                        ({detectedLanguage === 'sw' ? 'Kulingana na eneo lako' : 'Based on your location'})
                      </span>
                    )}
                  </h3>
                  <div className="space-y-3">
                    {searchResult.dealers.map((dealer, index) => (
                      <DealerCard 
                        key={index}
                        dealer={dealer}
                        index={index}
                        isNearby={index === 0 && dealer.distance && dealer.distance < 50}
                        language={detectedLanguage}
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Recent Searches */}
          {!searchResult && recentSearches.length > 0 && (
            <section className="mb-6">
              <h3 className="text-title font-semibold text-[#3f3f3f] mb-3">{labels.recentSearches}</h3>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSearchQuery(search.query);
                      setDetectedLanguage(search.lang);
                      setTimeout(() => handleSearch(), 100);
                    }}
                    className="px-3 py-2 bg-white border border-[#e2e2e2] rounded-xl text-sm text-[#666] hover:border-[#0f7e39] hover:text-[#0f7e39] transition-colors"
                  >
                    {search.query}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Popular Crops */}
          {!searchResult && (
            <section className="mb-6">
              <h3 className="text-title font-semibold text-[#3f3f3f] mb-3">{labels.popularCrops}</h3>
              <div className="grid grid-cols-2 gap-3">
                {popularCrops.map((crop) => (
                  <button
                    key={crop}
                    onClick={() => {
                      setSearchQuery(crop);
                      setTimeout(() => handleSearch(), 100);
                    }}
                    className="flex items-center gap-2 p-3 bg-white border border-[#e2e2e2] rounded-xl hover:border-[#0f7e39] hover:shadow-md transition-all duration-300 group"
                  >
                    <div className="h-10 w-10 rounded-lg bg-[#c8ffcb] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Sprout className="h-5 w-5 text-[#127a37]" />
                    </div>
                    <span className="text-sm font-medium text-[#2d2d2d]">{crop}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </main>

        <DockNavigation />
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default MarketPage;
