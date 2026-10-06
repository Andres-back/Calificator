import { api } from '@/lib/api';
import type { User } from '@/types/api';

export interface ProfileUpdate {
  nombre?: string;
  email?: string;
  password?: string;
  current_password?: string;
}
export async function updateMyProfile(payload: ProfileUpdate) {
  const { data } = await api.patch<User>('/users/me', payload);
  return data;
}
