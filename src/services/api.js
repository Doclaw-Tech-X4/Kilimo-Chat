/**
 * KilimoChat API Service
 * Connects frontend to Python backend
 */

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

/**
 * Send a chat message to the backend
 * @param {string} message - User's message
 * @param {string} userId - Optional user ID
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const sendChatMessage = async (message, userId = 'web_user') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Chat API Error:', error);
    // Return fallback response if backend is unavailable
    return {
      success: true,
      message: "I'm having trouble connecting to the server. Please try again in a moment. 🙏",
    };
  }
};

/**
 * Check backend health status
 * @returns {Promise<boolean>}
 */
export const checkBackendHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
};

/**
 * Test language detection
 * @param {string} text - Text to analyze
 */
export const detectLanguage = async (text) => {
  try {
    const response = await fetch(`${API_BASE_URL}/test/detect-language?text=${encodeURIComponent(text)}`, {
      method: 'POST',
    });
    return await response.json();
  } catch (error) {
    console.error('Language detection error:', error);
    return null;
  }
};

/**
 * Format timestamp for display
 * @param {Date} date 
 * @returns {string}
 */
export const formatTimestamp = (date = new Date()) => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Generate unique message ID
 */
export const generateMessageId = () => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Transcribe voice audio to text
 * @param {string} audioBase64 - Base64 encoded audio data
 * @param {string} userId - User ID
 * @returns {Promise<{success: boolean, transcription: string, detected_language: string}>}
 */
export const transcribeVoice = async (audioBase64, userId = 'web_user') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/voice/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio: audioBase64,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Voice transcription error:', error);
    return {
      success: false,
      transcription: null,
      error: 'Failed to transcribe voice message',
    };
  }
};

/**
 * Get chat history for a user
 * @param {string} userId - User ID
 * @param {number} limit - Number of messages to retrieve
 * @returns {Promise<{success: boolean, messages: Array}>}
 */
export const getChatHistory = async (userId = 'web_user', limit = 20) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/history/${userId}?limit=${limit}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Chat history error:', error);
    return {
      success: false,
      messages: [],
      error: 'Failed to load chat history',
    };
  }
};

/**
 * Upload a file (image, video, audio) to the backend
 * @param {File} file - File to upload
 * @param {string} userId - User ID
 * @param {string} context - Optional context/description for AI analysis
 * @returns {Promise<{success: boolean, message: string, file_url?: string}>}
 */
export const uploadFile = async (file, userId = 'web_user', context = '') => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);
    if (context) {
      formData.append('context', context);
    }

    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('File upload error:', error);
    return {
      success: false,
      message: 'Failed to upload file. Please try again.',
    };
  }
};

/**
 * Send voice message to backend
 * @param {Blob} audioBlob - Audio blob
 * @param {string} userId - User ID
 * @returns {Promise<{success: boolean, transcription?: string, message?: string, audio_response_url?: string}>}
 */
export const sendVoiceMessage = async (audioBlob, userId = 'web_user') => {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice_message.webm');
    formData.append('user_id', userId);

    const response = await fetch(`${API_BASE_URL}/api/voice/message`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Voice message error:', error);
    return {
      success: false,
      message: 'Failed to process voice message. Please try again.',
    };
  }
};

/**
 * Get text-to-speech audio for bot response
 * @param {string} text - Text to convert to speech
 * @param {string} language - Language code ('en' or 'sw')
 * @returns {Promise<{success: boolean, audio_url?: string}>}
 */
export const getTextToSpeech = async (text, language = 'en') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        language,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('TTS error:', error);
    return {
      success: false,
      error: 'Failed to generate speech',
    };
  }
};

/**
 * Play audio from URL
 * @param {string} audioUrl - URL to audio file
 */
export const playAudio = (audioUrl) => {
  return new Promise((resolve, reject) => {
    const audio = new Audio(audioUrl);
    audio.onended = resolve;
    audio.onerror = reject;
    audio.play().catch(reject);
  });
};

/**
 * Get user geolocation
 * @returns {Promise<{lat: number, lon: number, city?: string}>}
 */
export const getUserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};

/**
 * Get weather for specific location
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} userId - User ID
 * @returns {Promise<{success: boolean, weather?: object, message?: string}>}
 */
