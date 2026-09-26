import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';
import { useAuth } from '@/stores/auth';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useAuth.setState({ user: null, status: 'unauthenticated' });
});

describe('LoginPage', () => {
  it('offers a single, unambiguous password recovery action', () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    const recoveryLinks = screen.getAllByRole('link').filter((link) => link.getAttribute('href') === '/recuperar-contrasena');
    expect(recoveryLinks).toHaveLength(1);
    expect(recoveryLinks[0]).toHaveAccessibleName('¿Olvidaste tu contraseña?');
  });
});
