import { describe, expect, it } from 'vitest';
import { canUseStaffSurfaces, isStandardStudentProfile } from './authorization';
import type { User } from '@/types/api';

function profile(rol: User['rol'], customRoleId: string | null = null): User {
  return {
    id: `${rol}-1`,
    nombre: rol,
    email: `${rol}@example.test`,
    rol,
    estado: 'activo',
    custom_role_id: customRoleId,
  };
}

describe('effective access profile', () => {
  it('treats only a student without a custom role as a standard student', () => {
    expect(isStandardStudentProfile(profile('estudiante'))).toBe(true);
    expect(isStandardStudentProfile(profile('estudiante', 'role-1'))).toBe(false);
    expect(isStandardStudentProfile(profile('profesor'))).toBe(false);
    expect(isStandardStudentProfile(profile('admin'))).toBe(false);
  });

  it('reserves staff surfaces for elevated or custom profiles', () => {
    expect(canUseStaffSurfaces(profile('estudiante'))).toBe(false);
    expect(canUseStaffSurfaces(profile('estudiante', 'role-1'))).toBe(true);
    expect(canUseStaffSurfaces(profile('profesor'))).toBe(true);
    expect(canUseStaffSurfaces(profile('admin'))).toBe(true);
    expect(canUseStaffSurfaces(null)).toBe(false);
  });
});
