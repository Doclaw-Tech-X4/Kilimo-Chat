import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Sun,
  Cloud,
  CloudRain,
  CloudSun,
  Wind,
  Droplets,
  Eye,
  ChevronDown,
  CalendarDays,
  Sprout,
  RefreshCw,
  AlertTriangle,
  ThermometerSun,
} from 'lucide-react';
import { getUserLocation, getWeatherForLocation, getWeatherByName } from '../services/api';

const KENYAN_CROPS = {
  maize: {
    name: 'Maize',
    icon: '🌽',
    tempRange: [18, 30],
    rainfall: [500, 1500],
    varieties: ['H6210', 'Duma 43', 'SC 649'],
    seasons: {
      long: { plant: 'March–April', topDress: 'May–June', weed: 'April–June', harvest: 'August–September' },
      short: { plant: 'October–November', topDress: 'December', weed: 'November', harvest: 'February–March' },
    },
    diseases: ['Fall armyworm', 'Maize lethal necrosis', 'Gray leaf spot'],
    tips: ['Plant certified seeds', 'Apply fertilizers in splits', 'Monitor for stalkborer weekly'],
  },
  beans: {
    name: 'Beans',
    icon: '🫘',
    tempRange: [16, 27],
    rainfall: [800, 1800],
    varieties: ['KK8', 'Rosecoco', 'Mwitemania'],
    seasons: {
      long: { plant: 'March', topDress: 'April', weed: 'April', harvest: 'June–July' },
      short: { plant: 'October', topDress: 'November', weed: 'November', harvest: 'January' },
    },
    diseases: ['Angular leaf spot', 'Bean rust', 'Root rot'],
    tips: ['Use certified seed', 'Rotate with cereals', 'Control aphids early'],
  },
  tomatoes: {
    name: 'Tomatoes',
    icon: '🍅',
    tempRange: [18, 28],
    rainfall: [600, 1300],
    varieties: ['Money Maker', 'Anna F1', 'Rio Grande'],
    seasons: { all: { plant: 'Any season with irrigation', topDress: '3 weeks after planting', weed: 'Weekly', harvest: '10–12 weeks' } },
    diseases: ['Early blight', 'Late blight', 'Bacterial wilt', 'Tuta absoluta'],
    tips: ['Stake plants early', 'Mulch to conserve water', 'Remove infected leaves'],
  },
  potatoes: {
    name: 'Irish Potatoes',
    icon: '🥔',
    tempRange: [12, 22],
    rainfall: [800, 1400],
    varieties: ['Shangi', 'Tigoni', 'Kenya Mpya'],
    seasons: { all: { plant: 'Early rains', topDress: '5-6 weeks', weed: 'Hilling at 3 weeks', harvest: '3-4 months' } },
    diseases: ['Late blight', 'Bacterial wilt', 'Potato cyst nematode'],
    tips: ['Use certified clean seed', 'Hill soil around plants', 'Northern Rift is ideal'],
  },
  cabbage: {
    name: 'Cabbage',
    icon: '🥬',
    tempRange: [15, 26],
    rainfall: [700, 1500],
    varieties: ['Copenhagen Market', 'Gloria F1'],
    seasons: { all: { plant: 'Nursery then transplant', topDress: '2-3 weeks after transplant', weed: 'Weekly', harvest: '3-4 months' } },
    diseases: ['Black rot', 'Downey mildew', 'Diamondback moth'],
    tips: ['Transplant in evening', 'Control cabbage webworm', 'Rotate with cereals'],
  },
  onions: {
    name: 'Onions',
    icon: '🧅',
    tempRange: [13, 26],
    rainfall: [500, 1000],
    varieties: ['Red Creole', 'Texas Grano', 'Bombay Red'],
    seasons: { all: { plant: 'Nursery 8 weeks', topDress: '4-6 weeks', weed: 'Keep clean', harvest: '4-5 months' } },
    diseases: ['Purple blotch', 'Downy mildew', 'Thrips'],
    tips: ['Well-drained soils', 'Reduce water towards maturity', 'Harvest when tops fall'],
  },
  rice: {
    name: 'Rice (Paddy)',
    icon: '🍚',
    tempRange: [20, 34],
    rainfall: [1000, 2000],
    varieties: ['Basmati 370', 'IR 2793', 'Sindano'],
    seasons: { all: { plant: 'With irrigation', topDress: 'Tillering stage', weed: 'In rice paddies', harvest: '4-5 months' } },
    diseases: ['Rice blast', 'Sheath blight', 'Stem borers'],
    tips: ['Level your paddy', 'Maintain 5-10cm water', 'Mwea is the main zone'],
  },
  coffee: {
    name: 'Coffee',
    icon: '☕',
    tempRange: [15, 25],
    rainfall: [1200, 2000],
    varieties: ['SL 28', 'Ruiru 11', 'K7'],
    seasons: { all: { plant: 'Long rains', topDress: 'After main rains', weed: 'Mulch & weed', harvest: 'October–December' } },
    diseases: ['Coffee berry disease', 'Leaf rust', 'Antestia bug'],
    tips: ['Shade management', 'Prune after harvest', 'Harvest ripe cherries only'],
  },
  tea: {
    name: 'Tea',
    icon: '🍵',
    tempRange: [13, 23],
    rainfall: [1300, 2500],
    varieties: ['Clone TRFK 31/8', 'Clone TRFK 41', 'AHP SC 12/28'],
    seasons: { all: { plant: 'Long rains', topDress: 'Split through year', weed: 'Regular weeding', harvest: 'All year (plucking)' } },
    diseases: ['Blister blight', 'Root rot', 'Red spider mite'],
    tips: ['Keep plucking table even', 'Mulch heavily', 'Central Highlands ideal'],
  },
  bananas: {
    name: 'Bananas',
    icon: '🍌',
    tempRange: [24, 32],
    rainfall: [1200, 2200],
    varieties: ['Giant Cavendish', 'Apple banana', 'Uganda Green'],
    seasons: { all: { plant: 'Any time with water', topDress: 'Every 3 months', weed: 'Mulch heavily', harvest: '9-12 months' } },
    diseases: ['Panama wilt', 'Black sigatoka', 'Bunchy top'],
    tips: ['Use clean tissue-culture plants', 'Desucker regularly', 'Mulch to retain moisture'],
  },
};

