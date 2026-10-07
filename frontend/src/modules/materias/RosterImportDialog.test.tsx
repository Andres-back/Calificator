import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RosterImportDialog } from './RosterImportDialog';
import { RosterManualDialog } from './RosterManualDialog';
import { useAuth } from '@/stores/auth';
import { downloadCsv } from '@/lib/csvExport';
vi.mock('@/lib/csvExport', () => ({ downloadCsv: vi.fn() }));

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), confirm: vi.fn(), manual: vi.fn() }));
vi.mock('./rosterImportApi', async (original) => ({ ...await original<typeof import('./rosterImportApi')>(), getRosterImport: mocks.get, updateRosterImport: mocks.put, confirmRosterImport: mocks.confirm, createManualRoster: mocks.manual, listExistingStudents: vi.fn().mockResolvedValue([]) }));
const row = { id: 'r1', orden: 1, nombre_detectado: 'Ana', nombre_revisado: 'Ana', confianza: 1, requiere_revision: false, duplicado_confirmado: false, decision: 'crear', estudiante_existente_id: null, advertencias: [] };
const batch = { id: 'b1', estado: 'revision', filas: [row] };
const confirmation = { creados: 1, matriculados_existentes: 0, ya_matriculados: 0, omitidos: 0, credenciales: [], credenciales_mostradas_una_vez: false };
function wrap(children: React.ReactNode) { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>{children}</QueryClientProvider>); }
beforeEach(() => {
  vi.clearAllMocks();
  useAuth.setState({ user: { id: 'teacher', permissions: ['subjects.update'] } as never, status: 'authenticated' });
  mocks.get.mockResolvedValue(batch);
  mocks.put.mockResolvedValue(batch);
  mocks.confirm.mockResolvedValue(confirmation);
});
it('recovers a lost confirmation response without repeating row writes', async () => {
  mocks.get.mockResolvedValueOnce(batch).mockResolvedValueOnce(batch).mockResolvedValue({ ...batch, estado: 'confirmado' });
  mocks.confirm.mockRejectedValueOnce(new Error('Lost response')).mockResolvedValue(confirmation);
  wrap(<RosterImportDialog open materiaId="m1" initialBatchId="b1" onClose={vi.fn()} />);
  await userEvent.setup().click(await screen.findByRole('button', { name: 'Confirmar 1 estudiantes' }));
  expect(await screen.findByText(/Las claves anteriores no se pueden recuperar/)).toBeVisible();
  expect(mocks.put).toHaveBeenCalledOnce();
  expect(mocks.confirm).toHaveBeenCalledTimes(2);
});
it('downloads newly issued photo-registration credentials without confirming or renewing again', async () => {
  mocks.confirm.mockResolvedValue({ ...confirmation, credenciales_mostradas_una_vez: true, credenciales: [{ estudiante_id: 'a', nombre: 'Ana', email: 'ana@example.test', password_temporal: 'Foto-Sintetica' }] });
  const view = wrap(<RosterImportDialog open materiaId="m1" initialBatchId="b1" onClose={vi.fn()} />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Confirmar 1 estudiantes' }));
  await user.click(await screen.findByRole('button', { name: 'Descargar accesos CSV' }));
  expect(downloadCsv).toHaveBeenCalledWith(expect.any(String), [['Nombre', 'Usuario', 'Clave temporal'], ['Ana', 'ana@example.test', 'Foto-Sintetica']]);
  expect(mocks.confirm).toHaveBeenCalledOnce();
  view.unmount();
  expect(screen.queryByText(/Foto-Sintetica/)).not.toBeInTheDocument();
});
it('shows an explicit retry when the private batch cannot be read', async () => {
  mocks.get.mockRejectedValue(new Error('Unavailable'));
  wrap(<RosterImportDialog open materiaId="m1" initialBatchId="b1" onClose={vi.fn()} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos consultar');
  expect(screen.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  expect(mocks.put).not.toHaveBeenCalled();
});
it('creates a reviewed manual batch with a stable operation id and no photo request', async () => {
  mocks.manual.mockResolvedValue(batch);
  wrap(<RosterManualDialog materiaId="m1" onClose={vi.fn()} />);
  const user = userEvent.setup();
  await user.type(screen.getByRole('textbox', { name: 'Nombres de los estudiantes' }), 'Ana\nLuis');
  await user.click(screen.getByRole('button', { name: 'Revisar lista' }));
  await waitFor(() => expect(mocks.manual).toHaveBeenCalledOnce());
  expect(mocks.manual.mock.calls[0][1]).toMatch(/^[0-9a-f-]{36}$/);
  expect(mocks.manual.mock.calls[0][2]).toHaveLength(2);
  expect(await screen.findByRole('heading', { name: 'Revisar estudiantes' })).toBeVisible();
});
