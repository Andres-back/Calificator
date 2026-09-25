import type { User } from '@/types/api';

type AccessProfile = Pick<User, 'rol' | 'custom_role_id'>;

export function isStandardStudentProfile(user: AccessProfile | null | undefined): boolean {
  return user?.rol === 'estudiante' && !user.custom_role_id;
}

export function canUseStaffSurfaces(user: AccessProfile | null | undefined): boolean {
  return Boolean(user) && !isStandardStudentProfile(user);
}
