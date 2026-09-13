/* eslint-disable no-undef */
/**
 * KilimoChat API Service
 * Connects the mobile app to the Python backend.
 * The backend URL is baked in at build time to the LAN IP of the machine
 * running the backend, so a physical phone on the same Wi-Fi can reach it.
 */

const BAKED_API_URL =
  typeof __API_URL__ !== 'undefined' ? __API_URL__ : 'http://192.168.1.100:8000'

// Runtime-selected backend. Priority: last-known-good (localStorage),
// then any of the candidates below (baked LAN IP and localhost for the
// adb reverse tunnel on physical devices).
const STORAGE_KEY = 'kilimo_api_url'

export let API_BASE_URL = (() => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && /^https?:\/\//.test(stored)) return stored
  } catch (e) {
    /* ignore */
  }
  return BAKED_API_URL
})()

export const getApiUrl = () => API_BASE_URL

export const setApiUrl = (url) => {
  API_BASE_URL = url
  try {
    localStorage.setItem(STORAGE_KEY, url)
  } catch (e) {
    /* ignore */
  }
}

const normalizeAudioResponse = (data) => {
  if (!data || typeof data !== 'object') return data
  for (const key of ['audio_url', 'audio_response_url']) {
    if (data[key]?.startsWith('/')) data[key] = `${API_BASE_URL}${data[key]}`
  }
  return data
}

export const getApiCandidates = () => {
  const candidates = [
    BAKED_API_URL,
    'http://10.0.2.2:8000',
    'http://10.0.3.2:8000',
    'http://127.0.0.1:8000',
    'http://localhost:8000',
  ]
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && /^https?:\/\//.test(stored)) candidates.unshift(stored)
  } catch (e) {
    /* ignore */
  }
  return [...new Set(candidates)]
}

const pingUrl = async (url) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 4000)
  try {
    const res = await fetch(`${url}/health`, { method: 'GET', signal: controller.signal })
    return res.ok ? { ok: true, url } : { ok: false, url }
  } catch (e) {
    return { ok: false, url }
  } finally {
    clearTimeout(timer)
  }
}

// Probe all candidate backends in parallel and pick the first healthy one.
// Runs at app startup (after login screen loads), so auth/chat calls always
// use a reachable backend.
export const detectBackend = async () => {
  const results = await Promise.all(getApiCandidates().map(pingUrl))
  const winner = results.find((r) => r.ok)
  if (winner) {
    setApiUrl(winner.url)
    return winner
  }
  return { ok: false }
}

export const resetApiUrl = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (e) {
    /* ignore */
  }
  API_BASE_URL = BAKED_API_URL
}

export const sendChatMessage = async (message, userId = 'web_user') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, user_id: userId }),
    })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('Chat API Error:', error)
    return {
      success: true,
      message:
        "I'm having trouble connecting to the server. Please try again in a moment. 🙏",
    }
  }
}

export const checkBackendHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { method: 'GET' })
    return response.ok
  } catch (error) {
    console.error('Health check failed:', error)
    return false
  }
}

export const detectLanguage = async (text) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/test/detect-language?text=${encodeURIComponent(text)}`,
      { method: 'POST' }
    )
    return await response.json()
  } catch (error) {
    console.error('Language detection error:', error)
    return null
  }
}

export const formatTimestamp = (date = new Date()) => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export const generateMessageId = () => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export const transcribeVoice = async (audioBase64, userId = 'web_user') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/voice/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio: audioBase64, user_id: userId }),
    })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('Voice transcription error:', error)
    return {
      success: false,
      transcription: null,
      error: 'Failed to transcribe voice message',
    }
  }
}

export const getChatHistory = async (userId = 'web_user', limit = 20) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/chat/history/${userId}?limit=${limit}`,
      { method: 'GET' }
    )
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('Chat history error:', error)
    return { success: false, messages: [], error: 'Failed to load chat history' }
  }
}

export const uploadFile = async (file, userId = 'web_user', context = '') => {
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('user_id', userId)
    if (context) formData.append('context', context)
    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('File upload error:', error)
    return { success: false, message: 'Failed to upload file. Please try again.' }
  }
}

