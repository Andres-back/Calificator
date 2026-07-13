import { create } from 'zustand';
import { api, resetSessionExpiryState, setSessionExpiredHandler } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import type { User } from '@/types/api';

interface AuthState {
  user: User | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  fetchMe: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { nombre: string; email: string; password: string; rol: string }) => Promise<User>;
  logout: () => Promise<void>;
}

function clearAuthenticatedState() {
  useAuth.setState({ user: null, status: 'unauthenticated' });
  void queryClient.cancelQueries();
  queryClient.clear();
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  status: 'idle',

  fetchMe: async () => {
    set({ status: 'loading' });
    try {
      const { data } = await api.get<{ user: User }>('/auth/me');
      resetSessionExpiryState();
      set({ user: data.user, status: 'authenticated' });
    } catch {
      set({ user: null, status: 'unauthenticated' });
    }
  },

  login: async (email, password) => {
    await api.post('/auth/login', { email, password });
    // Nunca servir datos cacheados de una sesión/cuenta anterior.
    queryClient.clear();
    const { data } = await api.get<{ user: User }>('/auth/me');
    resetSessionExpiryState();
    set({ user: data.user, status: 'authenticated' });
    return data.user;
  },

  register: async (payload) => {
    await api.post('/auth/register', payload);
    queryClient.clear();
    const { data } = await api.get<{ user: User }>('/auth/me');
    resetSessionExpiryState();
    set({ user: data.user, status: 'authenticated' });
    return data.user;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      clearAuthenticatedState();
    }
  },
}));

// Axios cannot import the store without creating a cycle. The callback keeps
// the transport layer independent while ensuring a failed refresh clears data.
setSessionExpiredHandler(clearAuthenticatedState);