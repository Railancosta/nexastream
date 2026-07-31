const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class NexaStreamAPI {
  private token: string | null = null;
  setToken(token: string | null) { this.token = token; if (typeof window !== 'undefined') token ? localStorage.setItem('token', token) : localStorage.removeItem('token'); }
  getToken() { return this.token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null); }
  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API}${endpoint}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(this.getToken() ? { Authorization: `Bearer ${this.getToken()}` } : {}), ...options.headers }
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({ error: 'Error' })).then((j: any) => j.error));
    return res.json();
  }
  // Auth
  register = (data: any) => this.fetch<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) });
  login = (data: any) => this.fetch<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) });
  loginWithGoogle = (token: string) => this.fetch<any>('/auth/google', { method: 'POST', body: JSON.stringify({ token }) });
  logout = () => this.fetch<any>('/auth/logout', { method: 'POST' });
  getMe = () => this.fetch<any>('/auth/me');
  // Videos
  getVideos = (params?: any) => this.fetch<any>('/videos', { params });
  getTrendingVideos = () => this.fetch<any>('/videos/trending');
  getVideo = (id: string) => this.fetch<any>(`/videos/${id}`);
  createVideo = (data: any) => this.fetch<any>('/videos', { method: 'POST', body: JSON.stringify(data) });
  likeVideo = (id: string) => this.fetch<any>(`/videos/${id}/like`, { method: 'POST' });
  boostVideo = (id: string, level: number) => this.fetch<any>(`/videos/${id}/boost`, { method: 'POST', body: JSON.stringify({ level }) });
  // Channels
  getChannels = (params?: any) => this.fetch<any>('/channels', { params });
  getChannel = (id: string) => this.fetch<any>(`/channels/${id}`);
  createChannel = (data: any) => this.fetch<any>('/channels', { method: 'POST', body: JSON.stringify(data) });
  subscribe = (id: string) => this.fetch<any>(`/channels/${id}/subscribe`, { method: 'POST' });
  // Wallet
  getWallet = () => this.fetch<any>('/wallet');
  connectWallet = (address: string) => this.fetch<any>('/wallet/connect', { method: 'POST', body: JSON.stringify({ address }) });
  setUsdcAddress = (address: string) => this.fetch<any>('/wallet/set-usdc-address', { method: 'POST', body: JSON.stringify({ address }) });
  withdraw = (amount: number, currency: string) => this.fetch<any>('/wallet/withdraw', { method: 'POST', body: JSON.stringify({ amount, currency }) });
  getTransactions = (params?: any) => this.fetch<any>('/wallet/transactions', { params });
  // Payments
  getPaymentDashboard = () => this.fetch<any>('/payments/dashboard');
  // Feed
  getFeed = (type?: string) => this.fetch<any>(`/feed?type=${type || 'foryou'}`);
  // Search
  search = (q: string, type?: string) => this.fetch<any>(`/search?q=${q}${type ? `&type=${type}` : ''}`);
}
export const api = new NexaStreamAPI();
export default api;
