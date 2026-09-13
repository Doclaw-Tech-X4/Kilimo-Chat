import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Sprout, TrendingUp, MapPin, Store, Phone, ChevronRight, Mic, Loader2, X, BarChart3, Navigation, Volume2 } from 'lucide-react'
import DockNavigation from './DockNavigation'
import { searchMarketCrop, getUserLocation, playAudio } from '../services/api'

const PriceChart = ({ data, cropName, language }) => {
  const labels = language === 'sw'
    ? { price: 'Bei (Ksh)', year: 'Mwaka', trend: 'Mwelekeo wa Bei', min: 'Chini', max: 'Juu' }
    : { price: 'Price (Ksh)', year: 'Year', trend: 'Price Trend', min: 'Min', max: 'Max' }

  if (!data || !Array.isArray(data) || data.length === 0) return null
  const valid = data.filter((d) => d && typeof d.price === 'number' && !isNaN(d.price))
  if (valid.length === 0) return null

  const prices = valid.map((d) => d.price)
  const maxPrice = Math.max(...prices)
  const minPrice = Math.min(...prices)
  const range = maxPrice - minPrice || 1

  return (
    <div className="card p-4">
      <h4 className="mb-4 flex items-center gap-2 text-[14px] font-extrabold text-ink">
        <TrendingUp className="h-4 w-4 text-primary" />
        {labels.trend} - {cropName}
      </h4>
      <div className="relative mb-4 h-52">
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`h-0 ${i < 4 ? 'border-b border-dashed border-black/10' : 'border-b border-black/15'}`} />
          ))}
        </div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-[calc(100%-28px)] w-full overflow-visible px-1">
          <defs>
            <linearGradient id="mobilePriceFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#16813a" stopOpacity=".25" />
              <stop offset="1" stopColor="#16813a" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline
            points={valid.map((point, i) => `${valid.length === 1 ? 50 : (i / (valid.length - 1)) * 96 + 2},${92 - ((point.price - minPrice) / range) * 78}`).join(' ')}
            fill="none"
            stroke="#0f7e39"
            strokeWidth="1.8"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {valid.map((point, i) => (
            <circle
              key={i}
              cx={valid.length === 1 ? 50 : (i / (valid.length - 1)) * 96 + 2}
              cy={92 - ((point.price - minPrice) / range) * 78}
              r="2.5"
              fill="white"
              stroke="#0f7e39"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex justify-between px-2">
          {valid.map((point, i) => <span key={i} className="text-[10px] font-semibold text-ink-soft">{point.year}</span>)}
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-black/5 pt-3 text-[12px] text-ink-soft">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-primary" />
            {labels.min}: <strong className="text-ink">Ksh {minPrice.toLocaleString()}</strong>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
            {labels.max}: <strong className="text-ink">Ksh {maxPrice.toLocaleString()}</strong>
          </span>
        </div>
        <span className="text-[11px] text-ink-faint">{valid.length} {language === 'sw' ? 'miaka' : 'years'}</span>
      </div>
    </div>
  )
}

const MarketPage = () => {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResult, setSearchResult] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [detectedLanguage, setDetectedLanguage] = useState('en')
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState(null)
  const [recentSearches, setRecentSearches] = useState([])
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)

  const recognitionRef = useRef(null)
  const searchQueryRef = useRef('')
  const handleSearchRef = useRef(null)

  useEffect(() => {
    const saved = localStorage.getItem('kilimoMarketSearches')
    if (saved) setRecentSearches(JSON.parse(saved))
  }, [])

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const location = await getUserLocation()
        setUserLocation(location)
      } catch {
        console.log('Location access denied, defaulting to Nairobi')
        setUserLocation({ lat: -1.2921, lon: 36.8219, city: 'Nairobi' })
      }
    }
    fetchLocation()
  }, [])

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const rec = new SpeechRecognition()
      rec.continuous = false
      rec.interimResults = true
      rec.onstart = () => setIsListening(true)
      rec.onresult = (e) => {
        const transcript = Array.from(e.results).map((r) => r[0]).map((r) => r.transcript).join('')
        setSearchQuery(transcript)
      }
      rec.onend = () => {
        setIsListening(false)
        if (searchQueryRef.current.trim()) handleSearchRef.current?.()
      }
      rec.onerror = (e) => {
        console.error('Speech recognition error:', e.error)
        setIsListening(false)
      }
      recognitionRef.current = rec
    }
  }, [])

  useEffect(() => {
    searchQueryRef.current = searchQuery
  }, [searchQuery])

  const detectLanguage = useCallback((text) => {
    const swahiliWords = ['bei', 'soko', 'mkulima', 'mboga', 'matunda', 'mahindi', 'mchele', 'samaki', 'nyama', 'nunga', 'nini', 'wapi', 'ngapi', 'karibu', 'asante', 'tafadhali', 'ndege', 'mbegu', 'dawa', 'shamba']
    const lower = text.toLowerCase()
    return swahiliWords.filter((w) => lower.includes(w)).length > 0 ? 'sw' : 'en'
  }, [])

  const playAudioResponse = async (audioUrl) => {
    try {
      setIsPlayingAudio(true)
      await playAudio(audioUrl)
    } catch (err) {
      console.error('Audio playback error:', err)
    } finally {
      setIsPlayingAudio(false)
    }
  }

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    setError(null)
    const lang = detectLanguage(searchQuery)
    setDetectedLanguage(lang)
    try {
      const result = await searchMarketCrop(searchQuery, userLocation, lang)
      setSearchResult(result)
      const newSearch = { query: searchQuery, timestamp: Date.now(), lang }
      const updated = [newSearch, ...recentSearches.slice(0, 9)]
      setRecentSearches(updated)
      localStorage.setItem('kilimoMarketSearches', JSON.stringify(updated))
      if (result.audio_url) playAudioResponse(result.audio_url)
    } catch {
      setError(lang === 'sw' ? 'Samahani, hitilafu ilitokea. Tafadhali jaribu tena.' : 'Sorry, an error occurred. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery, userLocation, recentSearches, detectLanguage])

  useEffect(() => {
    handleSearchRef.current = handleSearch
  }, [handleSearch])

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Voice input is not supported in your browser')
      return
    }
    if (isListening) recognitionRef.current.stop()
    else {
      setSearchQuery('')
      recognitionRef.current.start()
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchResult(null)
    setError(null)
  }

  const labels = detectedLanguage === 'sw' ? {
    title: 'Soko la Kilimo',
    subtitle: 'Tafuta bei za mazao, wauzaji, na mwelekeo wa soko',
    searchPlaceholder: 'Tafuta mazao (mfano: mahindi...)',
    searchButton: 'Tafuta',
    recentSearches: 'Utafutaji wa Hivi Karibuni',
    popularCrops: 'Mazao Maarufu',
    analysis: 'Uchambuzi wa Soko',
    priceHistory: 'Historia ya Bei',
    dealers: 'Wauzaji',
    noResults: 'Hakuna matokeo yaliyopatikana',
    loading: 'Inatafuta...',
  } : {
    title: 'Agricultural Market',
    subtitle: 'Search crop prices, dealers, and market trends',
    searchPlaceholder: 'Search crops (e.g., maize, vegetables...)',
    searchButton: 'Search',
    recentSearches: 'Recent Searches',
    popularCrops: 'Popular Crops',
    analysis: 'Market Analysis',
    priceHistory: 'Price History',
    dealers: 'Dealers',
    noResults: 'No results found',
    loading: 'Searching...',
  }

  const popularCrops = ['Maize', 'Beans', 'Rice', 'Tomatoes', 'Potatoes', 'Onions', 'Bananas', 'Avocado']

  return (
    <div className="min-h-dvh bg-page">
      <div className="screen px-0">
        <header className="app-header">
          <div className="app-header-inner">
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/home')} className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-card active:scale-95">
                <ChevronRight className="h-[18px] w-[18px] rotate-180" />
              </button>
              <span className="flex h-8 w-8 items-center justify-center rounded-full grad-green text-white shadow-lifted">
                <Sprout className="h-4 w-4" />
              </span>
              <span className="text-[15px] font-extrabold text-primary">KilimoChat</span>
            </div>
            <span className="rounded-full bg-primary-soft px-3 py-1 text-[11.5px] font-bold text-primary">
              {detectedLanguage === 'sw' ? 'Kiswahili' : 'English'}
            </span>
          </div>
        </header>

        <div className="px-5 pb-4">
          <section className="mb-5">
            <h1 className="flex items-center gap-2 text-[22px] font-extrabold tracking-tight text-[#196d35]">
              <BarChart3 className="h-6 w-6 text-primary" />
              {labels.title}
            </h1>
            <p className="mt-1 text-[13.5px] text-ink-soft">{labels.subtitle}</p>
          </section>

          <section className="mb-5">
            <div className="relative">
              <div className={`flex items-center gap-2 rounded-2xl border-2 bg-white px-4 py-3 transition-all duration-300 ${isListening ? 'border-primary shadow-lg shadow-primary/20' : 'border-black/5 focus-within:border-primary'}`}>
                <Search className="h-5 w-5 shrink-0 text-ink-faint" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={labels.searchPlaceholder}
                  className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-faint"
                />
                {searchQuery && (
                  <button onClick={clearSearch} className="shrink-0 rounded-full p-1 text-ink-faint active:scale-90">
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={toggleVoiceInput}
                  className={`shrink-0 rounded-xl p-2 transition-all ${isListening ? 'animate-pulse bg-red-500 text-white' : 'bg-black/[0.04] text-ink-soft'}`}
                  aria-label="Voice search"
                >
                  <Mic className="h-4 w-4" />
                </button>
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="shrink-0 rounded-xl bg-primary px-4 py-2 text-[13.5px] font-bold text-white transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : labels.searchButton}
                </button>
              </div>
            </div>
            {isListening && (
              <p className="mt-2 text-center text-[13px] font-semibold text-primary">
                {detectedLanguage === 'sw' ? 'Nasikiliza...' : 'Listening...'}
              </p>
            )}
          </section>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-[13px] text-red-600">{error}</div>
          )}

          {searchResult && (
            <section className="mb-5 space-y-3 animate-fade-up">
              <div className="grad-hero relative overflow-hidden rounded-[1.5rem] p-5 text-white shadow-lifted">
                <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
                <div className="relative flex items-start gap-4">
                  {searchResult.image_url ? (
                    <img src={searchResult.image_url} alt={searchResult.crop_name} className="h-24 w-24 rounded-xl object-cover shadow-lg" />
                  ) : (
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-white/20">
                      <Sprout className="h-12 w-12 text-white" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-xl font-extrabold">{searchResult.crop_name}</h2>
                    <p className="mt-0.5 text-[12.5px] text-white/80">{searchResult.category}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <div>
                        <p className="text-[10.5px] text-white/70">{detectedLanguage === 'sw' ? 'Bei ya Leo' : "Today's Price"}</p>
                        <p className="text-[17px] font-extrabold">Ksh {searchResult.current_price?.toLocaleString()}/kg</p>
                      </div>
                      <span className={`rounded-lg px-2 py-1 text-[11.5px] font-bold ${
                        searchResult.price_trend === 'up' ? 'bg-green-400 text-green-900' : searchResult.price_trend === 'down' ? 'bg-red-400 text-red-900' : 'bg-yellow-400 text-yellow-900'
                      }`}>
                        {searchResult.price_change > 0 ? '+' : ''}{searchResult.price_change}%
                      </span>
                    </div>
                  </div>
                </div>
                {searchResult.audio_url && (
                  <button
                    onClick={() => playAudioResponse(searchResult.audio_url)}
                    disabled={isPlayingAudio}
                    className="relative mt-4 flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 text-[13px] font-semibold backdrop-blur transition-all active:scale-95"
                  >
                    <Volume2 className={`h-4 w-4 ${isPlayingAudio ? 'animate-pulse' : ''}`} />
                    {isPlayingAudio
                      ? detectedLanguage === 'sw' ? 'Inacheza...' : 'Playing...'
                      : detectedLanguage === 'sw' ? 'Sikiliza Majibu' : 'Listen to Response'}
                  </button>
                )}
              </div>

              {searchResult.analysis && (
                <div className="card p-4">
                  <h3 className="mb-2 flex items-center gap-2 text-[14px] font-extrabold text-ink">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    {labels.analysis}
                  </h3>
                  <p className="text-[13px] leading-relaxed text-ink-soft">{searchResult.analysis}</p>
                </div>
              )}

              {searchResult.price_history && Array.isArray(searchResult.price_history) && searchResult.price_history.length > 0 ? (
                <PriceChart data={searchResult.price_history} cropName={searchResult.crop_name} language={detectedLanguage} />
              ) : (
                <div className="card p-4 text-center">
                  <TrendingUp className="mx-auto mb-2 h-8 w-8 text-ink-faint" />
                  <p className="text-[13px] text-ink-faint">{detectedLanguage === 'sw' ? 'Hakuna data ya bei kwa sasa' : 'No price history data available'}</p>
                </div>
              )}

              {searchResult.dealers?.length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-[15px] font-extrabold text-ink">
                    <Store className="h-4 w-4 text-primary" />
                    {labels.dealers}
                    {userLocation && <span className="text-[11.5px] font-normal text-ink-faint">({detectedLanguage === 'sw' ? 'Kulingana na eneo lako' : 'Based on your location'})</span>}
                  </h3>
                  <div className="space-y-2.5">
                    {searchResult.dealers.map((dealer, index) => {
                      const isNearby = index === 0 && dealer.distance && dealer.distance < 50
                      return (
                        <div key={index} className={`card p-4 ${isNearby ? 'border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5' : ''}`}>
                          <div className="flex items-start gap-3">
                            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] ${isNearby ? 'grad-green text-white' : 'bg-black/[0.04] text-ink-soft'}`}>
                              <Store className="h-6 w-6" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="truncate text-[14.5px] font-extrabold text-ink">{dealer.name}</h4>
                                {dealer.verified && <span className="chip bg-primary-soft text-primary">{detectedLanguage === 'sw' ? 'Imeidhinishwa' : 'Verified'}</span>}
                              </div>
                              <p className="mt-0.5 text-[12.5px] text-ink-soft">{dealer.specialty}</p>
                              <div className="mt-1 flex items-center gap-1 text-[11.5px] text-ink-faint">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate">{dealer.location} {dealer.distance && <span className="text-primary">({dealer.distance} km)</span>}</span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <a href={`tel:${dealer.phone}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl grad-green py-2 text-[13px] font-bold text-white active:scale-95">
                              <Phone className="h-4 w-4" />
                              {detectedLanguage === 'sw' ? 'Wasiliana' : 'Contact'}
                            </a>
                            <a
                              href={`https://maps.google.com/?q=${encodeURIComponent(dealer.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-2 text-[13px] font-bold text-ink active:scale-95"
                            >
                              <Navigation className="h-4 w-4" />
                              {detectedLanguage === 'sw' ? 'Mwelekeo' : 'Directions'}
                            </a>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </section>
          )}

          {!searchResult && recentSearches.length > 0 && (
            <section className="mb-5">
              <h3 className="mb-3 text-[15px] font-bold text-ink">{labels.recentSearches}</h3>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSearchQuery(s.query)
                      setDetectedLanguage(s.lang)
                      setTimeout(() => handleSearchRef.current?.(), 50)
                    }}
                    className="chip border border-black/10 bg-white text-ink-soft"
                  >
                    {s.query}
                  </button>
                ))}
              </div>
            </section>
          )}

          {!searchResult && (
            <section>
              <h3 className="mb-3 text-[15px] font-bold text-ink">{labels.popularCrops}</h3>
              <div className="grid grid-cols-2 gap-2.5">
                {popularCrops.map((crop) => (
                  <button
                    key={crop}
                    onClick={() => {
                      setSearchQuery(crop)
                      setTimeout(() => handleSearchRef.current?.(), 50)
                    }}
                    className="card flex items-center gap-2.5 p-3 text-left transition-all active:scale-[0.97]"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft">
                      <Sprout className="h-5 w-5 text-primary" />
                    </span>
                    <span className="text-[13.5px] font-bold text-ink">{crop}</span>
                    <ChevronRight className="ml-auto h-4 w-4 text-ink-faint" />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
      <DockNavigation />
    </div>
  )
}

export default MarketPage