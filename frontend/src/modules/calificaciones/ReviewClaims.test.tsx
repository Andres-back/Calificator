import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import { IncidenciasSection } from './CalificacionesWorkspace';
import { listarIncidencias } from './api';

vi.mock('./api', async (original) => ({ ...await original<typeof import('./api')>(), listarIncidencias: vi.fn() }));
beforeEach(() => { vi.mocked(listarIncidencias).mockReset(); });
function show(active = false) {
  const toggle = vi.fn();
  const dirty = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(<QueryClientProvider client={client}><IncidenciasSection calificacionId="grade-claims" active={active} onToggle={toggle} onDirtyChange={dirty} /></QueryClientProvider>);
  return { toggle, dirty };
}

it('oculta el panel vacío pero conserva el alta accesible en opciones', async () => {
  vi.mocked(listarIncidencias).mockResolvedValue([]);
  const { toggle, dirty } = show();
  await userEvent.click(await screen.findByText('Opciones de reclamos'));
  expect(screen.queryByRole('button', { name: /Quejas y reclamos/ })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Registrar reclamo' }));
  expect(toggle).toHaveBeenCalledOnce();
  expect(await screen.findByLabelText('Descripción')).toBeVisible();
  await waitFor(() => expect(dirty).toHaveBeenLastCalledWith(true));
});

it('mantiene consultables los resueltos sin presentarlos como abiertos', async () => {
  vi.mocked(listarIncidencias).mockResolvedValue([{ id: 'claim-1', estado: 'resuelta', tipo: 'docente_rechazo', descripcion: 'Revisión atendida', created_at: '2026-10-14T00:00:00Z' }] as Awaited<ReturnType<typeof listarIncidencias>>);
  show();
  const control = await screen.findByRole('button', { name: /Quejas y reclamos \(1\)/ });
  expect(control).not.toHaveTextContent('abierto');
  expect(control).toHaveAttribute('aria-expanded', 'false');
});

it('no confunde un error de consulta con ausencia de reclamos', async () => {
  vi.mocked(listarIncidencias).mockRejectedValue(new Error('unavailable'));
  show(true);
  expect(await screen.findByText('No pudimos consultar los reclamos.')).toBeVisible();
  expect(screen.getByRole('button', { name: 'Reintentar consulta' })).toBeVisible();
  expect(screen.queryByText('Opciones de reclamos')).not.toBeInTheDocument();
});
