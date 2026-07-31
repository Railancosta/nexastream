/**
 * NexaStream API Client
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

type FetchOptions = RequestInit & {
  params?: Record<string, string | number | boolean>;
};

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  private async fetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options;
    
    let url = `${API_BASE}${endpoint}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      url += `?${searchParams.toString()}`;
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    const token = this.getToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || error.message || 'Request failed');
    }

    return response.json();
  }

  async register(data: { email: string; password: string; name: string; username: string }) {
    return this.fetch<any>('/v1/auth/register', { method: 'POST', body: JSON.stringify(data) });
  }

  async login(data: { email: string; password: string }) {
    return this.fetch<any>('/v1/auth/login', { method: 'POST', body: JSON.stringify(data) });
  }

  async loginWithGoogle(token: string) {
    return this.fetch<any>('/v1/auth/google', { method: 'POST', body: JSON.stringify({ token }) });
  }

  async getMe() {
    return this.fetch<any>('/v1/auth/me');
  }

  async logout() {
    return this.fetch<any>('/v1/auth/logout', { method: 'POST' });
  }

  async getVideos(params?: { page?: number; limit?: number; category?: string; sort?: string }) {
    return this.fetch<any>('/v1/videos', { params: params as any });
  }

  async getTrendingVideos() {
    return this.fetch<any>('/v1/videos/trending');
  }

  async getVideo(id: string) {
    return this.fetch<any>(`/v1/videos/${id}`);
  }

  async getChannels(params?: { page?: number; limit?: number; category?: string; sort?: string }) {
    return this.fetch<any>('/v1/channels', { params: params as any });
  }

  async getChannel(id: string) {
    return this.fetch<any>(`/v1/channels/${id}`);
  }

  async getChannelVideos(id: string, params?: { page?: number; limit?: number }) {
    return this.fetch<any>(`/v1/channels/${id}/videos`, { params: params as any });
  }

  async createChannel(data: { name: string; description?: string; category?: string }) {
    return this.fetch<any>('/v1/channels', { method: 'POST', body: JSON.stringify(data) });
  }

  async subscribeToChannel(id: string) {
    return this.fetch<any>(`/v1/channels/${id}/subscribe`, { method: 'POST' });
  }

  async getWallet() {
    return this.fetch<any>('/v1/wallet');
  }

  async connectWallet(address: string) {
    return this.fetch<any>('/v1/wallet/connect', { method: 'POST', body: JSON.stringify({ address }) });
  }

  async setUsdcAddress(address: string) {
    return this.fetch<any>('/v1/wallet/set-usdc-address', { method: 'POST', body: JSON.stringify({ address }) });
  }

  async withdraw(amount: number, currency: 'USDC' | 'ETH') {
    return this.fetch<any>('/v1/wallet/withdraw', { method: 'POST', body: JSON.stringify({ amount, currency }) });
  }
}

export const api = new ApiClient();
export default api;
