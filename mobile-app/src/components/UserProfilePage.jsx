import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { profileAPI } from '../services/api'
import DockNavigation from './DockNavigation'
import { Sprout, MapPin, Droplets, Tractor, Ruler, User, Edit3, Check, ChevronLeft, Plus, X, LogOut, ChevronDown } from 'lucide-react'

const UserProfilePage = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [profile, setProfile] = useState({
    location: '', county: '', sub_county: '', ward: '', crop_types: [],
    farm_size: '', farm_size_unit: 'acres', water_access_level: '',
    soil_type: '', farming_experience: '', primary_farming_activity: '',
    phone_number_alt: '', preferred_language: 'Swahili', notifications_enabled: true,
  })
  const [newCrop, setNewCrop] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        const response = await profileAPI.getProfile()
        if (response.success && response.profile) {
          setProfile((prev) => ({ ...prev, ...response.profile }))
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const handleChange = (field) => (e) => {
    setProfile((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleAddCrop = () => {
    if (newCrop.trim() && !profile.crop_types.includes(newCrop.trim())) {
      setProfile((prev) => ({ ...prev, crop_types: [...prev.crop_types, newCrop.trim()] }))
      setNewCrop('')
    }
  }

  const handleRemoveCrop = (crop) => {
    setProfile((prev) => ({ ...prev, crop_types: prev.crop_types.filter((c) => c !== crop) }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage({ type: '', text: '' })
      const response = await profileAPI.updateProfile(profile)
      if (response.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' })
        setEditMode(false)
        setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      } else {
        setMessage({ type: 'error', text: response.detail || 'Failed to update profile' })
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred while saving' })
    } finally {
      setSaving(false)
    }
  }

  const getLocationAutomatically = () => {
    if (!navigator.geolocation) {
      setMessage({ type: 'info', text: 'Geolocation not supported. Please enter manually.' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        try {
          const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`)
          const data = await res.json()
          setProfile((prev) => ({
            ...prev,
            location: data.locality || data.city || data.principalSubdivision || '',
            county: data.principalSubdivision || '',
            sub_county: data.locality || '',
            ward: data.locality || '',
          }))
          setMessage({ type: 'success', text: 'Location detected automatically!' })
          setTimeout(() => setMessage({ type: '', text: '' }), 3000)
        } catch {
          setMessage({ type: 'info', text: 'Could not auto-detect location. Please enter manually.' })
        }
      },
      () => setMessage({ type: 'info', text: 'Location access denied. Please enter manually.' })
    )
  }

  const commonCrops = ['Maize', 'Beans', 'Wheat', 'Rice', 'Sorghum', 'Millet', 'Potatoes', 'Sweet Potatoes', 'Cassava', 'Bananas', 'Coffee', 'Tea', 'Sugarcane', 'Tobacco', 'Tomatoes', 'Onions', 'Cabbage', 'Kales (Sukuma Wiki)', 'Avocado', 'Mango', 'Orange', 'Lemon', 'Passion Fruit']
  const counties = ['Mombasa', 'Kwale', 'Kilifi', 'Tana River', 'Lamu', 'Taita Taveta', 'Garissa', 'Wajir', 'Mandera', 'Marsabit', 'Isiolo', 'Meru', 'Tharaka Nithi', 'Embu', 'Kitui', 'Machakos', 'Makueni', 'Nyandarua', 'Nyeri', 'Kirinyaga', "Murang'a", 'Kiambu', 'Turkana', 'West Pokot', 'Samburu', 'Trans Nzoia', 'Uasin Gishu', 'Elgeyo Marakwet', 'Nandi', 'Baringo', 'Laikipia', 'Nakuru', 'Narok', 'Kajiado', 'Kericho', 'Bomet', 'Kakamega', 'Vihiga', 'Bungoma', 'Busia', 'Siaya', 'Kisumu', 'Homa Bay', 'Migori', 'Kisii', 'Nyamira', 'Nairobi']
  const soilTypes = ['Loam', 'Sandy Loam', 'Clay Loam', 'Sandy Clay', 'Clay', 'Silt Loam', 'Silt', 'Sandy', 'Volcanic', 'Alluvial', 'Laterite']

  const fieldDisabled = !editMode

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-page">
        <span className="mb-3 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-[14px] text-ink-soft">Loading your profile...</p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-page">
      <div className="screen px-0">
        <header className="safe-top sticky top-0 z-40 bg-gradient-to-r from-[#0f7e39] to-[#148d42] pb-2 shadow-lg">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => navigate('/home')} className="flex items-center gap-1 text-[13.5px] font-semibold text-white/90 active:scale-95">
              <ChevronLeft className="h-5 w-5" />
              Back
            </button>
            <div className="flex items-center gap-1.5">
              <Sprout className="h-[18px] w-[18px] text-white" />
              <span className="text-[16px] font-extrabold text-white">My Farm</span>
            </div>
            <button
              onClick={() => (editMode ? handleSave() : setEditMode(true))}
              disabled={saving}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-bold transition-all active:scale-95 ${
                editMode ? 'bg-white text-primary shadow-md' : 'border border-white/30 bg-white/20 text-white'
              } ${saving ? 'opacity-60' : ''}`}
            >
              {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : editMode ? <Check className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
              {saving ? 'Saving' : editMode ? 'Save' : 'Edit'}
            </button>
          </div>
        </header>

        <div className="space-y-4 px-5 pb-4 pt-4">
          {message.text && (
            <div className={`flex items-start justify-between gap-2 rounded-2xl border px-4 py-3 text-[13px] ${
              message.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : message.type === 'error' ? 'border-red-200 bg-red-50 text-red-600' : 'border-black/10 bg-black/[0.03] text-ink-soft'
            }`}>
              <span>{message.text}</span>
              <button onClick={() => setMessage({ type: '', text: '' })} className="shrink-0 opacity-60">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="card flex items-center gap-4 p-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full grad-green text-2xl font-extrabold text-white shadow-lifted">
              {user?.full_name?.charAt(0)?.toUpperCase() || <User className="h-8 w-8 text-white" />}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[17px] font-extrabold text-ink">{user?.full_name || 'Farmer'}</h2>
              <p className="truncate text-[13px] text-ink-soft">{user?.phone_number}</p>
              <p className="truncate text-[13px] text-ink-faint">{user?.email}</p>
            </div>
          </div>

          <Section icon={MapPin} title="Farm Location">
            {editMode && (
              <button onClick={getLocationAutomatically} className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-soft py-2.5 text-[13px] font-bold text-primary transition-all active:scale-[0.98]">
                <MapPin className="h-4 w-4" />
                Detect My Location
              </button>
            )}
            <Field label="County">
              {editMode ? (
                <Select value={profile.county} onChange={handleChange('county')} options={counties} placeholder="Select County" />
              ) : (
                <Value>{profile.county || 'Not set'}</Value>
              )}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sub-County">
                <input className="field" value={profile.sub_county} onChange={handleChange('sub_county')} disabled={fieldDisabled} placeholder="e.g., Kikuyu" />
              </Field>
              <Field label="Ward">
                <input className="field" value={profile.ward} onChange={handleChange('ward')} disabled={fieldDisabled} placeholder="e.g., Gikambura" />
              </Field>
            </div>
            <Field label="Specific Location">
              <input className="field" value={profile.location} onChange={handleChange('location')} disabled={fieldDisabled} placeholder="e.g., Near River, Mountain side" />
            </Field>
          </Section>

          <Section icon={Ruler} title="Farm Details">
            <Field label="Farm Size">
              <div className="flex gap-2">
                <input type="number" className="field flex-1" value={profile.farm_size} onChange={handleChange('farm_size')} disabled={fieldDisabled} placeholder="e.g., 5" />
                <select className="field w-32 shrink-0" value={profile.farm_size_unit} onChange={handleChange('farm_size_unit')} disabled={fieldDisabled}>
                  <option value="acres">Acres</option>
                  <option value="hectares">Hectares</option>
                  <option value="square_meters">Sq M</option>
                </select>
              </div>
            </Field>
            <Field label="Soil Type">
              {editMode ? (
                <Select value={profile.soil_type} onChange={handleChange('soil_type')} options={soilTypes} placeholder="Select Soil Type" />
              ) : (
                <Value>{profile.soil_type || 'Not set'}</Value>
              )}
            </Field>
          </Section>

          <Section icon={Sprout} title="Crops You Grow">
            {editMode && (
              <div className="mb-4 flex gap-2">
                <Select value={newCrop} onChange={(e) => setNewCrop(e.target.value)} options={commonCrops} placeholder="Select Crop" />
                <button onClick={handleAddCrop} className="shrink-0 rounded-xl grad-green px-4 text-white active:scale-95" aria-label="Add crop">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {profile.crop_types.map((crop, i) => (
                <span key={i} className="chip bg-primary-soft text-primary">
                  {crop}
                  {editMode && (
                    <button onClick={() => handleRemoveCrop(crop)} className="ml-1 text-primary active:scale-90">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
              {profile.crop_types.length === 0 && (
                <p className="text-[13px] text-ink-faint">No crops added yet. Tap Edit to add your crops.</p>
              )}
            </div>
          </Section>

          <Section icon={Droplets} title="Water Access Level">
            {editMode ? (
              <div className="space-y-2">
                {[
                  { value: 'high', label: 'High', desc: 'Reliable water source year-round', dot: 'bg-green-500' },
                  { value: 'medium', label: 'Medium', desc: 'Seasonal water availability', dot: 'bg-yellow-500' },
                  { value: 'low', label: 'Low', desc: 'Limited water access', dot: 'bg-red-500' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setProfile((prev) => ({ ...prev, water_access_level: opt.value }))}
                    className={`flex w-full items-center gap-2.5 rounded-xl border-2 p-3.5 text-left transition-all ${
                      profile.water_access_level === opt.value ? 'border-primary bg-primary/5' : 'border-black/10 hover:border-primary/50'
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${opt.dot}`} />
                    <span className="text-[13.5px] font-extrabold text-ink">{opt.label}</span>
                    <span className="text-[12.5px] text-ink-soft">{opt.desc}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                {profile.water_access_level ? (
                  <span className="inline-flex items-center gap-2 rounded-xl bg-primary-soft px-3 py-2 text-[13px] font-bold capitalize text-primary">
                    <Droplets className="h-4 w-4" />
                    {profile.water_access_level} Water Access
                  </span>
                ) : (
                  <p className="text-[13px] text-ink-faint">Not set</p>
                )}
              </div>
            )}
          </Section>

          <Section icon={Tractor} title="Additional Information">
            <Field label="Farming Experience">
              {editMode ? (
                <select className="field" value={profile.farming_experience} onChange={handleChange('farming_experience')}>
                  <option value="">Select Experience</option>
                  <option value="beginner">Beginner (0-2 years)</option>
                  <option value="intermediate">Intermediate (3-5 years)</option>
                  <option value="experienced">Experienced (6-10 years)</option>
                  <option value="expert">Expert (10+ years)</option>
                </select>
              ) : (
                <Value>{profile.farming_experience ? profile.farming_experience.replace('_', ' ') : 'Not set'}</Value>
              )}
            </Field>
            <Field label="Primary Farming Activity">
              <input className="field capitalize" value={profile.primary_farming_activity} onChange={handleChange('primary_farming_activity')} disabled={fieldDisabled} placeholder="e.g., Crop Farming, Livestock, Mixed" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Preferred Language">
                {editMode ? (
                  <select className="field" value={profile.preferred_language} onChange={handleChange('preferred_language')}>
                    {['Swahili', 'English', 'Kikuyu', 'Luo', 'Kalenjin', 'Kamba', 'Luhya'].map((l) => <option key={l}>{l}</option>)}
                  </select>
                ) : (
                  <Value>{profile.preferred_language || 'Swahili'}</Value>
                )}
              </Field>
              <Field label="Alt. Phone">
                <input type="tel" className="field" value={profile.phone_number_alt} onChange={handleChange('phone_number_alt')} disabled={fieldDisabled} placeholder="07XX..." />
              </Field>
            </div>
          </Section>

          <button
            onClick={async () => {
              await logout()
              navigate('/login')
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 py-3.5 text-[14px] font-extrabold text-red-600 transition-all active:scale-[0.98]"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
      <DockNavigation />
    </div>
  )
}

const Section = ({ icon: Icon, title, children }) => (
  <div className="card p-4">
    <div className="mb-4 flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-soft">
        <Icon className="h-4 w-4 text-primary" />
      </span>
      <h3 className="text-[15px] font-extrabold text-ink">{title}</h3>
    </div>
    <div className="space-y-3">{children}</div>
  </div>
)

const Field = ({ label, children }) => (
  <div>
    <label className="mb-1 block text-[12px] font-semibold text-ink-soft">{label}</label>
    {children}
  </div>
)

const Value = ({ children }) => (
  <p className="rounded-xl bg-black/[0.03] px-3.5 py-2.5 text-[13.5px] capitalize text-ink">{children}</p>
)

const Select = ({ value, onChange, options, placeholder }) => (
  <div className="relative">
    <select value={value} onChange={onChange} className="field w-full appearance-none pr-9 capitalize">
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
  </div>
)

export default UserProfilePage