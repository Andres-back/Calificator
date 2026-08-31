import { api } from '@/lib/api';

export interface PermissionItem {
  key: string;
  module: string;
  action: string;
  label: string;
  description: string;
  risk: 'normal' | 'sensitive' | 'critical' | string;
  sort_order: number;
  dependencies: string[];
}

export interface PermissionModule {
  module: string;
  label: string;
  permissions: PermissionItem[];
}

export interface AuthorizationRole {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  is_system: boolean;
  version: number;
  permission_keys: string[];
  assigned_users: number;
  created_at: string;
  updated_at: string;
}

export interface AuthorizationRoleWrite {
  name: string;
  description?: string | null;
  active: boolean;
  permission_keys: string[];
  expected_version: number;
}

export interface AuthorizationContext {
  profile: string;
  is_primary_admin: boolean;
  custom_role_id: string | null;
  custom_role_name: string | null;
  role_version: number | null;
  auth_version: number;
  permissions: string[];
}

export interface AuthorizationAuditEvent {
  id: string;
  actor_id: string | null;
  event: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function getAuthorizationContext(): Promise<AuthorizationContext> {
  const { data } = await api.get<AuthorizationContext>('/users/me/authorization');
  return data;
}

export async function getPermissionModules(): Promise<PermissionModule[]> {
  const { data } = await api.get<PermissionModule[]>('/admin/authorization/modules');
  return data;
}

export async function getAuthorizationRoles(includeArchived = false): Promise<AuthorizationRole[]> {
  const { data } = await api.get<AuthorizationRole[]>('/admin/roles', { params: { include_archived: includeArchived } });
  return data;
}

export async function createAuthorizationRole(payload: AuthorizationRoleWrite): Promise<AuthorizationRole> {
  const { data } = await api.post<AuthorizationRole>('/admin/roles', payload);
  return data;
}

export async function updateAuthorizationRole(id: string, payload: AuthorizationRoleWrite): Promise<AuthorizationRole> {
  const { data } = await api.patch<AuthorizationRole>('/admin/roles/' + id, payload);
  return data;
}

export async function duplicateAuthorizationRole(id: string): Promise<AuthorizationRole> {
  const { data } = await api.post<AuthorizationRole>('/admin/roles/' + id + '/duplicate');
  return data;
}

export async function deleteAuthorizationRole(id: string): Promise<void> {
  await api.delete('/admin/roles/' + id);
}

export async function getAuthorizationAudit(entityType?: string, entityId?: string): Promise<AuthorizationAuditEvent[]> {
  const { data } = await api.get<AuthorizationAuditEvent[]>('/admin/authorization/audit', {
    params: { entity_type: entityType, entity_id: entityId, limit: 100 },
  });
  return data;
}