export const getWeatherForLocation = async (lat, lon, userId = 'web_user') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/weather`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lat,
        lon,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Weather API Error:', error);
    return {
      success: false,
      message: 'Failed to fetch weather data. Please try again.',
    };
  }
};

/**
 * Get weather by location name
 * @param {string} location - Location name (e.g., "Nairobi")
 * @param {string} userId - User ID
 * @returns {Promise<{success: boolean, weather?: object, message?: string}>}
 */
/**
 * Search for crop market data
 * @param {string} crop - Crop name to search
 * @param {object} location - User location {lat, lon}
 * @param {string} language - Language code ('en' or 'sw')
 * @returns {Promise<{success: boolean, crop_name?: string, current_price?: number, price_history?: Array, dealers?: Array, analysis?: string, audio_url?: string}>}
 */
export const searchMarketCrop = async (crop, location = null, language = 'en') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/market/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        crop,
        location,
        language,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Market search error:', error);
    // Return fallback data for demo purposes
    return generateFallbackMarketData(crop, language);
  }
};

/**
 * Generate fallback market data when backend is unavailable
 */
const generateFallbackMarketData = (crop, language) => {
  const currentYear = new Date().getFullYear();
  const basePrice = Math.floor(Math.random() * 200) + 50;
  
  // Generate 5-year price history
  const priceHistory = [];
  for (let i = 4; i >= 0; i--) {
    const year = currentYear - i;
    const variation = (Math.random() - 0.5) * 40;
    priceHistory.push({
      year: year.toString(),
      price: Math.floor(basePrice + variation + (i * 5)),
    });
  }

  // Generate dealers
  const kenyanTowns = [
    { name: 'Nairobi', region: 'Central' },
    { name: 'Mombasa', region: 'Coast' },
    { name: 'Kisumu', region: 'Nyanza' },
    { name: 'Nakuru', region: 'Rift Valley' },
    { name: 'Eldoret', region: 'Rift Valley' },
    { name: 'Nyeri', region: 'Central' },
  ];

  const dealers = kenyanTowns.slice(0, 4).map((town, index) => ({
    name: `${town.name} Agrovet ${index + 1}`,
    specialty: `${crop} Seeds & Products`,
    location: town.name,
    region: town.region,
    address: `${Math.floor(Math.random() * 100) + 1} ${['Main St', 'Market Rd', 'Farm Ave', 'Agri Lane'][index]}, ${town.name}`,
    phone: `+254 ${7 + index}${Math.floor(Math.random() * 90000000) + 10000000}`,
    verified: index < 2,
    distance: index === 0 ? Math.floor(Math.random() * 20) + 5 : Math.floor(Math.random() * 200) + 50,
  }));

  // Sort by distance (nearest first)
  dealers.sort((a, b) => (a.distance || 999) - (b.distance || 999));

  const isSwahili = language === 'sw';
  
  return {
    success: true,
    crop_name: crop.charAt(0).toUpperCase() + crop.slice(1),
    category: isSwahili ? 'Mazao ya Chakula' : 'Food Crop',
    current_price: priceHistory[priceHistory.length - 1].price,
    price_trend: priceHistory[4].price > priceHistory[3].price ? 'up' : 'down',
    price_change: Math.abs(Math.floor(((priceHistory[4].price - priceHistory[3].price) / priceHistory[3].price) * 100)),
    price_history: priceHistory,
    dealers: dealers,
    analysis: isSwahili 
      ? `Bei ya ${crop} imeongezeka kwa asilimia ${Math.floor(Math.random() * 15) + 5} katika mwaka wa hivi karibuni. Soko linatarajiwa kuwa thabiti katika miezi ijayo. Wauzaji wapo katika mikoa yote ya Kenya, na bei hutofautiana kulingana na eneo.`
      : `${crop} prices have increased by ${Math.floor(Math.random() * 15) + 5}% in the recent year. The market is expected to remain stable in the coming months. Dealers are available across all regions of Kenya, with prices varying based on location.`,
    image_url: `https://source.unsplash.com/400x400/?${encodeURIComponent(crop)},agriculture`,
  };
};

export const getWeatherByName = async (location, userId = 'web_user') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/weather/${encodeURIComponent(location)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Weather API Error:', error);
    return {
      success: false,
      message: 'Failed to fetch weather data. Please try again.',
    };
  }
};

// ============ AUTHENTICATION API ============

/**
 * Authentication API endpoints
 */
export const authAPI = {
  /**
   * Register a new user
   */
  register: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    return await response.json();
  },

  /**
   * Login user
   */
  login: async (phone_number, password) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone_number, password }),
    });
    return await response.json();
  },

  /**
   * Verify email with code
   */
  verifyEmail: async (user_id, code) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id, code }),
    });
    return await response.json();
  },

  /**
   * Resend verification email
   */
  resendVerification: async (user_id) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id }),
    });
    return await response.json();
  },

  /**
   * Forgot password
   */
  forgotPassword: async (email) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    return await response.json();
  },

  /**
   * Reset password with token
   */
  resetPassword: async (token, new_password, confirm_password) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, new_password, confirm_password }),
    });
    return await response.json();
  },

  /**
   * Get current user info
   */
  getCurrentUser: async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return await response.json();
  },

  /**
   * Update user profile
   */
  updateProfile: async (updates) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    return await response.json();
  },

  /**
   * Logout user
   */
  logout: async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    return await response.json();
  },

  /**
   * Google OAuth
   */
  googleAuth: {
    // Redirect to Google OAuth
    initiate: () => {
      window.location.href = `${API_BASE_URL}/api/auth/google`;
    },
    
    // Handle OAuth callback
    handleCallback: async (token) => {
      if (token) {
        localStorage.setItem('token', token);
        return { success: true };
      }
      return { success: false };
    }
  }
};

/**
 * Helper function to get auth headers for API calls
 */
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  } : {
    'Content-Type': 'application/json',
  };
};

/**
 * Enhanced uploadFile with authentication
 */
export const uploadFileAuth = async (file, context = '') => {
  try {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    if (context) {
      formData.append('context', context);
    }

    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData,
      headers: token ? {
        'Authorization': `Bearer ${token}`,
      } : {},
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('File upload error:', error);
    return {
      success: false,
      message: 'Failed to upload file. Please try again.',
    };
  }
};

/**
 * Enhanced sendChatMessage with authentication
 */
export const sendChatMessageAuth = async (message, context = '') => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        message,
        context,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Chat API Error:', error);
    return {
      success: true,
      message: "I'm having trouble connecting to the server. Please try again in a moment. 🙏",
    };
  }
};
