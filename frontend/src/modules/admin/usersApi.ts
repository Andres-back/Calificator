import { api } from '@/lib/api';
import type { TeacherRequestDecision, User, UserRole, UserStatus } from '@/types/api';

export interface UserFilters {
  q?: string;
  rol?: UserRole | '';
  estado?: UserStatus | '';
  solicitud_docente_estado?: '' | 'pendiente' | 'aprobada' | 'rechazada';
  limit?: number;
  offset?: number;
}

export async function getAdminUsers(filters: UserFilters = {}): Promise<User[]> {
  const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
  const { data } = await api.get<User[]>('/admin/users', { params });
  return data;
}

export async function updateAdminUser(id: string, payload: { rol?: UserRole; estado?: UserStatus }): Promise<User> {
  const { data } = await api.patch<User>(`/admin/users/${id}`, payload);
  return data;
}

export async function resolveTeacherRequest(id: string, payload: TeacherRequestDecision): Promise<User> {
  const { data } = await api.patch<User>(`/admin/users/${id}/solicitud-docente`, payload);
  return data;
}
