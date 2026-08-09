import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './AppShell';
import { useAuth } from '@/stores/auth';

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