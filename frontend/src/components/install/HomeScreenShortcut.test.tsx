import { createRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HomeScreenShortcut } from './HomeScreenShortcut';
import { Topbar } from '@/components/layout/Topbar';
import { useAuth } from '@/stores/auth';

afterEach(() => { vi.restoreAllMocks(); document.body.style.overflow = ''; });

describe('acceso directo al inicio', () => {
  it('guía Android/iPhone, se cierra y devuelve foco sin cambiar sesión', async () => {
    const user = userEvent.setup();
    const session = useAuth.getState();
    render(<HomeScreenShortcut />);
    const trigger = screen.getByRole('button', { name: 'Añadir al inicio' });
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Añadir XCalificator al inicio' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Android' }));
    expect(screen.getByText(/Agregar a pantalla principal/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'iPhone' }));
    expect(screen.getByText(/Toca/)).toHaveTextContent('Compartir');
    expect(screen.getByText(/Requiere internet/)).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(useAuth.getState()).toBe(session);
  });
  it('no insiste cuando se usa la app en modo instalado', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    render(<HomeScreenShortcut />);
    expect(screen.queryByRole('button', { name: 'Añadir al inicio' })).not.toBeInTheDocument();
  });
  it.each(['profesor', 'estudiante', 'admin'] as const)('ofrece ayuda en el menú de %s y conserva foco al cerrarlo', async (rol) => {
    const user = userEvent.setup();
    useAuth.setState({ status: 'authenticated', user: { id: 'demo', nombre: 'Cuenta de prueba', email: 'prueba@example.test', rol, estado: 'activo', permissions: [] } });
    render(<MemoryRouter><Topbar onMenu={vi.fn()} menuButtonRef={createRef<HTMLButtonElement>()} menuExpanded={false} /></MemoryRouter>);
    const account = screen.getByRole('button', { name: 'Abrir menú de cuenta de Cuenta de prueba' });
    await user.click(account);
    await user.click(screen.getByRole('menuitem', { name: 'Añadir al inicio' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Entendido' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(account).toHaveFocus();
    expect(useAuth.getState().user?.rol).toBe(rol);
  });
});
