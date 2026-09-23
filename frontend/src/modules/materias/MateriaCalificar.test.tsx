import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GradingUploadPanel } from './MateriaCalificar';

const mocks = vi.hoisted(() => ({
  calificar: vi.fn(),
  invalidateQueries: vi.fn(),
}));

vi.mock('@/modules/calificaciones/api', () => ({ calificarFoto: mocks.calificar }));
vi.mock('@/lib/queryClient', () => ({
  queryClient: { invalidateQueries: mocks.invalidateQueries },
}));
vi.mock('@/components/evidence/MultiPageEvidencePicker', () => ({
  MultiPageEvidencePicker: ({ disabled }: { disabled: boolean }) => (
    <div data-testid="evidence-picker" data-disabled={String(disabled)} />
  ),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

function renderPanel(onStudentChange = vi.fn()) {
  const students = Array.from({ length: 24 }, (_, index) => ({
    id: `student-${index + 1}`,
    nombre: index === 19 ? 'Ángela Zambrano' : `Estudiante ${index + 1}`,
  }));
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <GradingUploadPanel
        evaluationId="evaluation-1"
        students={students}
        studentId=""
        onStudentChange={onStudentChange}
        onDirtyChange={vi.fn()}
      />
    </QueryClientProvider>,
  );
  return { onStudentChange };
}

beforeEach(() => vi.clearAllMocks());

describe('GradingUploadPanel student picker', () => {
  it('filters a long roster ignoring accents and selects with a touch-sized control', async () => {
    const user = userEvent.setup();
    const { onStudentChange } = renderPanel();

    const search = screen.getByRole('combobox', { name: /buscar estudiante/i });
    await user.type(search, 'angela');

    expect(screen.queryByText('Estudiante 1')).not.toBeInTheDocument();
    const option = screen.getByRole('option', { name: 'Ángela Zambrano' });
    expect(option).toHaveClass('min-h-11');
    await user.click(option);

    expect(onStudentChange).toHaveBeenCalledWith('student-20');
  });

  it('shows a clear empty state instead of an unusable select', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.type(
      screen.getByRole('combobox', { name: /buscar estudiante/i }),
      'nombre inexistente',
    );

    expect(screen.getByText('No encontramos estudiantes con ese nombre.')).toBeInTheDocument();
  });
});
