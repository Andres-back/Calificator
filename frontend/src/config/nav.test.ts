import { describe, expect, it } from 'vitest';
import { adminNav, visibleNavigationItems } from './nav';

describe('administrative illustrated navigation', () => {
  it('keeps all administrative entries illustrated without changing permission filtering', () => {
    expect(adminNav.every((item) => item.brandIcon)).toBe(true);
    expect(visibleNavigationItems(adminNav, new Set()).map((item) => item.to)).toEqual(['/app']);
    const usersOnly = visibleNavigationItems(adminNav, new Set(['users.read']));
    expect(usersOnly.map((item) => item.to)).toEqual(['/app', '/app/admin/usuarios']);
    expect(usersOnly[1].brandIcon).toBe('admin-users');
    expect(adminNav.find((item) => item.to === '/app/admin/roles')?.brandIcon).toBe('admin-roles');
    expect(adminNav.find((item) => item.to === '/app/admin/correo')?.brandIcon).toBe('admin-mail');
  });
});
