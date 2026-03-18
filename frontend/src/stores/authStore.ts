import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/user';
import { apiClient } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiClient.post<{
            data: { access_token: string; refresh_token: string; user: User };
          }>('/auth/login', { email, password });

          const { access_token, refresh_token, user } = response.data;
          apiClient.setTokens(access_token, refresh_token);
          connectSocket(access_token);

          set({ user, isAuthenticated: true, isLoading: false });
        } catch (err: unknown) {
          const message =
            err && typeof err === 'object' && 'message' in err
              ? String((err as { message: string }).message)
              : 'Login failed. Please check your credentials.';
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      register: async (email, password, name) => {
        set({ isLoading: true, error: null });
        try {
          await apiClient.post('/auth/register', { email, password, name });
          set({ isLoading: false });
        } catch (err: unknown) {
          const message =
            err && typeof err === 'object' && 'message' in err
              ? String((err as { message: string }).message)
              : 'Registration failed. Please try again.';
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      logout: () => {
        apiClient.clearTokens();
        disconnectSocket();
        set({ user: null, isAuthenticated: false, error: null });
      },

      clearError: () => set({ error: null }),

      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
