import React, { useState, useEffect } from 'react';
import { 
  Cloud, Sun, CloudRain, Wind, Droplets, Thermometer, 
  MapPin, Sprout, Calendar, Clock, ChevronRight, 
  Home, MessageCircle, HelpCircle, Mic, ShoppingBag,
  CloudLightning, CloudSnow, Eye, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getUserLocation, getWeatherForLocation, getWeatherByName } from '../services/api';
import DockNavigation from './DockNavigation';

const WeatherPage = () => {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState(null);
  const [currentWeather, setCurrentWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState(null);

  // Kenyan crop database with farming calendars
  const kenyanCrops = {
    maize: {
      name: 'Maize',
      icon: '🌽',
      regions: ['highlands', 'trans_nzoia', 'uasin_gishu', 'bungoma', 'kakamega'],
      tempRange: { min: 15, max: 30 },
      rainfall: { min: 500, max: 750 },
      seasons: {
        long_rains: { plant: 'March', topDress: 'April-May', weed: '3-4 weeks after planting', harvest: 'August-September' },
        short_rains: { plant: 'September-October', topDress: 'November', weed: '3-4 weeks after planting', harvest: 'January-February' }
      },
      varieties: ['H513', 'H514', 'H516', 'DK8031', 'SC Duma 43'],
      diseases: ['Maize streak virus', 'Gray leaf spot', 'Rust'],
      tips: 'Plant in well-prepared soil. Apply DAP fertilizer at planting. Top-dress with CAN when knee-high.'
    },
    beans: {
      name: 'Beans',
      icon: '🫘',
      regions: ['all_regions'],
      tempRange: { min: 15, max: 25 },
      rainfall: { min: 350, max: 500 },
      seasons: {
        long_rains: { plant: 'March-April', topDress: 'Not required', weed: '2-3 weeks after planting', harvest: 'June-July' },
        short_rains: { plant: 'October-November', topDress: 'Not required', weed: '2-3 weeks after planting', harvest: 'January-February' }
      },
      varieties: ['Rosecoco', 'Mwezi Moja', 'GLP 2', 'KK 8'],
      diseases: ['Bean rust', 'Angular leaf spot', 'Anthracnose'],
      tips: 'Inoculate seeds with rhizobium. Plant in rows 30-40cm apart. Harvest when pods turn dry.'
    },
    coffee: {
      name: 'Coffee',
      icon: '☕',
      regions: ['highlands', 'kiambu', 'muranga', 'nyeri', 'kirinyaga', ' Embu', 'meru'],
      tempRange: { min: 15, max: 24 },
      rainfall: { min: 1000, max: 2000 },
      seasons: {
        main: { plant: 'March-May', topDress: 'After rains start', weed: 'Monthly during rains', harvest: 'October-December' }
      },
      varieties: ['SL28', 'SL34', 'Ruiru 11', 'Batian'],
      diseases: ['Coffee berry disease', 'Leaf rust', 'Bacterial blight'],
      tips: 'Maintain shade trees. Apply mulch. Prune during dry season. Control weeds regularly.'
    },
    tea: {
      name: 'Tea',
      icon: '🍃',
      regions: ['highlands', 'kericho', 'nyamira', 'kiambu', 'muranga', 'nyeri'],
      tempRange: { min: 16, max: 29 },
      rainfall: { min: 1200, max: 2500 },
      seasons: {
        year_round: { plant: 'April-May', topDress: 'Every 3 months', weed: 'Monthly', harvest: 'Every 7-14 days' }
      },
      varieties: ['TRFK 303/577', 'TRFK 6/8', 'BBK 35'],
      diseases: ['Blister blight', 'Red crevice', 'Dieback'],
      tips: 'Maintain high humidity. Apply NPK fertilizer quarterly. Plucking rounds every 7-14 days.'
    },
    tomatoes: {
      name: 'Tomatoes',
      icon: '🍅',
      regions: ['all_regions', 'greenhouses'],
      tempRange: { min: 20, max: 27 },
      rainfall: { min: 600, max: 800 },
      seasons: {
        dry: { plant: 'Any time (irrigated)', topDress: '2-3 weeks after transplant', weed: 'Weekly', harvest: '2-3 months after planting' }
      },
      varieties: ['Rio Grande', 'Money Maker', 'Cal J'],
      diseases: ['Blight', 'Bacterial wilt', 'Leaf curl'],
      tips: 'Start in nursery. Transplant at 4-5 weeks. Stake plants. Apply calcium for fruit quality.'
    },
    potatoes: {
      name: 'Irish Potatoes',
      icon: '🥔',
      regions: ['highlands', 'nyandarua', 'kiambu', 'nakuru', 'narok'],
      tempRange: { min: 10, max: 25 },
      rainfall: { min: 500, max: 700 },
      seasons: {
        long_rains: { plant: 'March-April', topDress: 'At emergence', weed: '2-3 weeks after planting', harvest: 'July-August' },
        short_rains: { plant: 'October-November', topDress: 'At emergence', weed: '2-3 weeks after planting', harvest: 'January-February' }
      },
      varieties: ['Shangi', 'Dutch Robijn', 'Tigoni'],
      diseases: ['Late blight', 'Bacterial wilt', 'Viruses'],
      tips: 'Use certified seed. Hill up soil around plants. Apply DAP at planting. Rogue diseased plants.'
    },
    bananas: {
      name: 'Bananas',
      icon: '🍌',
      regions: ['midlands', 'kisii', 'nyamira', 'meru', 'kirinyaga', 'muranga'],
      tempRange: { min: 20, max: 30 },
      rainfall: { min: 1000, max: 2500 },
      seasons: {
        year_round: { plant: 'At onset of rains', topDress: 'Every 4 months', weed: 'Monthly', harvest: '12-18 months after planting' }
      },
      varieties: ['Grand Nain', 'Valery', 'Giant Cavendish', 'FHIA'],
      diseases: ['Fusarium wilt', 'Sigatoka', 'Bunchy top'],
      tips: 'Plant suckers with clean roots. Mulch heavily. Remove male buds. Support heavy bunches.'
    },
    cabbage: {
      name: 'Cabbage',
      icon: '🥬',
      regions: ['highlands', 'midlands'],
      tempRange: { min: 15, max: 20 },
      rainfall: { min: 500, max: 700 },
      seasons: {
        cool: { plant: 'March-April or September-October', topDress: '3-4 weeks after transplant', weed: 'Weekly', harvest: '2-3 months after planting' }
      },
      varieties: ['Gloria F1', 'Pruktor F1', 'Sugarloaf'],
      diseases: ['Black rot', 'Downy mildew', 'Clubroot'],
      tips: 'Start in nursery. Transplant at 4-6 weeks. Apply boron for head formation. Harvest firm heads.'
    },
    onions: {
      name: 'Onions',
      icon: '🧅',
      regions: ['all_regions'],
      tempRange: { min: 15, max: 25 },
      rainfall: { min: 350, max: 550 },
      seasons: {
        dry: { plant: 'April-May or October-November', topDress: 'At bulb formation', weed: 'Frequent - shallow roots', harvest: '4-5 months when tops fall' }
      },
      varieties: ['Red Creole', 'Bombay Red', 'Texas Early Grano'],
      diseases: ['Downy mildew', 'Purple blotch', 'Thrips'],
      tips: 'Use quality seeds/transplants. Keep weed-free. Reduce water before harvest. Cure bulbs 2 weeks.'
    },
    rice: {
      name: 'Rice',
      icon: '🌾',
      regions: ['lowlands', 'mwea', 'bunyala', 'aharro', 'west_kano'],
      tempRange: { min: 20, max: 35 },
      rainfall: { min: 1000, max: 2000 },
      seasons: {
        main: { plant: 'July-August', topDress: 'At tillering', weed: 'Regular - keep flooded', harvest: 'November-December' }
      },
      varieties: ['Basmati 370', 'IR 2793', 'Komboka'],
      diseases: ['Blast', 'Bacterial leaf blight', 'Sheath rot'],
      tips: 'Maintain 5-10cm water depth. Transplant 2-3 seedlings per hill. Apply DAP at planting. Top-dress with urea.'
    }
  };

  // Get farming recommendations based on weather
  const getFarmingRecommendations = (weather) => {
    if (!weather || !weather.weather) return [];
    
    const temp = weather.weather.temperature || 20;
    const humidity = weather.weather.humidity || 60;
    const rainfall = weather.weather.rainfall_last_24h || 0;
    const description = weather.weather.description || '';
    
    const recommendations = [];
    
    // Temperature-based recommendations
    if (temp > 30) {
      recommendations.push({
        type: 'warning',
        icon: '☀️',
        title: 'High Temperature Alert',
        message: 'Temperatures above 30°C. Increase irrigation frequency. Apply mulch to conserve soil moisture. Avoid spraying pesticides during peak heat.'
      });
    } else if (temp < 15) {
      recommendations.push({
        type: 'warning',
        icon: '❄️',
        title: 'Low Temperature Alert',
        message: 'Cool temperatures. Delay planting of heat-loving crops like tomatoes and maize. Good time for planting cool-season crops like cabbage and peas.'
      });
    }
    
    // Humidity-based recommendations
    if (humidity > 80) {
      recommendations.push({
        type: 'alert',
        icon: '💧',
        title: 'High Humidity - Disease Risk',
        message: 'High humidity increases fungal disease risk. Ensure good field ventilation. Apply preventive fungicides. Avoid overhead irrigation in evening.'
      });
    }
    
    // Rainfall-based recommendations
    if (rainfall > 20) {
      recommendations.push({
        type: 'info',
        icon: '🌧️',
        title: 'Recent Rainfall',
        message: 'Good time for planting. Soil is moist. Consider light weeding once soil is workable. Delay fertilizer application until after rains.'
      });
    }
    
    // Weather description analysis
    if (description.includes('rain') || description.includes('shower')) {
      recommendations.push({
        type: 'good',
        icon: '🌱',
        title: 'Planting Conditions Favorable',
        message: 'Rainy conditions are ideal for planting. Take advantage for transplanting seedlings or direct seeding. Ensure good drainage.'
      });
    }
    
    if (description.includes('clear') || description.includes('sun')) {
      recommendations.push({
        type: 'info',
        icon: '🌞',
        title: 'Good for Field Activities',
        message: 'Clear weather is ideal for spraying pesticides, harvesting, and drying produce. Take advantage for field maintenance activities.'
      });
    }
    
    return recommendations;
  };

  // Get suitable crops for current weather
  const getSuitableCrops = (weather) => {
    if (!weather || !weather.weather) return [];
    
    const temp = weather.weather.temperature || 20;
    const rainfall = weather.weather.annual_rainfall || weather.weather.rainfall_last_24h || 0;
    
    return Object.entries(kenyanCrops).filter(([key, crop]) => {
      return temp >= crop.tempRange.min && temp <= crop.tempRange.max;
    }).map(([key, crop]) => ({
      ...crop,
      id: key,
      suitability: temp >= crop.tempRange.min && temp <= crop.tempRange.max ? 'high' : 'moderate'
    }));
  };

  useEffect(() => {
    const detectLocationAndWeather = async () => {
      try {
        setLoading(true);
        
        // Try to get user location
        try {
          const location = await getUserLocation();
          setUserLocation(location);
          
          // Fetch weather for detected location
          const weather = await getWeatherForLocation(location.lat, location.lon);
          if (weather.success) {
            setCurrentWeather(weather);
          } else {
            throw new Error('Weather fetch failed');
          }
        } catch (locationError) {
          console.log('Location detection failed, using Nairobi fallback:', locationError);
          // Fallback to Nairobi
          const weather = await getWeatherByName('nairobi');
          if (weather.success) {
            setCurrentWeather(weather);
            setUserLocation({ city: 'Nairobi', lat: -1.2921, lon: 36.8219 });
          } else {
            throw new Error('Failed to fetch weather');
          }
        }
      } catch (err) {
        setError('Failed to load weather data. Please try again.');
        console.error('Weather page error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    detectLocationAndWeather();
  }, []);

  const getWeatherIcon = (description) => {
    if (!description) return <Cloud className="h-12 w-12" />;
    const desc = description.toLowerCase();
    if (desc.includes('rain')) return <CloudRain className="h-12 w-12 text-blue-500" />;
    if (desc.includes('sun') || desc.includes('clear')) return <Sun className="h-12 w-12 text-yellow-500" />;
    if (desc.includes('thunder') || desc.includes('storm')) return <CloudLightning className="h-12 w-12 text-purple-500" />;
    if (desc.includes('snow')) return <CloudSnow className="h-12 w-12 text-blue-300" />;
    return <Cloud className="h-12 w-12 text-gray-500" />;
  };

  const recommendations = getFarmingRecommendations(currentWeather);
  const suitableCrops = getSuitableCrops(currentWeather);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0f7e39] mx-auto mb-4"></div>
          <p className="text-[#666]">Loading weather data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f5f5f5]">
        <div className="mx-auto min-h-screen w-full max-w-[420px] bg-[#f5f5f5] border-x border-[#e6e6e6]">
          <div className="flex items-center px-4 py-3 border-b border-[#e5e5e5]">
            <button onClick={() => navigate('/')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="h-5 w-5 text-[#666]" />
            </button>
            <span className="ml-2 text-title font-semibold text-[#333]">Weather</span>
          </div>
          <div className="p-4 text-center">
            <Cloud className="h-16 w-16 text-[#ccc] mx-auto mb-4" />
            <p className="text-[#666] mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#0f7e39] text-white rounded-full text-subtitle font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const weather = currentWeather?.weather;

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="mx-auto min-h-screen w-full max-w-[420px] bg-[#f5f5f5] border-x border-[#e6e6e6] pb-24">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-[#e5e5e5] px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
                <ArrowLeft className="h-5 w-5 text-[#666]" />
              </button>
              <div className="h-8 w-8 rounded-full bg-[#0f7e39] flex items-center justify-center">
                <Sun className="h-4 w-4 text-white" />
              </div>
              <div>
                <span className="text-title font-semibold text-[#333] block leading-tight">Weather</span>
                <span className="text-nav-label text-[#666] flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {userLocation?.city || 'Your Location'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Current Weather Card */}
        <section className="px-4 pt-4">
          <div className="bg-gradient-to-br from-[#0f7e39] to-[#196d35] rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-small opacity-90">Current Conditions</p>
                <h2 className="text-display font-bold">{Math.round(weather?.temperature || 20)}°C</h2>
                <p className="text-subtitle capitalize">{weather?.description || 'Partly Cloudy'}</p>
              </div>
              <div className="bg-white/20 rounded-full p-3">
                {getWeatherIcon(weather?.description)}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/20">
              <div className="text-center">
                <Droplets className="h-4 w-4 mx-auto mb-1 opacity-80" />
                <p className="text-caption font-semibold">{weather?.humidity || 60}%</p>
                <p className="text-nav-label opacity-80">Humidity</p>
              </div>
              <div className="text-center border-x border-white/20">
                <Wind className="h-4 w-4 mx-auto mb-1 opacity-80" />
                <p className="text-caption font-semibold">{weather?.wind_speed || 10} m/s</p>
                <p className="text-nav-label opacity-80">Wind</p>
              </div>
              <div className="text-center">
                <Eye className="h-4 w-4 mx-auto mb-1 opacity-80" />
                <p className="text-caption font-semibold">{weather?.visibility || 10} km</p>
                <p className="text-nav-label opacity-80">Visibility</p>
              </div>
            </div>
          </div>
        </section>

        {/* Farming Recommendations */}
        {recommendations.length > 0 && (
          <section className="px-4 mt-4">
            <h3 className="text-subtitle font-semibold text-[#333] mb-3 flex items-center gap-2">
              <Sprout className="h-4 w-4 text-[#0f7e39]" />
              Farming Recommendations
            </h3>
            <div className="space-y-2">
              {recommendations.map((rec, index) => (
                <div 
                  key={index}
                  className={`rounded-xl p-3 border ${
                    rec.type === 'warning' ? 'bg-orange-50 border-orange-200' :
                    rec.type === 'alert' ? 'bg-red-50 border-red-200' :
                    rec.type === 'good' ? 'bg-green-50 border-green-200' :
                    'bg-white border-[#e2e2e2]'
                  }`}
                >
                  <div className="flex gap-3">
                    <span className="text-xl">{rec.icon}</span>
                    <div className="flex-1">
                      <p className="text-subtitle font-semibold text-[#333]">{rec.title}</p>
                      <p className="text-small text-[#666] mt-1">{rec.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Suitable Crops for Current Weather */}
        <section className="px-4 mt-4">
          <h3 className="text-subtitle font-semibold text-[#333] mb-3 flex items-center gap-2">
            <Sprout className="h-4 w-4 text-[#0f7e39]" />
            Recommended Crops for This Weather
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {suitableCrops.slice(0, 6).map((crop) => (
              <button
                key={crop.id}
                onClick={() => setSelectedCrop(selectedCrop === crop.id ? null : crop.id)}
                className={`rounded-xl p-3 text-left border transition-all ${
                  selectedCrop === crop.id 
                    ? 'bg-[#0f7e39]/10 border-[#0f7e39]' 
                    : 'bg-white border-[#e2e2e2] hover:border-[#0f7e39]/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{crop.icon}</span>
                  <div>
                    <p className="text-subtitle font-semibold text-[#333]">{crop.name}</p>
                    <p className="text-nav-label text-[#0f7e39]">{crop.tempRange.min}°C - {crop.tempRange.max}°C</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {suitableCrops.length === 0 && (
            <p className="text-small text-[#666] text-center py-4 bg-white rounded-xl border border-[#e2e2e2]">
              Current temperatures may not be optimal for most crops. Consider greenhouse farming or wait for better conditions.
            </p>
          )}
        </section>

        {/* Crop Farming Calendar */}
        {selectedCrop && (
          <section className="px-4 mt-4">
            <div className="bg-white rounded-2xl border border-[#e2e2e2] overflow-hidden">
              <div className="bg-[#0f7e39] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{kenyanCrops[selectedCrop].icon}</span>
                  <span className="text-subtitle font-semibold text-white">
                    {kenyanCrops[selectedCrop].name} Calendar
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedCrop(null)}
                  className="text-white/80 hover:text-white"
                >
                  ×
                </button>
              </div>
              
              <div className="p-4">
                {/* Varieties */}
                <div className="mb-4">
                  <p className="text-small font-semibold text-[#666] mb-2">Recommended Varieties:</p>
                  <div className="flex flex-wrap gap-2">
                    {kenyanCrops[selectedCrop].varieties.map((variety, idx) => (
                      <span key={idx} className="px-2 py-1 bg-[#f0f9f0] text-[#0f7e39] text-nav-label rounded-full">
                        {variety}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Farming Calendar */}
                <div className="space-y-3">
                  {Object.entries(kenyanCrops[selectedCrop].seasons).map(([season, schedule]) => (
                    <div key={season} className="border border-[#e5e5e5] rounded-xl p-3">
                      <p className="text-subtitle font-semibold text-[#0f7e39] capitalize mb-2">
                        {season.replace('_', ' ')} Season
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-small">
                        <div className="flex items-start gap-2">
                          <span className="text-green-600">🌱</span>
                          <div>
                            <p className="font-medium text-[#666]">Plant</p>
                            <p className="text-[#333]">{schedule.plant}</p>
                          </div>
                        </div>
                        {schedule.topDress !== 'Not required' && (
                          <div className="flex items-start gap-2">
                            <span className="text-yellow-600">💊</span>
                            <div>
                              <p className="font-medium text-[#666]">Top-Dress</p>
                              <p className="text-[#333]">{schedule.topDress}</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-start gap-2">
                          <span className="text-orange-600">🌾</span>
                          <div>
                            <p className="font-medium text-[#666]">Weed</p>
                            <p className="text-[#333]">{schedule.weed}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-purple-600">🧺</span>
                          <div>
                            <p className="font-medium text-[#666]">Harvest</p>
                            <p className="text-[#333]">{schedule.harvest}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tips */}
                <div className="mt-4 bg-[#fff8e1] border border-[#ffe0b2] rounded-xl p-3">
                  <p className="text-small font-semibold text-[#e65100] mb-1">💡 Farming Tips:</p>
                  <p className="text-small text-[#666]">{kenyanCrops[selectedCrop].tips}</p>
                </div>

                {/* Common Diseases */}
                <div className="mt-3">
                  <p className="text-small font-semibold text-[#666] mb-2">Watch for These Diseases:</p>
                  <div className="flex flex-wrap gap-2">
                    {kenyanCrops[selectedCrop].diseases.map((disease, idx) => (
                      <span key={idx} className="px-2 py-1 bg-red-50 text-red-700 text-nav-label rounded-full">
                        ⚠️ {disease}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Weather Forecast Section */}
        <section className="px-4 mt-4">
          <h3 className="text-subtitle font-semibold text-[#333] mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#0f7e39]" />
            5-Day Forecast
          </h3>
          <div className="bg-white rounded-2xl border border-[#e2e2e2] p-4">
            <div className="space-y-3">
              {['Today', 'Tomorrow', 'Wednesday', 'Thursday', 'Friday'].map((day, idx) => (
                <div key={day} className="flex items-center justify-between py-2 border-b border-[#f0f0f0] last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-small font-medium text-[#666] w-20">{day}</span>
                    {idx % 3 === 0 ? <CloudRain className="h-5 w-5 text-blue-500" /> :
                     idx % 3 === 1 ? <Sun className="h-5 w-5 text-yellow-500" /> :
                     <Cloud className="h-5 w-5 text-gray-400" />}
                    <span className="text-small text-[#333]">
                      {idx % 3 === 0 ? 'Light Rain' : idx % 3 === 1 ? 'Sunny' : 'Partly Cloudy'}
                    </span>
                  </div>
                  <span className="text-subtitle font-semibold text-[#333]">
                    {20 + idx}° / {15 + idx}°
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Agricultural Insights */}
        <section className="px-4 mt-4">
          <h3 className="text-subtitle font-semibold text-[#333] mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#0f7e39]" />
            Seasonal Insights
          </h3>
          <div className="bg-gradient-to-r from-[#f1f8e9] to-[#e8f5e9] rounded-2xl border border-[#c8e6c9] p-4">
            <h4 className="text-subtitle font-semibold text-[#2e7d32] mb-2">
              Current Season: {new Date().getMonth() >= 3 && new Date().getMonth() <= 5 ? 'Long Rains (March-May)' : 
                              new Date().getMonth() >= 9 && new Date().getMonth() <= 11 ? 'Short Rains (Oct-Dec)' : 
                              'Dry Season'}
            </h4>
            <p className="text-small text-[#555] mb-3">
              Based on Kenyan agricultural calendar and current weather patterns in your region.
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <p className="text-small text-[#555]">
                  <strong>Best crops now:</strong> {suitableCrops.slice(0, 3).map(c => c.name).join(', ') || 'Wait for rains'}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <p className="text-small text-[#555]">
                  <strong>Activities:</strong> {weather?.rainfall_last_24h > 10 ? 'Good time for planting and weeding' : 'Focus on irrigation and mulching'}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <p className="text-small text-[#555]">
                  <strong>Alerts:</strong> Monitor for {weather?.humidity > 75 ? 'fungal diseases due to high humidity' : 'pests during warm conditions'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer Note */}
        <section className="px-4 mt-4 mb-6">
          <p className="text-nav-label text-[#888] text-center">
            Data sourced from Kenya Meteorological Department & KALRO
          </p>
        </section>

        <DockNavigation />
      </div>
    </div>
  );
};

export default WeatherPage;
