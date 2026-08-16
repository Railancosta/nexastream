// NexaStream API Client v2.0
// Complete API integration for all features

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class NexaStreamAPI {
  constructor() {
    this.token = typeof window !== 'undefined' ? localStorage.getItem('nexastream_token') : null;
  }

  setToken(token) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexastream_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nexastream_token');
    }
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // ============ AUTH ============
  async register(username, email, password, displayName) {
    const data = await this.request('/users/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, displayName }),
    });
    if (data.token) this.setToken(data.token);
    return data;
  }

  async login(email, password) {
    const data = await this.request('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) this.setToken(data.token);
    return data;
  }

  async logout() {
    this.clearToken();
  }

  async getProfile() {
    return this.request('/users/profile');
  }

  async updateProfile(data) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async changePassword(currentPassword, newPassword) {
    return this.request('/users/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // ============ VIDEOS ============
  async getVideos(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/videos${query ? `?${query}` : ''}`);
  }

  async getTrendingVideos() {
    return this.request('/videos/trending');
  }

  async getLiveVideos() {
    return this.request('/videos/live');
  }

  async getShorts(page = 1) {
    return this.request(`/videos/shorts?page=${page}`);
  }

  async getVideo(id) {
    return this.request(`/videos/${id}`);
  }

  async createVideo(data) {
    return this.request('/videos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateVideo(id, data) {
    return this.request(`/videos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteVideo(id) {
    return this.request(`/videos/${id}`, {
      method: 'DELETE',
    });
  }

  async likeVideo(id) {
    return this.request(`/videos/${id}/like`, { method: 'POST' });
  }

  async getComments(videoId, page = 1) {
    return this.request(`/videos/${videoId}/comments?page=${page}`);
  }

  async addComment(videoId, content, parentId = null) {
    return this.request(`/videos/${videoId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parentId }),
    });
  }

  async getCategories() {
    return this.request('/videos/meta/categories');
  }

  async getRecommendations(videoId) {
    return this.request(`/videos/${videoId}/recommendations`);
  }

  // ============ CHANNELS ============
  async getChannels(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/channels${query ? `?${query}` : ''}`);
  }

  async getTrendingChannels() {
    return this.request('/channels/trending');
  }

  async getChannel(username) {
    return this.request(`/channels/@${username}`);
  }

  async getChannelVideos(channelId, params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/channels/${channelId}/videos${query ? `?${query}` : ''}`);
  }

  async createChannel(data) {
    return this.request('/channels', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateChannel(id, data) {
    return this.request(`/channels/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async subscribe(channelId) {
    return this.request(`/channels/${channelId}/subscribe`, { method: 'POST' });
  }

  async getChannelStats(channelId) {
    return this.request(`/channels/${channelId}/stats`);
  }

  // ============ PAYMENTS ============
  async getBalance() {
    return this.request('/payments/balance');
  }

  async getTransactions(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/payments/transactions${query ? `?${query}` : ''}`);
  }

  async deposit(amount, txHash, fromAddress) {
    return this.request('/payments/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount, txHash, fromAddress }),
    });
  }

  async withdraw(toAddress, amount) {
    return this.request('/payments/withdraw', {
      method: 'POST',
      body: JSON.stringify({ toAddress, amount }),
    });
  }

  async tipCreator(channelId, amount, videoId = null) {
    return this.request('/payments/tip', {
      method: 'POST',
      body: JSON.stringify({ channelId, amount, videoId }),
    });
  }

  async subscribeChannel(channelId, tier = 1, billingCycle = 'monthly') {
    return this.request('/payments/subscribe', {
      method: 'POST',
      body: JSON.stringify({ channelId, tier, billingCycle }),
    });
  }

  async getRewardsStats() {
    return this.request('/payments/rewards/stats');
  }

  async getRewardsLeaderboard() {
    return this.request('/payments/rewards/leaderboard');
  }

  // ============ STREAMING ============
  async createLivestream(data) {
    return this.request('/streaming/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getLivestream(id) {
    return this.request(`/streaming/${id}`);
  }

  async endLivestream(id) {
    return this.request(`/streaming/${id}/end`, { method: 'POST' });
  }

  async updateStreamStats(id, viewers, likes) {
    return this.request(`/streaming/${id}/stats`, {
      method: 'POST',
      body: JSON.stringify({ viewers, likes }),
    });
  }

  async getLiveStreams() {
    return this.request('/streaming');
  }

  async sendChatMessage(streamId, content, type = 'message') {
    return this.request(`/streaming/${streamId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ content, type }),
    });
  }

  async getChatMessages(streamId, since = null) {
    const query = since ? `?since=${since}` : '';
    return this.request(`/streaming/${streamId}/chat${query}`);
  }

  async scheduleStream(data) {
    return this.request('/streaming/schedule', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ============ NFT ============
  async getNFTs(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/nft${query ? `?${query}` : ''}`);
  }

  async getFeaturedNFTs() {
    return this.request('/nft/featured');
  }

  async getNFT(id) {
    return this.request(`/nft/${id}`);
  }

  async mintNFT(data) {
    return this.request('/nft/mint', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listNFTForSale(id, price) {
    return this.request(`/nft/${id}/list`, {
      method: 'POST',
      body: JSON.stringify({ price }),
    });
  }

  async buyNFT(id) {
    return this.request(`/nft/${id}/buy`, { method: 'POST' });
  }

  async getOwnedNFTs(userId) {
    return this.request(`/nft/user/${userId}/owned`);
  }

  async getCreatedNFTs(userId) {
    return this.request(`/nft/user/${userId}/created`);
  }

  async likeNFT(id) {
    return this.request(`/nft/${id}/like`, { method: 'POST' });
  }

  // ============ ANALYTICS ============
  async getPlatformStats() {
    return this.request('/analytics/platform');
  }

  async getChannelAnalytics(channelId) {
    return this.request(`/analytics/channel/${channelId}`);
  }

  async getVideoAnalytics(videoId) {
    return this.request(`/analytics/video/${videoId}`);
  }

  async getRealtimeStats() {
    return this.request('/analytics/realtime');
  }

  async getEarnings(period = '30d') {
    return this.request(`/analytics/earnings?period=${period}`);
  }

  async getTrending(period = '24h') {
    return this.request(`/analytics/trending?period=${period}`);
  }

  // ============ NOTIFICATIONS ============
  async getNotifications(page = 1) {
    return this.request(`/users/notifications/list?page=${page}`);
  }

  async markNotificationRead(id) {
    return this.request(`/users/notifications/${id}/read`, { method: 'PUT' });
  }

  async markAllNotificationsRead() {
    return this.request('/users/notifications/read-all', { method: 'PUT' });
  }

  // ============ UPLOAD ============
  async uploadFile(file, onProgress = () => {}) {
    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/upload`);

    if (this.token) {
      xhr.setRequestHeader('Authorization', `Bearer ${this.token}`);
    }

    return new Promise((resolve, reject) => {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress((e.loaded / e.total) * 100);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error('Upload failed'));
        }
      };

      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.send(formData);
    });
  }
}

export const api = new NexaStreamAPI();
export default api;
