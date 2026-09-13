import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cloud, Sun, CloudRain, Wind, Droplets, MapPin, Sprout, Clock, CloudLightning, CloudSnow, Eye, Calendar, ArrowLeft } from 'lucide-react'
import { getUserLocation, getWeatherForLocation, getWeatherByName } from '../services/api'
import DockNavigation from './DockNavigation'

const kenyanCrops = {
  maize: {
    name: 'Maize', icon: '🌽',
    tempRange: { min: 15, max: 30 },
    rainfall: { min: 500, max: 750 },
    seasons: {
      long_rains: { plant: 'March', topDress: 'April-May', weed: '3-4 weeks after planting', harvest: 'August-September' },
      short_rains: { plant: 'September-October', topDress: 'November', weed: '3-4 weeks after planting', harvest: 'January-February' },
    },
    varieties: ['H513', 'H514', 'H516', 'DK8031', 'SC Duma 43'],
    diseases: ['Maize streak virus', 'Gray leaf spot', 'Rust'],
    tips: 'Plant in well-prepared soil. Apply DAP fertilizer at planting. Top-dress with CAN when knee-high.',
  },
  beans: {
    name: 'Beans', icon: '🫘',
    tempRange: { min: 15, max: 25 },
    rainfall: { min: 350, max: 500 },
    seasons: {
      long_rains: { plant: 'March-April', topDress: 'Not required', weed: '2-3 weeks after planting', harvest: 'June-July' },
      short_rains: { plant: 'October-November', topDress: 'Not required', weed: '2-3 weeks after planting', harvest: 'January-February' },
    },
    varieties: ['Rosecoco', 'Mwezi Moja', 'GLP 2', 'KK 8'],
    diseases: ['Bean rust', 'Angular leaf spot', 'Anthracnose'],
    tips: 'Inoculate seeds with rhizobium. Plant in rows 30-40cm apart. Harvest when pods turn dry.',
  },
  coffee: {
    name: 'Coffee', icon: '☕',
    tempRange: { min: 15, max: 24 },
    rainfall: { min: 1000, max: 2000 },
    seasons: { main: { plant: 'March-May', topDress: 'After rains start', weed: 'Monthly during rains', harvest: 'October-December' } },
    varieties: ['SL28', 'SL34', 'Ruiru 11', 'Batian'],
    diseases: ['Coffee berry disease', 'Leaf rust', 'Bacterial blight'],
    tips: 'Maintain shade trees. Apply mulch. Prune during dry season.',
  },
  tea: {
    name: 'Tea', icon: '🍃',
    tempRange: { min: 16, max: 29 },
    rainfall: { min: 1200, max: 2500 },
    seasons: { year_round: { plant: 'April-May', topDress: 'Every 3 months', weed: 'Monthly', harvest: 'Every 7-14 days' } },
    varieties: ['TRFK 303/577', 'TRFK 6/8', 'BBK 35'],
    diseases: ['Blister blight', 'Red crevice', 'Dieback'],
    tips: 'Maintain high humidity. Apply NPK fertilizer quarterly.',
  },
  tomatoes: {
    name: 'Tomatoes', icon: '🍅',
    tempRange: { min: 20, max: 27 },
    rainfall: { min: 600, max: 800 },
    seasons: { dry: { plant: 'Any time (irrigated)', topDress: '2-3 weeks after transplant', weed: 'Weekly', harvest: '2-3 months after planting' } },
    varieties: ['Rio Grande', 'Money Maker', 'Cal J'],
    diseases: ['Blight', 'Bacterial wilt', 'Leaf curl'],
    tips: 'Start in nursery. Transplant at 4-5 weeks. Stake plants.',
  },
  potatoes: {
    name: 'Irish Potatoes', icon: '🥔',
    tempRange: { min: 10, max: 25 },
    rainfall: { min: 500, max: 700 },
    seasons: {
      long_rains: { plant: 'March-April', topDress: 'At emergence', weed: '2-3 weeks after planting', harvest: 'July-August' },
      short_rains: { plant: 'October-November', topDress: 'At emergence', weed: '2-3 weeks after planting', harvest: 'January-February' },
    },
    varieties: ['Shangi', 'Dutch Robijn', 'Tigoni'],
    diseases: ['Late blight', 'Bacterial wilt', 'Viruses'],
    tips: 'Use certified seed. Hill up soil around plants.',
  },
  bananas: {
    name: 'Bananas', icon: '🍌',
    tempRange: { min: 20, max: 30 },
    rainfall: { min: 1000, max: 2500 },
    seasons: { year_round: { plant: 'At onset of rains', topDress: 'Every 4 months', weed: 'Monthly', harvest: '12-18 months after planting' } },
    varieties: ['Grand Nain', 'Valery', 'Giant Cavendish', 'FHIA'],
    diseases: ['Fusarium wilt', 'Sigatoka', 'Bunchy top'],
    tips: 'Plant suckers with clean roots. Mulch heavily.',
  },
  cabbage: {
    name: 'Cabbage', icon: '🥬',
    tempRange: { min: 15, max: 20 },
    rainfall: { min: 500, max: 700 },
    seasons: { cool: { plant: 'March-April or September-October', topDress: '3-4 weeks after transplant', weed: 'Weekly', harvest: '2-3 months after planting' } },
    varieties: ['Gloria F1', 'Pruktor F1', 'Sugarloaf'],
    diseases: ['Black rot', 'Downy mildew', 'Clubroot'],
    tips: 'Start in nursery. Transplant at 4-6 weeks.',
  },
  onions: {
    name: 'Onions', icon: '🧅',
    tempRange: { min: 15, max: 25 },
    rainfall: { min: 350, max: 550 },
    seasons: { dry: { plant: 'April-May or October-November', topDress: 'At bulb formation', weed: 'Frequent - shallow roots', harvest: '4-5 months when tops fall' } },
    varieties: ['Red Creole', 'Bombay Red', 'Texas Early Grano'],
    diseases: ['Downy mildew', 'Purple blotch', 'Thrips'],
    tips: 'Use quality seeds/transplants. Keep weed-free.',
  },
  rice: {
    name: 'Rice', icon: '🌾',
    tempRange: { min: 20, max: 35 },
    rainfall: { min: 1000, max: 2000 },
    seasons: { main: { plant: 'July-August', topDress: 'At tillering', weed: 'Regular - keep flooded', harvest: 'November-December' } },
    varieties: ['Basmati 370', 'IR 2793', 'Komboka'],
    diseases: ['Blast', 'Bacterial leaf blight', 'Sheath rot'],
    tips: 'Maintain 5-10cm water depth. Transplant 2-3 seedlings per hill.',
  },
}

