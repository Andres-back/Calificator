import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './AppShell';
import { useAuth } from '@/stores/auth';
import { api } from '@/lib/api';

function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/app']}>
      <Routes>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<div>Inicio docente</div>} />
          <Route path="materias" element={<div>Materias docente</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.spyOn(api, 'post').mockResolvedValue({ data: { status: 'ok' } });
  useAuth.setState({
    user: {
      id: 'profesor-mobile',
      nombre: 'Docente Mobile',
      email: 'docente.mobile@example.com',
      rol: 'profesor',
      estado: 'activo',
    },
    status: 'authenticated',
  });
});

afterEach(() => {
  document.body.style.overflow = '';
  vi.restoreAllMocks();
});

describe('AppShell mobile navigation', () => {
  it('removes the drawer and touch-blocking backdrop immediately after navigation', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole('button', { name: 'Abrir menú principal' }));
    const mobileDialog = screen.getByRole('dialog', { name: 'Navegación principal' });
    expect(mobileDialog).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');

    await user.click(within(mobileDialog).getByRole('link', { name: 'Materias' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Navegación principal' })).not.toBeInTheDocument();
      expect(document.body.style.overflow).toBe('');
    });
    expect(screen.getByText('Materias docente')).toBeInTheDocument();
    expect(document.querySelector('[inert]')).toBeNull();
  });
});

describe('AppShell analytics', () => {
  it('emits once per authenticated path and ignores unrelated rerenders', async () => {
    const post = vi.mocked(api.post);
    const user = userEvent.setup();
    renderShell();

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post).toHaveBeenLastCalledWith('/analytics/evento', {
      tipo: 'session_view_opened',
      metadata_json: { surface: 'inicio' },
    });

    await user.click(screen.getByRole('button', { name: 'Abrir menú principal' }));
    expect(post).toHaveBeenCalledTimes(1);
    const mobileDialog = screen.getByRole('dialog', { name: 'Navegación principal' });
    await user.click(within(mobileDialog).getByRole('link', { name: 'Materias' }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(2));
    expect(post).toHaveBeenLastCalledWith('/analytics/evento', {
      tipo: 'session_view_opened',
      metadata_json: { surface: 'materias' },
    });
  });
});


describe('AppShell ambientación', () => {
  it('mantiene la ilustración fuera de la interacción y el contenido por encima', () => {
    const { container } = renderShell();
    const atmosphere = container.querySelector('.app-atmosphere');
    const content = container.querySelector('main#main-content > .relative');

    expect(atmosphere).toHaveAttribute('aria-hidden', 'true');
    expect(atmosphere?.querySelector('img')).toHaveAttribute('src', '/branding/learning-atmosphere-v2.webp');
    expect(content).not.toHaveClass('z-[1]');
    expect(content).toHaveTextContent('Inicio docente');
  });
});
