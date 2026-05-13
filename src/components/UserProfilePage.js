import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { profileAPI } from '../services/api';
import DockNavigation from './DockNavigation';
import {
  Sprout,
  MapPin,
  Droplets,
  Tractor,
  Ruler,
  User,
  Edit3,
  Check,
  ChevronLeft,
  Plus,
  X
} from 'lucide-react';
import {
  Alert,
  CircularProgress,
} from '@mui/material';

const UserProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState({
    location: '',
    county: '',
    sub_county: '',
    ward: '',
    crop_types: [],
    farm_size: '',
    farm_size_unit: 'acres',
    water_access_level: '',
    soil_type: '',
    farming_experience: '',
    primary_farming_activity: '',
    phone_number_alt: '',
    preferred_language: 'Swahili',
    notifications_enabled: true
  });
  
  const [newCrop, setNewCrop] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editMode, setEditMode] = useState(false);

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await profileAPI.getProfile();
      if (response.success && response.profile) {
        setProfile(prev => ({
          ...prev,
          ...response.profile
        }));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (event) => {
    setProfile(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleAddCrop = () => {
    if (newCrop.trim() && !profile.crop_types.includes(newCrop.trim())) {
      setProfile(prev => ({
        ...prev,
        crop_types: [...prev.crop_types, newCrop.trim()]
      }));
      setNewCrop('');
    }
  };

  const handleRemoveCrop = (cropToRemove) => {
    setProfile(prev => ({
      ...prev,
      crop_types: prev.crop_types.filter(crop => crop !== cropToRemove)
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      
      const response = await profileAPI.updateProfile(profile);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setEditMode(false);
      } else {
        setMessage({ type: 'error', text: response.detail || 'Failed to update profile' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while saving' });
    } finally {
      setSaving(false);
    }
  };

  const getLocationAutomatically = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            // Reverse geocoding to get location name
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
            const data = await response.json();
            
            setProfile(prev => ({
              ...prev,
              location: data.locality || data.city || data.principalSubdivision || '',
              county: data.principalSubdivision || '',
              sub_county: data.locality || '',
              ward: data.locality || ''
            }));
            
            setMessage({ type: 'success', text: 'Location detected automatically!' });
          } catch (error) {
            setMessage({ type: 'info', text: 'Could not auto-detect location. Please enter manually.' });
          }
        },
        (error) => {
          setMessage({ type: 'info', text: 'Location access denied. Please enter manually.' });
        }
      );
    } else {
      setMessage({ type: 'info', text: 'Geolocation not supported. Please enter manually.' });
    }
  };

  const commonCrops = [
    'Maize', 'Beans', 'Wheat', 'Rice', 'Sorghum', 'Millet',
    'Potatoes', 'Sweet Potatoes', 'Cassava', 'Bananas',
    'Coffee', 'Tea', 'Sugarcane', 'Tobacco',
    'Tomatoes', 'Onions', 'Cabbage', 'Kales (Sukuma Wiki)',
    'Avocado', 'Mango', 'Orange', 'Lemon', 'Passion Fruit'
  ];

  const counties = [
    'Mombasa', 'Kwale', 'Kilifi', 'Tana River', 'Lamu', 'Taita Taveta',
    'Garissa', 'Wajir', 'Mandera', 'Marsabit', 'Isiolo', 'Meru',
    'Tharaka Nithi', 'Embu', 'Kitui', 'Machakos', 'Makueni',
    'Nyandarua', 'Nyeri', 'Kirinyaga', 'Murang\'a', 'Kiambu',
    'Turkana', 'West Pokot', 'Samburu', 'Trans Nzoia', 'Uasin Gishu',
    'Elgeyo Marakwet', 'Nandi', 'Baringo', 'Laikipia', 'Nakuru',
    'Narok', 'Kajiado', 'Kericho', 'Bomet', 'Kakamega', 'Vihiga',
    'Bungoma', 'Busia', 'Siaya', 'Kisumu', 'Homa Bay', 'Migori',
    'Kisii', 'Nyamira', 'Nairobi'
  ];

  const soilTypes = [
    'Loam', 'Sandy Loam', 'Clay Loam', 'Sandy Clay', 'Clay',
    'Silt Loam', 'Silt', 'Sandy', 'Volcanic', 'Alluvial', 'Laterite'
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <CircularProgress size={40} className="text-[#0f7e39]" />
          <p className="text-sm text-gray-500">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] pb-24">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-[#0f7e39] to-[#148d42] shadow-lg">
        <div className="mx-auto max-w-[420px] px-4 py-3 flex items-center justify-between">
          <button 
            onClick={() => navigate('/home')}
            className="flex items-center gap-1 text-white/90 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          
          <div className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-white" />
            <span className="text-lg font-bold text-white">My Profile</span>
          </div>
          
          <button
            onClick={() => editMode ? handleSave() : setEditMode(true)}
            disabled={saving}
            className={`
              flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold transition-all duration-300
              ${editMode 
                ? 'bg-white text-[#0f7e39] hover:bg-white/90 shadow-md' 
                : 'bg-white/20 text-white hover:bg-white/30 border border-white/30'
              }
            `}
          >
            {saving ? (
              <CircularProgress size={16} className="text-current" />
            ) : editMode ? (
              <>
                <Check className="h-4 w-4" />
                Save
              </>
            ) : (
              <>
                <Edit3 className="h-4 w-4" />
                Edit
              </>
            )}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[420px] px-4 pt-4 space-y-4">
        {message.text && (
          <Alert 
            severity={message.type} 
            sx={{ mb: 2 }}
            onClose={() => setMessage({ type: '', text: '' })}
          >
            {message.text}
          </Alert>
        )}

        {/* User Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e6e6e6] overflow-hidden">
          <div className="p-4 flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#0f7e39] to-[#148d42] flex items-center justify-center shadow-lg">
              <span className="text-2xl text-white font-bold">
                {user?.full_name?.charAt(0).toUpperCase() || <User className="h-8 w-8 text-white" />}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 truncate">
                {user?.full_name || 'Farmer'}
              </h2>
              <p className="text-sm text-gray-500">{user?.phone_number}</p>
              <p className="text-sm text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Location Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e6e6e6] overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-[#0f7e39]/10 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-[#0f7e39]" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Farm Location</h3>
            </div>
            
            {editMode && (
              <button
                onClick={getLocationAutomatically}
                className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#0f7e39]/10 text-[#0f7e39] font-medium text-sm hover:bg-[#0f7e39]/20 transition-all"
              >
                <MapPin className="h-4 w-4" />
                Detect My Location
              </button>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">County</label>
                {editMode ? (
                  <select
                    value={profile.county}
                    onChange={handleChange('county')}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-[#0f7e39] focus:ring-2 focus:ring-[#0f7e39]/20 outline-none text-sm"
                  >
                    <option value="">Select County</option>
                    {counties.map((county) => (
                      <option key={county} value={county}>{county}</option>
                    ))}
                  </select>
                ) : (
                  <p className="px-3 py-2 bg-gray-50 rounded-xl text-sm text-gray-900">
                    {profile.county || 'Not set'}
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Sub-County</label>
                  <input
                    type="text"
                    value={profile.sub_county}
                    onChange={handleChange('sub_county')}
                    disabled={!editMode}
                    placeholder="e.g., Kikuyu"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-[#0f7e39] focus:ring-2 focus:ring-[#0f7e39]/20 outline-none text-sm disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Ward</label>
                  <input
                    type="text"
                    value={profile.ward}
                    onChange={handleChange('ward')}
                    disabled={!editMode}
                    placeholder="e.g., Gikambura"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-[#0f7e39] focus:ring-2 focus:ring-[#0f7e39]/20 outline-none text-sm disabled:bg-gray-50"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Specific Location</label>
                <input
                  type="text"
                  value={profile.location}
                  onChange={handleChange('location')}
                  disabled={!editMode}
                  placeholder="e.g., Near River, Mountain side"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-[#0f7e39] focus:ring-2 focus:ring-[#0f7e39]/20 outline-none text-sm disabled:bg-gray-50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Farm Details Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e6e6e6] overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-[#0f7e39]/10 flex items-center justify-center">
                <Ruler className="h-4 w-4 text-[#0f7e39]" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Farm Details</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Farm Size</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={profile.farm_size}
                    onChange={handleChange('farm_size')}
                    disabled={!editMode}
                    placeholder="e.g., 5"
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-300 focus:border-[#0f7e39] focus:ring-2 focus:ring-[#0f7e39]/20 outline-none text-sm disabled:bg-gray-50"
                  />
                  <select
                    value={profile.farm_size_unit}
                    onChange={handleChange('farm_size_unit')}
                    disabled={!editMode}
                    className="px-3 py-2 rounded-xl border border-gray-300 focus:border-[#0f7e39] focus:ring-2 focus:ring-[#0f7e39]/20 outline-none text-sm disabled:bg-gray-50"
                  >
                    <option value="acres">Acres</option>
                    <option value="hectares">Hectares</option>
                    <option value="square_meters">Sq M</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Soil Type</label>
                {editMode ? (
                  <select
                    value={profile.soil_type}
                    onChange={handleChange('soil_type')}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-[#0f7e39] focus:ring-2 focus:ring-[#0f7e39]/20 outline-none text-sm"
                  >
                    <option value="">Select Soil Type</option>
                    {soilTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                ) : (
                  <p className="px-3 py-2 bg-gray-50 rounded-xl text-sm text-gray-900">
                    {profile.soil_type || 'Not set'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Crop Types Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e6e6e6] overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-[#0f7e39]/10 flex items-center justify-center">
                <Sprout className="h-4 w-4 text-[#0f7e39]" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Crops You Grow</h3>
            </div>

            {editMode && (
              <div className="flex gap-2 mb-4">
                <select
                  value={newCrop}
                  onChange={(e) => setNewCrop(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-300 focus:border-[#0f7e39] focus:ring-2 focus:ring-[#0f7e39]/20 outline-none text-sm"
                >
                  <option value="">Select Crop</option>
                  {commonCrops.map((crop) => (
                    <option key={crop} value={crop}>{crop}</option>
                  ))}
                </select>
                <button
                  onClick={handleAddCrop}
                  className="px-4 py-2 bg-[#0f7e39] text-white rounded-xl font-medium text-sm hover:bg-[#0d6b30] transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {profile.crop_types.map((crop, index) => (
                <div
                  key={index}
                  className={`
                    inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium
                    bg-[#0f7e39]/10 text-[#0f7e39] border border-[#0f7e39]/20
                  `}
                >
                  {crop}
                  {editMode && (
                    <button
                      onClick={() => handleRemoveCrop(crop)}
                      className="ml-1 hover:text-red-500 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              {profile.crop_types.length === 0 && (
                <p className="text-sm text-gray-400">
                  No crops added yet. Click Edit to add your crops.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Water Access Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e6e6e6] overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-[#0f7e39]/10 flex items-center justify-center">
                <Droplets className="h-4 w-4 text-[#0f7e39]" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Water Access Level</h3>
            </div>

            {editMode ? (
              <div className="space-y-2">
                {[
                  { value: 'high', label: 'High', desc: 'Reliable water source year-round', color: 'bg-green-100 text-green-700' },
                  { value: 'medium', label: 'Medium', desc: 'Seasonal water availability', color: 'bg-yellow-100 text-yellow-700' },
                  { value: 'low', label: 'Low', desc: 'Limited water access', color: 'bg-red-100 text-red-700' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setProfile(prev => ({ ...prev, water_access_level: option.value }))}
                    className={`
                      w-full p-3 rounded-xl text-left border-2 transition-all
                      ${profile.water_access_level === option.value 
                        ? 'border-[#0f7e39] bg-[#0f7e39]/5' 
                        : 'border-gray-200 hover:border-[#0f7e39]/50'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${option.color}`}>
                        {option.label}
                      </span>
                      <span className="text-sm text-gray-600">{option.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                {profile.water_access_level ? (
                  <div className={`
                    inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
                    ${profile.water_access_level === 'high' 
                      ? 'bg-green-100 text-green-700' 
                      : profile.water_access_level === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }
                  `}>
                    <Droplets className="h-4 w-4" />
                    {profile.water_access_level.charAt(0).toUpperCase() + profile.water_access_level.slice(1)} Water Access
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Not set</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e6e6e6] overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-[#0f7e39]/10 flex items-center justify-center">
                <Tractor className="h-4 w-4 text-[#0f7e39]" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Additional Information</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Farming Experience</label>
                {editMode ? (
                  <select
                    value={profile.farming_experience}
                    onChange={handleChange('farming_experience')}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-[#0f7e39] focus:ring-2 focus:ring-[#0f7e39]/20 outline-none text-sm"
                  >
                    <option value="">Select Experience</option>
                    <option value="beginner">Beginner (0-2 years)</option>
                    <option value="intermediate">Intermediate (3-5 years)</option>
                    <option value="experienced">Experienced (6-10 years)</option>
                    <option value="expert">Expert (10+ years)</option>
                  </select>
                ) : (
                  <p className="px-3 py-2 bg-gray-50 rounded-xl text-sm text-gray-900 capitalize">
                    {profile.farming_experience ? profile.farming_experience.replace('_', ' ') : 'Not set'}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Primary Farming Activity</label>
                <input
                  type="text"
                  value={profile.primary_farming_activity}
                  onChange={handleChange('primary_farming_activity')}
                  disabled={!editMode}
                  placeholder="e.g., Crop Farming, Livestock, Mixed"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-[#0f7e39] focus:ring-2 focus:ring-[#0f7e39]/20 outline-none text-sm disabled:bg-gray-50"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Preferred Language</label>
                  {editMode ? (
                    <select
                      value={profile.preferred_language}
                      onChange={handleChange('preferred_language')}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-[#0f7e39] focus:ring-2 focus:ring-[#0f7e39]/20 outline-none text-sm"
                    >
                      <option value="Swahili">Swahili</option>
                      <option value="English">English</option>
                      <option value="Kikuyu">Kikuyu</option>
                      <option value="Luo">Luo</option>
                      <option value="Kalenjin">Kalenjin</option>
                      <option value="Kamba">Kamba</option>
                      <option value="Luhya">Luhya</option>
                    </select>
                  ) : (
                    <p className="px-3 py-2 bg-gray-50 rounded-xl text-sm text-gray-900">
                      {profile.preferred_language || 'Swahili'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Alt. Phone</label>
                  <input
                    type="tel"
                    value={profile.phone_number_alt}
                    onChange={handleChange('phone_number_alt')}
                    disabled={!editMode}
                    placeholder="e.g., 07XX..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-[#0f7e39] focus:ring-2 focus:ring-[#0f7e39]/20 outline-none text-sm disabled:bg-gray-50"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DockNavigation />
    </div>
  );
};

export default UserProfilePage;
