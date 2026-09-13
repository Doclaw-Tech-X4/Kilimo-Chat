import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  UserRound,
  Phone,
  Mail,
  MapPin,
  Droplets,
  Sprout,
  Save,
  Pencil,
  Check,
  AlertCircle,
  LocateFixed,
  Loader2,
  CheckCircle2,
  Tractor,
  Languages,
} from 'lucide-react';
import { profileAPI } from '../services/api';

const COUNTIES = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa',
  'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi',
  'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu', 'Machakos',
  'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa', "Murang'a", 'Nairobi',
  'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua', 'Nyeri', 'Samburu', 'Siaya',
  'Taita-Taveta', 'Tana River', 'Tharaka-Nithi', 'Trans-Nzoia', 'Turkana', 'Uasin Gishu',
  'Vihiga', 'Wajir', 'West Pokot',
];

const CROPS = [
  'Maize', 'Beans', 'Tomatoes', 'Potatoes', 'Cabbage', 'Onions', 'Coffee', 'Tea',
  'Bananas', 'Rice', 'Wheat', 'Sugarcane', 'Avocado', 'Mangoes', 'Strawberries', 'Sunflower',
];

const SOIL_TYPES = ['Clay', 'Sandy', 'Loamy', 'Silt', 'Rocky', 'Peaty', 'Mixed'];

const WATER_LEVELS = [
  { value: 'high', label: 'High', desc: 'Irrigation or abundant rainfall available', icon: Droplets },
  { value: 'medium', label: 'Medium', desc: 'Occasional irrigation, seasonal rains', icon: Droplets },
  { value: 'low', label: 'Low', desc: 'Rely mainly on rain-fed farming', icon: Droplets },
];

const defaultProfile = {
  location: '',
  county: '',
  sub_county: '',
  ward: '',
  crop_types: [],
  farm_size: '',
  farm_size_unit: 'acres',
  water_access_level: 'medium',
  soil_type: '',
  farming_experience: '',
  primary_farming_activity: '',
  phone_number_alt: '',
  preferred_language: 'Swahili',
  notifications_enabled: true,
};

