import { create } from 'zustand';
import { api, resetSessionExpiryState, setSessionExpiredHandler } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import type { User } from '@/types/api';
import { getAuthorizationContext } from '@/modules/admin/authorizationApi';

interface AuthState {
  user: User | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  fetchMe: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { nombre: string; email: string; password: string; solicitar_docente?: boolean }) => Promise<User>;
  logout: () => Promise<void>;
}

function clearAuthenticatedState() {
  useAuth.setState({ user: null, status: 'unauthenticated' });
  void queryClient.cancelQueries();
  queryClient.clear();
}

async function loadAuthenticatedUser(): Promise<User> {
  const [{ data }, authorization] = await Promise.all([
    api.get<{ user: User }>('/auth/me'),
    getAuthorizationContext(),
  ]);
  return {
    ...data.user,
    is_primary_admin: authorization.is_primary_admin,
    custom_role_id: authorization.custom_role_id,
    custom_role_name: authorization.custom_role_name,
    role_version: authorization.role_version,
    auth_version: authorization.auth_version,
    permissions: authorization.permissions,
  };
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  status: 'idle',

  fetchMe: async () => {
    set({ status: 'loading' });
    try {
      const user = await loadAuthenticatedUser();
      resetSessionExpiryState();
      set({ user, status: 'authenticated' });
    } catch {
      set({ user: null, status: 'unauthenticated' });
    }
  },

  login: async (email, password) => {
    await api.post('/auth/login', { email, password });
    // Nunca servir datos cacheados de una sesión/cuenta anterior.
    queryClient.clear();
    const user = await loadAuthenticatedUser();
    resetSessionExpiryState();
    set({ user, status: 'authenticated' });
    return user;
  },

  register: async (payload) => {
    await api.post('/auth/register', payload);
    queryClient.clear();
    const user = await loadAuthenticatedUser();
    resetSessionExpiryState();
    set({ user, status: 'authenticated' });
    return user;
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
