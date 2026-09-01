import { api } from '@/lib/api';
import type { TeacherRequestDecision, User, UserRole, UserStatus } from '@/types/api';

export interface UserFilters {
  q?: string;
  rol?: UserRole | '';
  estado?: UserStatus | '';
  solicitud_docente_estado?: '' | 'pendiente' | 'aprobada' | 'rechazada';
  limit?: number;
  offset?: number;
  custom_role_id?: string;
}

export interface AdminUserWrite {
  nombre?: string;
  email?: string;
  password?: string;
  rol?: UserRole;
  estado?: UserStatus;
  custom_role_id?: string | null;
  is_primary_admin?: boolean;
}

export interface UserDeletionImpact {
  user_id: string;
  can_hard_delete: boolean;
  action: 'delete' | 'deactivate';
  total_references: number;
  references: Record<string, number>;
}

export async function getAdminUsers(filters: UserFilters = {}): Promise<User[]> {
  const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
  const { data } = await api.get<User[]>('/admin/users', { params });
  return data;
}

export async function createAdminUser(payload: Required<Pick<AdminUserWrite, 'nombre' | 'email' | 'password'>> & AdminUserWrite): Promise<User> {
  const { data } = await api.post<User>('/admin/users', payload);
  return data;
}

export async function updateAdminUser(id: string, payload: AdminUserWrite): Promise<User> {
  const { data } = await api.patch<User>(`/admin/users/${id}`, payload);
  return data;
}

export async function getUserDeletionImpact(id: string): Promise<UserDeletionImpact> {
  const { data } = await api.get<UserDeletionImpact>('/admin/users/' + id + '/deletion-impact');
  return data;
}

export async function deleteAdminUser(id: string): Promise<void> {
  await api.delete('/admin/users/' + id);
}

export async function resolveTeacherRequest(id: string, payload: TeacherRequestDecision): Promise<User> {
  const { data } = await api.patch<User>(`/admin/users/${id}/solicitud-docente`, payload);
  return data;
}