export const sendVoiceMessage = async (audioBlob, userId = 'web_user') => {
  try {
    const formData = new FormData()
    const extension = audioBlob.type?.includes('mp4') ? 'mp4' : 'webm'
    formData.append('audio', audioBlob, `voice_message.${extension}`)
    formData.append('user_id', userId)
    const response = await fetch(`${API_BASE_URL}/api/voice/message`, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return normalizeAudioResponse(await response.json())
  } catch (error) {
    console.error('Voice message error:', error)
    return {
      success: false,
      message: 'Failed to process voice message. Please try again.',
    }
  }
}

export const getTextToSpeech = async (text, language = 'en') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language }),
    })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return normalizeAudioResponse(await response.json())
  } catch (error) {
    console.error('TTS error:', error)
    return { success: false, error: 'Failed to generate speech' }
  }
}

export const playAudio = (audioUrl) => {
  return new Promise((resolve, reject) => {
    const resolvedUrl = audioUrl?.startsWith('/') ? `${API_BASE_URL}${audioUrl}` : audioUrl
    const audio = new Audio(resolvedUrl)
    audio.onended = resolve
    audio.onerror = reject
    audio.play().catch(reject)
  })
}

export const getUserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
      },
      (error) => {
        reject(error)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  })
}

export const getWeatherForLocation = async (lat, lon, userId = 'web_user') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/weather`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lon, user_id: userId }),
    })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('Weather API Error:', error)
    return { success: false, message: 'Failed to fetch weather data. Please try again.' }
  }
}

export const searchMarketCrop = async (crop, location = null, language = 'en') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/market/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crop, location, language }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) return { success: false, message: data.message || data.detail || `Market request failed (${response.status})` }
    return data
  } catch (error) {
    console.error('Market search error:', error)
    return { success: false, message: `Cannot reach live market data at ${API_BASE_URL}.` }
  }
}

export const getWeatherByName = async (location, userId = 'web_user') => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/weather/${encodeURIComponent(location)}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    )
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('Weather API Error:', error)
    return { success: false, message: 'Failed to fetch weather data. Please try again.' }
  }
}

// ============ AUTHENTICATION API ============
export const authAPI = {
  register: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    })
    return await response.json()
  },

  login: async (phone_number, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phone_number.replace(/[\s-]/g, ''),
          password,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        return {
          success: false,
          detail: data.detail || `Login request failed (${response.status})`,
        }
      }
      return data
    } catch (error) {
      console.error('Login API Error:', error)
      return {
        success: false,
        detail: `Cannot reach the backend at ${API_BASE_URL}. Start the backend and try again.`,
      }
    }
  },

  verifyEmail: async (user_id, code) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, code }),
    })
    return await response.json()
  },

  resendVerification: async (user_id) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id }),
    })
    return await response.json()
  },

  forgotPassword: async (email) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    return await response.json()
  },

  resetPassword: async (token, new_password, confirm_password) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, new_password, confirm_password }),
    })
    return await response.json()
  },

  getCurrentUser: async () => {
    const token = localStorage.getItem('token')
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    return await response.json()
  },

  updateProfile: async (updates) => {
    const token = localStorage.getItem('token')
    const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    })
    return await response.json()
  },

  logout: async () => {
    const token = localStorage.getItem('token')
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
    } catch (e) {
      /* noop */
    }
  },

  googleAuth: {
    initiate: () => {
      window.location.href = `${API_BASE_URL}/api/auth/google`
    },
    handleCallback: async (token) => {
      if (token) {
        localStorage.setItem('token', token)
        return { success: true }
      }
      return { success: false }
    },
  },
}

export const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' }
}

export const uploadFileAuth = async (file, context = '') => {
  try {
    const token = localStorage.getItem('token')
    const formData = new FormData()
    formData.append('file', file)
    if (context) formData.append('context', context)
    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('File upload error:', error)
    return { success: false, message: 'Failed to upload file. Please try again.' }
  }
}

export const sendChatMessageAuth = async (message, context = '') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ message, context }),
    })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('Chat API Error:', error)
    return {
      success: true,
      message: "I'm having trouble connecting to the server. Please try again in a moment. 🙏",
    }
  }
}

export const getProfile = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('Get Profile Error:', error)
    return { success: false, detail: 'Failed to fetch profile' }
  }
}

export const updateProfile = async (profileData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData),
    })
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    return await response.json()
  } catch (error) {
    console.error('Update Profile Error:', error)
    return { success: false, detail: 'Failed to update profile' }
  }
}

export const profileAPI = { getProfile, updateProfile }