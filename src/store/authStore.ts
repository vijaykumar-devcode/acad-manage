import { create } from 'zustand';
import type { User } from '../types';
import api from '../services/api';

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: 'Admin' | 'Faculty' | 'Student';
  department: string;
  rollNo?: string;
  semester?: string;
  section?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (userData: LoginPayload) => Promise<void>;
  register: (userData: RegisterPayload) => Promise<{ pending: boolean; message?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

let authPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitializing: true,
  login: async (userData: any) => {
    try {
      const response = await api.post('/auth/login', userData);
      if (response.data.success) {
        set({ user: response.data.data, isAuthenticated: true });
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },
  register: async (userData: any) => {
    try {
      const response = await api.post('/auth/register', userData);
      if (response.data.success) {
        if (response.data.pending) {
          // Faculty account created but pending Admin approval — do NOT log them in.
          return { pending: true, message: response.data.message };
        }
        set({ user: response.data.data, isAuthenticated: true });
        return { pending: false };
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error(err);
    } finally {
      set({ user: null, isAuthenticated: false });
      window.location.href = '/login';
    }
  },
  checkAuth: async () => {
    if (authPromise) return authPromise;

    authPromise = (async () => {
      set({ isInitializing: true });
      try {
        const response = await api.get('/auth/me', {
          validateStatus: (status) => status < 500
        });
        if (response.status === 200 && response.data.success) {
          set({ user: response.data.data, isAuthenticated: true, isInitializing: false });
        } else {
          set({ user: null, isAuthenticated: false, isInitializing: false });
        }
      } catch (error: any) {
        if (error.response?.status === 429) {
          set({ isInitializing: false });
        } else {
          set({ user: null, isAuthenticated: false, isInitializing: false });
        }
      } finally {
        authPromise = null;
      }
    })();
    return authPromise;
  },
}));
