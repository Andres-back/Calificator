import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RosterImportDialog } from './RosterImportDialog';
import { rosterImportError } from './rosterImportErrors';
import { useAuth } from '@/stores/auth';

const mocks = vi.hoisted(() => ({ create: vi.fn(), get: vi.fn(), list: vi.fn(), existing: vi.fn() }));
vi.mock('./rosterImportApi', async (original) => ({
  ...await original<typeof import('./rosterImportApi')>(),
  createRosterImport: mocks.create, getRosterImport: mocks.get, listRosterImports: mocks.list, listExistingStudents: mocks.existing,
}));

function open() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <RosterImportDialog open materiaId="m1" onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.setState({ user: { id: 'teacher', permissions: ['subjects.update'] } as never, status: 'authenticated' });
  mocks.list.mockResolvedValue([]);
  mocks.existing.mockResolvedValue([]);
  mocks.create.mockResolvedValue({ id: 'b1', job_id: 'j1', estado: 'procesando' });
  mocks.get.mockResolvedValue({ id: 'b1', estado: 'procesando', filas: [] });
});

describe('202 lista de estudiantes desde foto o archivo', () => {
  it('ofrece la cámara y, aparte, elegir una foto de la galería o un archivo', async () => {
    open();

    expect(await screen.findByRole('dialog', { name: 'Importar estudiantes desde una foto o un archivo' })).toBeInTheDocument();
    const camera = screen.getByLabelText('Tomar una foto de la lista');
    expect(camera).toHaveAttribute('capture', 'environment');
    const picker = screen.getByLabelText('Elegir una foto o un archivo con la lista');
    // Sin «capture»: en el celular abre la galería y los archivos, no obliga a usar la cámara.
    expect(picker).not.toHaveAttribute('capture');
    for (const kind of ['image/jpeg', '.pdf', '.docx', '.xlsx', '.csv', '.txt']) expect(picker.getAttribute('accept')).toContain(kind);
    expect(screen.getByText(/Excel, Word, PDF o CSV/)).toBeInTheDocument();
  });

  it('envía el archivo elegido, también si es una hoja de cálculo', async () => {
    open();
    const sheet = new File(['x'], 'lista.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    await userEvent.upload(await screen.findByLabelText('Elegir una foto o un archivo con la lista'), sheet);

    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith('m1', sheet));
  });

  it('explica qué revisar cuando no se encuentran nombres, sea foto o archivo', () => {
    const error = rosterImportError('no_names');
    expect(error.title).toBe('No encontramos nombres en la lista.');
    expect(error.detail).toContain('buena luz');
    expect(error.detail).toContain('una columna con los nombres');
  });
});
