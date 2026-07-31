/**
 * NexaStream Global Store
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  avatarUrl?: string;
  channel?: any;
}

interface Wallet {
  address: string;
  balanceUsdc: number;
  balanceEth: number;
  usdcPaymentAddress: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; username: string }) => Promise<void>;
  loginWithGoogle: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.login({ email, password });
          api.setToken(response.accessToken);
          set({ 
            user: response.user, 
            token: response.accessToken, 
            isAuthenticated: true, 
            isLoading: false 
          });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.register(data);
          api.setToken(response.accessToken);
          set({ 
            user: response.user, 
            token: response.accessToken, 
            isAuthenticated: true, 
            isLoading: false 
          });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      loginWithGoogle: async (token) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.loginWithGoogle(token);
          api.setToken(response.accessToken);
          set({ 
            user: response.user, 
            token: response.accessToken, 
            isAuthenticated: true, 
            isLoading: false 
          });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await api.logout();
        } catch {
          // Ignore logout errors
        }
        api.setToken(null);
        set({ user: null, token: null, isAuthenticated: false });
      },

      checkAuth: async () => {
        const token = api.getToken();
        if (!token) {
          set({ isAuthenticated: false });
          return;
        }
        
        try {
          const response = await api.getMe();
          set({ 
            user: response.user, 
            isAuthenticated: true 
          });
        } catch {
          api.setToken(null);
          set({ user: null, isAuthenticated: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'nexastream-auth',
      partialize: (state) => ({ 
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

interface WalletState {
  wallet: Wallet | null;
  isLoading: boolean;
  
  fetchWallet: () => Promise<void>;
  connectWallet: (address: string) => Promise<void>;
  setUsdcAddress: (address: string) => Promise<void>;
  withdraw: (amount: number, currency: 'USDC' | 'ETH') => Promise<void>;
}

export const useWalletStore = create<WalletState>((set) => ({
  wallet: null,
  isLoading: false,

  fetchWallet: async () => {
    set({ isLoading: true });
    try {
      const response = await api.getWallet();
      set({ wallet: response.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  connectWallet: async (address) => {
    set({ isLoading: true });
    try {
      await api.connectWallet(address);
      await api.getWallet().then(res => {
        set({ wallet: res.data, isLoading: false });
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  setUsdcAddress: async (address) => {
    set({ isLoading: true });
    try {
      await api.setUsdcAddress(address);
      await api.getWallet().then(res => {
        set({ wallet: res.data, isLoading: false });
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  withdraw: async (amount, currency) => {
    set({ isLoading: true });
    try {
      await api.withdraw(amount, currency);
      await api.getWallet().then(res => {
        set({ wallet: res.data, isLoading: false });
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
}));

interface FeedState {
  algorithm: {
    trending: number;
    merit: number;
    social: number;
  };
  setAlgorithm: (weights: { trending?: number; merit?: number; social?: number }) => void;
}

export const useFeedStore = create<FeedState>((set) => ({
  algorithm: {
    trending: 33,
    merit: 33,
    social: 34,
  },
  setAlgorithm: (weights) => set((state) => ({
    algorithm: { ...state.algorithm, ...weights }
  })),
}));