const ProfilePage = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [message, setMessage] = useState({ ok: true, text: '' });
  const [error, setError] = useState('');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    const res = await profileAPI.getProfile();
    if (res.success && res.profile) {
      setProfile((prev) => ({ ...defaultProfile, ...prev, ...res.profile }));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const set = (key, value) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
    setMessage({ ok: true, text: '' });
    setError('');
  };

  const toggleCrop = (crop) => {
    const crops = profile.crop_types || [];
    set(
      'crop_types',
      crops.includes(crop) ? crops.filter((c) => c !== crop) : [...crops, crop]
    );
  };

  const saveProfile = async () => {
    setSaving(true);
    setMessage({ ok: true, text: '' });
    setError('');
    const res = await profileAPI.updateProfile(profile);
    setSaving(false);
    if (res.success) {
      setMessage({ ok: true, text: 'Profile saved successfully!' });
    } else {
      setError(res.detail || 'Failed to save profile.');
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported.');
      return;
    }
    setDetecting(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const resp = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`
          );
          const data = await resp.json();
          set('county', data.principalSubdivision || '');
          set('location', `${data.city || ''}${data.locality ? `, ${data.locality}` : ''}`);
        } catch (err) {
          setError('Could not reverse-geocode your position.');
        } finally {
          setDetecting(false);
        }
      },
      () => {
        setDetecting(false);
        setError('Location permission denied.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const fullName = user?.full_name || 'Farmer';
  const initials = fullName.split(/[\s@]+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-2xl kc-shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 kc-fade-in">
      {/* Header card */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-light to-primary-soft p-6 text-white shadow-soft">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="relative z-10 flex flex-col items-center gap-4 text-center md:flex-row md:text-left">
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-3xl bg-white text-2xl font-extrabold text-primary shadow-xl">
            {initials || 'K'}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold">{fullName}</h1>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-white/85 md:justify-start">
              <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {user?.phone_number || '—'}</span>
              <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {user?.email || '—'}</span>
            </div>
          </div>
          {message.text && (
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${message.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
              {message.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {message.text}
            </div>
          )}
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Farm location */}
        <section className="kc-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-[#1f2937]">
              <MapPin className="h-5 w-5 text-primary" /> Farm Location
            </h2>
            <button
              type="button"
              onClick={detectLocation}
              disabled={detecting}
              className="kc-btn-outline !py-1.5 text-xs"
            >
              {detecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
              Detect
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="kc-label">County</label>
              <select className="kc-select" value={profile.county || ''} onChange={(e) => set('county', e.target.value)}>
                <option value="">Select county…</option>
                {COUNTIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="kc-label">Sub-county</label>
              <input className="kc-input" value={profile.sub_county || ''} onChange={(e) => set('sub_county', e.target.value)} placeholder="e.g. Gatundu North" />
            </div>
            <div>
              <label className="kc-label">Ward</label>
              <input className="kc-input" value={profile.ward || ''} onChange={(e) => set('ward', e.target.value)} placeholder="e.g. Gituamba" />
            </div>
            <div>
              <label className="kc-label">Nearest town / Location</label>
              <input className="kc-input" value={profile.location || ''} onChange={(e) => set('location', e.target.value)} placeholder="e.g. Thika" />
            </div>
          </div>
        </section>

        {/* Farm details */}
        <section className="kc-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-[#1f2937]">
            <Tractor className="h-5 w-5 text-primary" /> Farm Details
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="kc-label">Farm size</label>
              <input className="kc-input" type="number" min="0" step="0.5" value={profile.farm_size || ''} onChange={(e) => set('farm_size', e.target.value)} placeholder="e.g. 2" />
            </div>
            <div>
              <label className="kc-label">Unit</label>
              <select className="kc-select" value={profile.farm_size_unit || 'acres'} onChange={(e) => set('farm_size_unit', e.target.value)}>
                <option value="acres">Acres</option>
                <option value="hectares">Hectares</option>
              </select>
            </div>
            <div>
              <label className="kc-label">Soil type</label>
              <select className="kc-select" value={profile.soil_type || ''} onChange={(e) => set('soil_type', e.target.value)}>
                <option value="">Select soil…</option>
                {SOIL_TYPES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="kc-label">Farming experience</label>
              <select className="kc-select" value={profile.farming_experience || ''} onChange={(e) => set('farming_experience', e.target.value)}>
                <option value="">Select…</option>
                <option value="<1">Less than 1 year</option>
                <option value="1-3">1 – 3 years</option>
                <option value="4-10">4 – 10 years</option>
                <option value=">10">Over 10 years</option>
              </select>
            </div>
            <div>
              <label className="kc-label">Primary activity</label>
              <select className="kc-select" value={profile.primary_farming_activity || ''} onChange={(e) => set('primary_farming_activity', e.target.value)}>
                <option value="">Select…</option>
                <option value="crop_farmer">Crop Farmer</option>
                <option value="livestock">Livestock Keeper</option>
                <option value="mixed">Mixed Farming</option>
                <option value="poultry">Poultry</option>
                <option value="horticulture">Horticulture</option>
                <option value="agrovet">Agrovet / Extension</option>
              </select>
            </div>
            <div>
              <label className="kc-label">Alternate phone</label>
              <input className="kc-input" value={profile.phone_number_alt || ''} onChange={(e) => set('phone_number_alt', e.target.value)} placeholder="+2547XXXXXXXX" />
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Crops */}
        <section className="kc-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-[#1f2937]">
            <Sprout className="h-5 w-5 text-primary" /> Crops You Grow
          </h2>
          <div className="flex flex-wrap gap-2">
            {CROPS.map((crop) => {
              const selected = profile.crop_types?.includes(crop);
              return (
                <button
                  key={crop}
                  type="button"
                  onClick={() => toggleCrop(crop)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                    selected
                      ? 'border-primary bg-primary text-white shadow-soft'
                      : 'border-[#dde5de] bg-white text-[#5d6a60] hover:border-primary/40'
                  }`}
                >
                  {selected && <Check className="mr-1 inline h-3.5 w-3.5" />}
                  {crop}
                </button>
              );
            })}
          </div>
        </section>

        {/* Water access + prefs */}
        <section className="kc-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-[#1f2937]">
            <Droplets className="h-5 w-5 text-primary" /> Water Access & Preferences
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {WATER_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => set('water_access_level', level.value)}
                className={`rounded-2xl border p-3 text-center transition-all ${
                  profile.water_access_level === level.value
                    ? 'border-primary bg-[#e6f5e9] ring-2 ring-primary/20'
                    : 'border-[#e4eae5] bg-white hover:border-primary/40'
                }`}
              >
                <level.icon className={`mx-auto h-5 w-5 ${profile.water_access_level === level.value ? 'text-primary' : 'text-[#a2aca4]'}`} />
                <div className="mt-1 text-xs font-bold text-[#1f2937]">{level.label}</div>
                <div className="mt-0.5 hidden text-[10px] text-[#8a938c] sm:block">{level.desc}</div>
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="kc-label"><Languages className="mr-1 inline h-3 w-3" /> Preferred language</label>
              <select className="kc-select" value={profile.preferred_language || 'Swahili'} onChange={(e) => set('preferred_language', e.target.value)}>
                <option value="Swahili">Swahili</option>
                <option value="English">English</option>
                <option value="Both">Both</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="kc-card flex w-full cursor-pointer items-center gap-3 p-3" style={{ border: '1px solid #e4eae5' }}>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={profile.notifications_enabled !== false}
                  onChange={(e) => set('notifications_enabled', e.target.checked)}
                />
                <span className="text-xs font-semibold text-[#1f2937]">Enable notifications</span>
              </label>
            </div>
          </div>
        </section>
      </div>

      {/* Save bar */}
      <div className="sticky bottom-4 z-10 flex justify-end">
        <div className="kc-card flex items-center gap-3 px-4 py-3 shadow-soft">
          <span className="hidden text-xs text-[#8a938c] sm:block">
            {message.ok && message.text ? message.text : 'Your farmer profile powers personalized advice.'}
          </span>
          <button type="button" onClick={saveProfile} disabled={saving} className="kc-btn-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;