import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExistingStudentsDialog } from './ExistingStudentsDialog';

const mocks = vi.hoisted(() => ({
  listExistingStudents: vi.fn(),
  enrollExistingStudents: vi.fn(),
}));

vi.mock('./rosterImportApi', () => ({
  listExistingStudents: mocks.listExistingStudents,
  enrollExistingStudents: mocks.enrollExistingStudents,
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const students = [
  { id: 'student-1', nombre: 'Ana Pérez', email: 'ana@xcalificator.local', materias: ['Historia'] },
  { id: 'student-2', nombre: 'Beatriz Ruiz', email: 'beatriz@xcalificator.local', materias: ['Ciencias'] },
  { id: 'student-3', nombre: 'Carlos Díaz', email: 'carlos@xcalificator.local', materias: ['Lenguaje'] },
];

function renderDialog() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ExistingStudentsDialog open materiaId="materia-1" onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listExistingStudents.mockResolvedValue(students);
  mocks.enrollExistingStudents.mockResolvedValue({ matriculados: 0, ya_matriculados: 0 });
});

describe('ExistingStudentsDialog bulk selection', () => {
  it('selects and clears every visible student with Todos', async () => {
    const user = userEvent.setup();
    renderDialog();

    const dialog = await screen.findByRole('dialog', { name: /Agregar estudiantes existentes/i });
    const checkboxes = await within(dialog).findAllByRole('checkbox');
    const selectAll = within(dialog).getByRole('button', { name: /Seleccionar todos los estudiantes visibles/i });

    await user.click(selectAll);
    checkboxes.forEach((checkbox) => expect(checkbox).toBeChecked());
    expect(within(dialog).getByRole('button', { name: /Matricular 3/i })).toBeEnabled();

    await user.click(within(dialog).getByRole('button', { name: /Desmarcar todos los estudiantes visibles/i }));
    checkboxes.forEach((checkbox) => expect(checkbox).not.toBeChecked());
  });

  it('changes only visible results and preserves hidden selections', async () => {
    const user = userEvent.setup();
    renderDialog();

    const dialog = await screen.findByRole('dialog', { name: /Agregar estudiantes existentes/i });
    await user.click(await within(dialog).findByLabelText(/Ana Pérez/i));
    await user.type(within(dialog).getByPlaceholderText(/Buscar por nombre o usuario/i), 'Beatriz');
    await user.click(within(dialog).getByRole('button', { name: /Seleccionar todos los estudiantes visibles/i }));
    await user.clear(within(dialog).getByPlaceholderText(/Buscar por nombre o usuario/i));

    expect(within(dialog).getByLabelText(/Ana Pérez/i)).toBeChecked();
    expect(within(dialog).getByLabelText(/Beatriz Ruiz/i)).toBeChecked();
    expect(within(dialog).getByLabelText(/Carlos Díaz/i)).not.toBeChecked();
    expect(within(dialog).getByText('2 seleccionados')).toBeInTheDocument();
  });
});
