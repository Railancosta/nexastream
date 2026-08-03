const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

interface FetchOptions extends RequestInit {
  token?: string
}

export async function api<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  })
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`)
  }
  
  return response.json()
}

// Auth
export const auth = {
  register: (data: { email: string; password: string; username: string }) =>
    api('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    api('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: (token: string) => api('/auth/me', { token }),
}

// Videos
export const videos = {
  list: (params?: { page?: number; limit?: number; category?: string }) => {
    const query = new URLSearchParams(params as any).toString()
    return api(`/videos${query ? `?${query}` : ''}`)
  },
  get: (id: string) => api(`/videos/${id}`),
  trending: () => api('/videos/trending'),
  search: (query: string) => api(`/videos/search/${query}`),
  byChannel: (channelId: string) => api(`/videos/channel/${channelId}`),
}

// Channels
export const channels = {
  list: (params?: { page?: number; sort?: string }) => {
    const query = new URLSearchParams(params as any).toString()
    return api(`/channels${query ? `?${query}` : ''}`)
  },
  get: (handle: string) => api(`/channels/@${handle}`),
  subscribe: (id: string, token: string) =>
    api(`/channels/${id}/subscribe`, { method: 'POST', token }),
}

// Rewards
export const rewards = {
  info: () => api('/rewards/info'),
  balance: (token: string) => api('/rewards/balance', { token }),
  history: (token: string) => api('/rewards/history', { token }),
  claim: (amount: number, token: string) =>
    api('/rewards/claim', { method: 'POST', body: JSON.stringify({ amount }), token }),
  staking: () => api('/rewards/staking'),
}

// Wallet
export const wallet = {
  info: () => api('/wallet/info'),
  balance: (address: string) => api(`/wallet/balance/${address}`),
  transactions: (address: string) => api(`/wallet/transactions/${address}`),
  send: (data: { to: string; amount: number }, token: string) =>
    api('/wallet/send', { method: 'POST', body: JSON.stringify(data), token }),
}

// Stats
export const stats = {
  get: () => api('/stats'),
  live: () => api('/stats/live'),
  network: () => api('/stats/network'),
}

export default api