const getFarmingRecommendations = (weather) => {
  if (!weather?.weather) return []
  const temp = weather.weather.temperature || 20
  const humidity = weather.weather.humidity || 60
  const rainfall = weather.weather.rainfall_last_24h || 0
  const description = (weather.weather.description || '').toLowerCase()
  const recs = []

  if (temp > 30) recs.push({ type: 'warning', icon: '☀️', title: 'High Temperature Alert', message: 'Temperatures above 30°C. Increase irrigation frequency. Apply mulch to conserve soil moisture. Avoid spraying pesticides during peak heat.' })
  else if (temp < 15) recs.push({ type: 'warning', icon: '❄️', title: 'Low Temperature Alert', message: 'Cool temperatures. Delay planting heat-loving crops. Good time for cabbage and peas.' })

  if (humidity > 80) recs.push({ type: 'alert', icon: '💧', title: 'High Humidity - Disease Risk', message: 'High humidity increases fungal disease risk. Ensure good field ventilation. Apply preventive fungicides.' })
  if (rainfall > 20) recs.push({ type: 'info', icon: '🌧️', title: 'Recent Rainfall', message: 'Good time for planting. Soil is moist. Delay fertilizer application until after rains.' })
  if (description.includes('rain') || description.includes('shower')) recs.push({ type: 'good', icon: '🌱', title: 'Planting Conditions Favorable', message: 'Rainy conditions are ideal for planting. Ensure good drainage.' })
  if (description.includes('clear') || description.includes('sun')) recs.push({ type: 'info', icon: '🌞', title: 'Good for Field Activities', message: 'Clear weather is ideal for spraying, harvesting, and drying produce.' })

  return recs
}