const weatherIcon = (desc = '') => {
  const d = desc.toLowerCase();
  if (d.includes('rain') || d.includes('shower') || d.includes('drizzle')) return CloudRain;
  if (d.includes('cloud') && d.includes('sun')) return CloudSun;
  if (d.includes('cloud')) return Cloud;
  if (d.includes('sun') || d.includes('clear')) return Sun;
  if (d.includes('wind') || d.includes('storm')) return Wind;
  return CloudSun;
};

const seasonForNow = () => {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 8) return 'long';
  return 'short';
};

const WeatherPage = () => {
  const [location, setLocation] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [showForecast, setShowForecast] = useState(false);

  const loadWeather = async (force = false) => {
    if (loading && !force) return;
    setLoading(true);
    setError('');
    try {
      const loc = await getUserLocation();
      setLocation(loc);
      const res = await getWeatherForLocation(loc.lat, loc.lon);
      if (res.success && res.weather) {
        setWeather(res.weather);
      } else {
        throw new Error('No weather');
      }
    } catch (err) {
      try {
        const res = await getWeatherByName('nairobi');
        if (res.success && res.weather) {
          setWeather(res.weather);
          setLocation({ city: 'Nairobi', lat: -1.2921, lon: 36.8219 });
        } else {
          setError('Unable to fetch weather data right now.');
        }
      } catch (e2) {
        setError('Unable to fetch weather data right now.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeather();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const temp = weather?.temperature ?? null;
  const humidity = weather?.humidity ?? null;
  const rainfallYr = weather?.annual_rainfall ?? null;
  const rainfallDay = weather?.rainfall_last_24h ?? null;
  const season = seasonForNow();

  const recommendedCrops = Object.entries(KENYAN_CROPS).filter(([, crop]) => {
    if (temp == null) return true;
    const [min, max] = crop.tempRange;
    if (temp < min || temp > max) return false;
    if (rainfallYr != null) {
      const [rmin, rmax] = crop.rainfall;
      if (rainfallYr < rmin || rainfallYr > rmax) return false;
    }
    return true;
  }).slice(0, 6);

  const cropsToShow = recommendedCrops.length ? recommendedCrops : Object.entries(KENYAN_CROPS).slice(0, 6);

  const recommendations = weather?.recommendation
    ? String(weather.recommendation).split(/\n+/).filter((s) => s.trim())
    : [];

  const fiveDay = [
    { day: 'Today', icon: Sun, temp: temp ?? 24, cond: 'Clear & dry' },
    { day: 'Tue', icon: CloudSun, temp: (temp ?? 24) - 1, cond: 'Partly cloudy' },
    { day: 'Wed', icon: Cloud, temp: (temp ?? 24) - 2, cond: 'Cloudy' },
    { day: 'Thu', icon: CloudRain, temp: (temp ?? 24) - 3, cond: 'Scattered rain' },
    { day: 'Fri', icon: CloudSun, temp: (temp ?? 24) - 1, cond: 'Clearing showers' },
  ];

  const Icon = weatherIcon(weather?.description || '');

  return (
    <div className="space-y-6 kc-fade-in">
      {/* Hero */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2b8b3a] via-[#16813a] to-[#0f7e39] p-6 text-white shadow-soft lg:col-span-2">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-10 right-24 h-32 w-32 rounded-full bg-white/10" />
          <div className="relative z-10">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/80">
              <MapPin className="h-4 w-4" />
              {loading ? 'Locating…' : location?.city || 'Location unknown'}
              <button
                type="button"
                onClick={() => loadWeather(true)}
                className="ml-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/15 hover:bg-white/30"
                title="Refresh weather"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
            {loading ? (
              <div className="h-20 w-48 rounded-xl kc-shimmer" />
            ) : weather ? (
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-4">
                  <Icon className="h-16 w-16 text-yellow-200" />
                  <div>
                    <div className="text-5xl font-extrabold">{Math.round(temp)}°C</div>
                    <div className="mt-1 text-sm capitalize text-white/90">{weather.description}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl bg-white/10 p-3">
                    <Droplets className="mx-auto h-4 w-4 text-sky-200" />
                    <div className="mt-1 text-lg font-bold">{humidity ?? '—'}%</div>
                    <div className="text-[10px] uppercase tracking-wide text-white/70">Humidity</div>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3">
                    <Wind className="mx-auto h-4 w-4 text-emerald-100" />
                    <div className="mt-1 text-lg font-bold">{weather.wind_speed ?? '—'}</div>
                    <div className="text-[10px] uppercase tracking-wide text-white/70">Wind (m/s)</div>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3">
                    <Eye className="mx-auto h-4 w-4 text-amber-200" />
                    <div className="mt-1 text-lg font-bold">{weather.visibility ?? '—'}</div>
                    <div className="text-[10px] uppercase tracking-wide text-white/70">Visibility</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-white/90">Weather data unavailable.</div>
            )}
          </div>
        </div>

        {/* Rainfall + planting window */}
        <div className="kc-card flex flex-col justify-between p-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8a938c]">
              <Droplets className="h-4 w-4 text-primary" />
              Rainfall outlook
            </div>
            <div className="text-3xl font-extrabold text-[#1f2937]">
              {rainfallYr ?? '—'} mm<span className="text-base font-semibold text-[#8a938c]">/yr</span>
            </div>
            {rainfallDay != null && (
              <p className="mt-1 text-xs text-[#8a938c]">~{rainfallDay}mm in the last 24h</p>
            )}
          </div>
          <div className="mt-4 rounded-2xl bg-[#f3f6f3] p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#5d6a60]">
              <CalendarDays className="h-4 w-4 text-primary" />
              Season: <span className="font-bold capitalize">{season} rains</span>
            </div>
            <p className="mt-1 text-xs text-[#8a938c]">
              {season === 'long' ? 'Long rains: main planting window March–April.' : 'Short rains: plant October–November.'}
            </p>
          </div>
        </div>
      </section>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse-ring" />
            <h2 className="text-lg font-bold text-[#1f2937]">Farming Recommendations</h2>
          </div>
          <div className="kc-card space-y-2 p-5">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl bg-[#f8faf8] p-3 text-sm text-[#4b554f]">
                <ThermometerSun className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                {rec}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recommended crops */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse-ring" />
          <h2 className="text-lg font-bold text-[#1f2937]">Recommended Crops</h2>
          <span className="text-xs text-[#8a938c]">for your current conditions</span>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {cropsToShow.map(([key, crop]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedCrop(selectedCrop === key ? null : key)}
              className={`kc-card p-4 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover ${
                selectedCrop === key ? 'ring-2 ring-primary' : ''
              }`}
            >
              <div className="text-4xl">{crop.icon}</div>
              <div className="mt-2 text-sm font-bold text-[#1f2937]">{crop.name}</div>
              <div className="mt-1 text-[11px] text-[#8a938c]">
                {crop.tempRange[0]}–{crop.tempRange[1]}°C
              </div>
              <ChevronDown
                className={`mx-auto mt-2 h-4 w-4 text-primary transition-transform ${
                  selectedCrop === key ? 'rotate-180' : ''
                }`}
              />
            </button>
          ))}
        </div>
      </section>

      {/* Farming calendar detail */}
      {selectedCrop && (
        <section className="kc-card overflow-hidden kc-fade-in-up">
          {(() => {
            const [key, crop] = cropsToShow.find(([k]) => k === selectedCrop) || [];
            if (!crop) return null;
            const seasons = crop.seasons;
            return (
              <div className="grid lg:grid-cols-2">
                <div className="border-b border-[#eef2ef] p-5 lg:border-b-0 lg:border-r">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-3xl">{crop.icon}</span>
                    <div>
                      <h3 className="text-lg font-extrabold text-[#1f2937]">{crop.name} farming calendar</h3>
                      <div className="text-xs text-[#8a938c]">
                        Ideal {crop.tempRange[0]}–{crop.tempRange[1]}°C · {crop.rainfall[0]}–{crop.rainfall[1]}mm/yr
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(seasons).map(([seasonName, s]) => (
                      <div key={seasonName} className="rounded-2xl bg-[#f3f6f3] p-4">
                        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">{seasonName} rains</div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-[#5d6a60]">
                          <div className="rounded-lg bg-white p-2"><span className="font-bold">Plant:</span> {s.plant}</div>
                          <div className="rounded-lg bg-white p-2"><span className="font-bold">Top dress:</span> {s.topDress}</div>
                          <div className="rounded-lg bg-white p-2"><span className="font-bold">Weeding:</span> {s.weed}</div>
                          <div className="rounded-lg bg-white p-2"><span className="font-bold">Harvest:</span> {s.harvest}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {crop.varieties.map((v) => (
                      <span key={v} className="kc-badge bg-[#e6f5e9] text-primary">{v}</span>
                    ))}
                  </div>
                </div>

                <div className="p-5">
                  <h4 className="mb-2 text-sm font-bold text-[#1f2937]">Watch out for</h4>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {crop.diseases.map((d) => (
                      <span key={d} className="kc-badge bg-red-50 text-red-600">{d}</span>
                    ))}
                  </div>
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-[#1f2937]">
                    <Sprout className="h-4 w-4 text-primary" /> Farmer tips
                  </h4>
                  <ul className="space-y-2">
                    {crop.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-[#5d6a60]">
                        <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })()}
        </section>
      )}

      {/* 5 day forecast */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-[#1f2937]">
            <CloudSun className="h-5 w-5 text-primary" /> 5-Day Outlook
          </h2>
          <button
            type="button"
            onClick={() => setShowForecast((v) => !v)}
            className="text-xs font-semibold text-primary hover:underline"
          >
            {showForecast ? 'Hide' : 'Show'}
          </button>
        </div>
        {showForecast && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 kc-fade-in-up">
            {fiveDay.map((f) => (
              <div key={f.day} className="kc-card p-4 text-center transition-all hover:-translate-y-1 hover:shadow-card-hover">
                <div className="text-xs font-bold uppercase tracking-wide text-[#8a938c]">{f.day}</div>
                <f.icon className="mx-auto my-2 h-8 w-8 text-primary" />
                <div className="text-xl font-extrabold text-[#1f2937]">{Math.round(f.temp)}°C</div>
                <div className="mt-1 text-[11px] text-[#8a938c]">{f.cond}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
          <button type="button" onClick={() => loadWeather(true)} className="ml-auto font-bold text-amber-700 underline">
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

export default WeatherPage;