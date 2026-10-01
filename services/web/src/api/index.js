const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

async function ensureSession() {
  const existingToken = localStorage.getItem('daily-activity-token')
  if (existingToken) {
    return existingToken
  }

  const loginResponse = await login('alex@dailyactivity.app', 'password123')
  return loginResponse.token
}

async function request(path, options = {}, shouldRetry = true) {
  const token = await ensureSession()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })

  if (response.status === 401 && shouldRetry) {
    localStorage.removeItem('daily-activity-token')
    const loginResponse = await login('alex@dailyactivity.app', 'password123')
    localStorage.setItem('daily-activity-token', loginResponse.token)
    return request(path, { ...options, headers: { ...(options.headers || {}) } }, false)
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `Request failed: ${response.status}`)
  }

  return response.status === 204 ? null : response.json()
}

export async function login(email, password) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || 'Login failed')
  }

  const payload = await response.json()
  if (payload.token) {
    localStorage.setItem('daily-activity-token', payload.token)
  }

  return payload
}

export const api = {
  async getCurrentUser() {
    const data = await request('/api/users/me')
    return data
  },

  async getActivities() {
    const data = await request('/api/activities')
    return data.items || []
  },

  async getActivitySummary() {
    const data = await request('/api/activity-summary')
    return data
  },

  async createActivity(payload) {
    const data = await request('/api/activities', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return data
  },

  async updateActivity(id, payload) {
    const data = await request(`/api/activities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    return data
  },

  async updateActivityStatus(id, status) {
    const data = await request(`/api/activities/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    return data
  },
}

export default api