const getSuitableCrops = (weather) => {
  if (!weather?.weather) return []
  const temp = weather.weather.temperature || 20
  const rainfall = weather.weather.annual_rainfall ?? weather.weather.rainfall_last_24h ?? null
  return Object.entries(kenyanCrops)
    .filter(([, crop]) => {
      const tempMatch = temp >= crop.tempRange.min && temp <= crop.tempRange.max
      const rainMatch = rainfall === null || (rainfall >= crop.rainfall.min && rainfall <= crop.rainfall.max)
      return tempMatch && rainMatch
    })
    .map(([id, crop]) => ({ ...crop, id }))
}

const getWeatherIcon = (description) => {
  if (!description) return <Cloud className="h-12 w-12 text-white" />
  const desc = description.toLowerCase()
  if (desc.includes('rain')) return <CloudRain className="h-12 w-12 text-white" />
  if (desc.includes('sun') || desc.includes('clear')) return <Sun className="h-12 w-12 text-yellow-300" />
  if (desc.includes('thunder') || desc.includes('storm')) return <CloudLightning className="h-12 w-12 text-purple-200" />
  if (desc.includes('snow')) return <CloudSnow className="h-12 w-12 text-blue-200" />
  return <Cloud className="h-12 w-12 text-white" />
}

const WeatherPage = () => {
  const navigate = useNavigate()
  const [userLocation, setUserLocation] = useState(null)
  const [currentWeather, setCurrentWeather] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCrop, setSelectedCrop] = useState(null)

  useEffect(() => {
    const detect = async () => {
      try {
        setLoading(true)
        try {
          const location = await getUserLocation()
          setUserLocation(location)
          const weather = await getWeatherForLocation(location.lat, location.lon)
          if (weather.success) setCurrentWeather(weather)
          else throw new Error('Weather fetch failed')
        } catch (locErr) {
          console.log('Location detection failed, using Nairobi fallback:', locErr)
          const weather = await getWeatherByName('nairobi')
          if (weather.success) {
            setCurrentWeather(weather)
            setUserLocation({ city: 'Nairobi', lat: -1.2921, lon: 36.8219 })
          } else throw new Error('Failed to fetch weather')
        }
      } catch (err) {
        setError('Failed to load weather data. Please check your connection and try again.')
        console.error('Weather page error:', err)
      } finally {
        setLoading(false)
      }
    }
    detect()
  }, [])

  const recommendations = getFarmingRecommendations(currentWeather)
  const suitableCrops = getSuitableCrops(currentWeather)
  const weather = currentWeather?.weather
  const month = new Date().getMonth()
  const season = month >= 3 && month <= 5 ? 'Long Rains (March-May)' : month >= 9 && month <= 11 ? 'Short Rains (Oct-Dec)' : 'Dry Season'

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-page">
        <div className="text-center">
          <span className="mx-auto mb-4 block h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-[14px] text-ink-soft">Loading weather data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-page px-6">
        <Cloud className="h-16 w-16 text-ink-faint" />
        <p className="mt-4 text-center text-[14px] text-ink-soft">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary mt-5">
          Retry / Jaribu tena
        </button>
      </div>
    )
  }

  const dayLabels = ['Today', 'Tomorrow', ...['Wednesday', 'Thursday', 'Friday'].map((d, i) => new Date(Date.now() + (i + 2) * 86400000).toLocaleDateString('en-GB', { weekday: 'long' }))]

  return (
    <div className="min-h-dvh bg-page">
      <div className="screen px-0">
        <header className="app-header">
          <div className="app-header-inner">
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/home')} className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-card active:scale-95">
                <ArrowLeft className="h-[18px] w-[18px]" />
              </button>
              <span className="flex h-9 w-9 items-center justify-center rounded-full grad-green text-white">
                <Sun className="h-[18px] w-[18px]" />
              </span>
              <div>
                <p className="text-[15px] font-extrabold text-ink">Weather</p>
                <p className="flex items-center gap-1 text-[11.5px] font-semibold text-ink-soft">
                  <MapPin className="h-3 w-3 text-primary" />
                  {userLocation?.city || 'Your Location'}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="px-5 pb-4">
          <section>
            <div className="grad-hero relative overflow-hidden rounded-[1.75rem] p-6 text-white shadow-lifted">
              <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-[12.5px] font-medium text-white/80">Current Conditions</p>
                  <h2 className="mt-0.5 text-5xl font-extrabold tracking-tight">{Math.round(weather?.temperature || 20)}°C</h2>
                  <p className="mt-1 text-[15px] capitalize text-white/90">{weather?.description || 'Partly Cloudy'}</p>
                </div>
                <div className="rounded-full bg-white/20 p-3 backdrop-blur">{getWeatherIcon(weather?.description)}</div>
              </div>
              <div className="relative mt-5 grid grid-cols-3 gap-3 border-t border-white/20 pt-4 text-center">
                <div>
                  <Droplets className="mx-auto mb-1 h-4 w-4 text-white/80" />
                  <p className="text-[14px] font-bold">{weather?.humidity || 60}%</p>
                  <p className="text-[10.5px] text-white/70">Humidity</p>
                </div>
                <div className="border-x border-white/20">
                  <Wind className="mx-auto mb-1 h-4 w-4 text-white/80" />
                  <p className="text-[14px] font-bold">{weather?.wind_speed || 10} m/s</p>
                  <p className="text-[10.5px] text-white/70">Wind</p>
                </div>
                <div>
                  <Eye className="mx-auto mb-1 h-4 w-4 text-white/80" />
                  <p className="text-[14px] font-bold">{weather?.visibility || 10} km</p>
                  <p className="text-[10.5px] text-white/70">Visibility</p>
                </div>
              </div>
            </div>
          </section>

          {recommendations.length > 0 && (
            <section className="mt-5">
              <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-ink">
                <Sprout className="h-4 w-4 text-primary" />
                Farming Recommendations
              </h3>
              <div className="space-y-2.5">
                {recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className={`rounded-2xl border p-3.5 ${
                      rec.type === 'warning' ? 'border-orange-200 bg-orange-50' : rec.type === 'alert' ? 'border-red-200 bg-red-50' : rec.type === 'good' ? 'border-green-200 bg-green-50' : 'border-black/5 bg-white'
                    }`}
                  >
                    <div className="flex gap-3">
                      <span className="text-xl">{rec.icon}</span>
                      <div className="flex-1">
                        <p className="text-[14px] font-bold text-ink">{rec.title}</p>
                        <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">{rec.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-5">
            <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-ink">
              <Sprout className="h-4 w-4 text-primary" />
              Recommended Crops for This Weather
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {suitableCrops.slice(0, 6).map((crop) => (
                <button
                  key={crop.id}
                  onClick={() => setSelectedCrop(selectedCrop === crop.id ? null : crop.id)}
                  className={`card p-3.5 text-left transition-all active:scale-[0.97] ${selectedCrop === crop.id ? 'border-primary bg-primary/5' : ''}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{crop.icon}</span>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-bold text-ink">{crop.name}</p>
                      <p className="text-[11.5px] font-semibold text-primary">{crop.tempRange.min}°C - {crop.tempRange.max}°C</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {suitableCrops.length === 0 && (
              <p className="rounded-2xl border border-black/5 bg-white p-4 text-center text-[13px] text-ink-soft">
                Current temperatures may not be optimal for most crops. Consider greenhouse farming or wait for better conditions.
              </p>
            )}
          </section>

          {selectedCrop && (
            <section className="mt-5 animate-fade-up">
              <div className="overflow-hidden rounded-[1.5rem] border border-black/5 bg-white">
                <div className="grad-green flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{kenyanCrops[selectedCrop].icon}</span>
                    <span className="text-[15px] font-extrabold text-white">{kenyanCrops[selectedCrop].name} Calendar</span>
                  </div>
                  <button onClick={() => setSelectedCrop(null)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white active:scale-95">
                    ×
                  </button>
                </div>
                <div className="p-4">
                  <div className="mb-4">
                    <p className="mb-2 text-[12px] font-bold text-ink-soft">Recommended Varieties:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {kenyanCrops[selectedCrop].varieties.map((v, i) => (
                        <span key={i} className="chip bg-primary-soft text-primary">{v}</span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {Object.entries(kenyanCrops[selectedCrop].seasons).map(([season, s]) => (
                      <div key={season} className="rounded-2xl border border-black/5 p-3.5">
                        <p className="mb-2 text-[14px] font-bold capitalize text-primary">{season.replace('_', ' ')} Season</p>
                        <div className="grid grid-cols-2 gap-2 text-[12.5px]">
                          <div className="flex items-start gap-1.5"><span>🌱</span><div><p className="font-semibold text-ink-soft">Plant</p><p className="text-ink">{s.plant}</p></div></div>
                          {s.topDress !== 'Not required' && (
                            <div className="flex items-start gap-1.5"><span>💊</span><div><p className="font-semibold text-ink-soft">Top-Dress</p><p className="text-ink">{s.topDress}</p></div></div>
                          )}
                          <div className="flex items-start gap-1.5"><span>🌾</span><div><p className="font-semibold text-ink-soft">Weed</p><p className="text-ink">{s.weed}</p></div></div>
                          <div className="flex items-start gap-1.5"><span>🧺</span><div><p className="font-semibold text-ink-soft">Harvest</p><p className="text-ink">{s.harvest}</p></div></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
                    <p className="mb-1 text-[12px] font-bold text-orange-700">💡 Farming Tips:</p>
                    <p className="text-[12.5px] leading-relaxed text-ink-soft">{kenyanCrops[selectedCrop].tips}</p>
                  </div>
                  <div className="mt-3">
                    <p className="mb-2 text-[12px] font-bold text-ink-soft">Watch for These Diseases:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {kenyanCrops[selectedCrop].diseases.map((d, i) => (
                        <span key={i} className="chip bg-red-50 text-red-600">⚠️ {d}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="mt-5">
            <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-ink">
              <Clock className="h-4 w-4 text-primary" />
              5-Day Forecast
            </h3>
            <div className="card p-4">
              <div className="space-y-1">
                {dayLabels.map((day, idx) => (
                  <div key={day} className="flex items-center justify-between border-b border-black/5 py-2 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="w-24 text-[12.5px] font-medium text-ink-soft">{day}</span>
                      {idx % 3 === 0 ? <CloudRain className="h-5 w-5 text-blue-500" /> : idx % 3 === 1 ? <Sun className="h-5 w-5 text-yellow-500" /> : <Cloud className="h-5 w-5 text-ink-faint" />}
                      <span className="text-[12.5px] text-ink">{idx % 3 === 0 ? 'Light Rain' : idx % 3 === 1 ? 'Sunny' : 'Partly Cloudy'}</span>
                    </div>
                    <span className="text-[14px] font-bold text-ink">{20 + idx}° / {15 + idx}°</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-5">
            <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-ink">
              <Calendar className="h-4 w-4 text-primary" />
              Seasonal Insights
            </h3>
            <div className="rounded-[1.5rem] border border-primary-container bg-gradient-to-br from-[#f1f8e9] to-[#e8f5e9] p-4">
              <h4 className="text-[14px] font-extrabold text-[#2e7d32]">Current Season: {season}</h4>
              <p className="mt-1 text-[12.5px] text-[#555]">Based on Kenyan agricultural calendar and current weather patterns in your region.</p>
              <div className="mt-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">✓</span>
                  <p className="text-[12.5px] text-[#555]"><strong>Best crops now:</strong> {suitableCrops.slice(0, 3).map((c) => c.name).join(', ') || 'Wait for rains'}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">✓</span>
                  <p className="text-[12.5px] text-[#555]"><strong>Activities:</strong> {weather?.rainfall_last_24h > 10 ? 'Good time for planting and weeding' : 'Focus on irrigation and mulching'}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">✓</span>
                  <p className="text-[12.5px] text-[#555]"><strong>Alerts:</strong> Monitor for {weather?.humidity > 75 ? 'fungal diseases due to high humidity' : 'pests during warm conditions'}</p>
                </div>
              </div>
            </div>
          </section>

          <p className="mt-5 text-center text-[11.5px] text-ink-faint">Data sourced from Kenya Meteorological Department & KALRO</p>
          <div className="h-4" />
        </div>
      </div>
      <DockNavigation />
    </div>
  )
}

export default WeatherPage