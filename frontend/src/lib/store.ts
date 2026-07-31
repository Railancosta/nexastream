import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from './api';
interface User { id: string; email: string; name: string; username: string; avatarUrl?: string; channel?: any; }
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; username: string }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}
export const useAuth = create<AuthState>()(persist((set, get) => ({
  user: null, token: null, isAuthenticated: false, isLoading: false, error: null,
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.login({ email, password });
      api.setToken(res.accessToken);
      set({ user: res.user, token: res.accessToken, isAuthenticated: true, isLoading: false });
    } catch (e: any) { set({ error: e.message, isLoading: false }); throw e; }
  },
  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.register(data);
      api.setToken(res.accessToken);
      set({ user: res.user, token: res.accessToken, isAuthenticated: true, isLoading: false });
    } catch (e: any) { set({ error: e.message, isLoading: false }); throw e; }
  },
  logout: async () => { try { await api.logout(); } catch {} api.setToken(null); set({ user: null, token: null, isAuthenticated: false }); },
  checkAuth: async () => {
    const token = api.getToken();
    if (!token) return set({ isAuthenticated: false });
    try {
      const res = await api.getMe();
      set({ user: res.user, isAuthenticated: true });
    } catch { api.setToken(null); set({ user: null, isAuthenticated: false }); }
  }
}), { name: 'nexastream-auth', partialize: (s) => ({ token: s.token, user: s.user, isAuthenticated: s.isAuthenticated }) }));
