import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { excludeSubmittedStudents } from '@/modules/calificaciones/submissionCandidates';
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
  MultiPageEvidencePicker: ({ disabled, onChange }: { disabled: boolean; onChange: (pages: unknown[]) => void }) => (
    <div data-testid="evidence-picker" data-disabled={String(disabled)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange([{ id: 'page-1', file: new File(['evidence'], 'evidence.jpg', { type: 'image/jpeg' }), rotation: 0 }])}
      >Añadir hoja de prueba</button>
    </div>
  ),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

function renderPanel({
  onStudentChange = vi.fn<(id: string) => void>(),
  onUploadAccepted = vi.fn<(id: string) => void>(),
  studentId = '',
}: {
  onStudentChange?: Mock<(id: string) => void>;
  onUploadAccepted?: Mock<(id: string) => void>;
  studentId?: string;
} = {}) {
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
        studentId={studentId}
        onStudentChange={onStudentChange}
        onDirtyChange={vi.fn()}
        onUploadAccepted={onUploadAccepted}
      />
    </QueryClientProvider>,
  );
  return { onStudentChange, onUploadAccepted };
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

  it('removes an accepted upload from pending candidates and clears the selection', async () => {
    const user = userEvent.setup();
    mocks.calificar.mockResolvedValue({
      evaluacion_id: 'evaluation-1', materia_id: 'subject-1', estudiante_id: 'student-1',
      resultado_json: { job_id: 'job-1' },
    });
    const { onStudentChange, onUploadAccepted } = renderPanel({ studentId: 'student-1' });

    await user.click(screen.getByRole('button', { name: 'Añadir hoja de prueba' }));
    await user.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar y enviar' }));

    expect(await screen.findByText(/Entrega de Estudiante 1 guardada/)).toBeInTheDocument();
    expect(onUploadAccepted).toHaveBeenCalledWith('student-1');
    expect(onStudentChange).toHaveBeenCalledWith('');
  });

  it('keeps the student selected when the upload fails', async () => {
    const user = userEvent.setup();
    mocks.calificar.mockRejectedValue(new Error('fallo de red'));
    const { onStudentChange, onUploadAccepted } = renderPanel({ studentId: 'student-1' });

    await user.click(screen.getByRole('button', { name: 'Añadir hoja de prueba' }));
    await user.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar y enviar' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onUploadAccepted).not.toHaveBeenCalled();
    expect(onStudentChange).not.toHaveBeenCalledWith('');
    expect(screen.getByRole('button', { name: 'Enviar a calificar' })).toBeEnabled();
  });
});

describe('excludeSubmittedStudents', () => {
  it('returns only students without an existing or newly accepted submission', () => {
    const students = [
      { id: 'student-1', nombre: 'Uno' },
      { id: 'student-2', nombre: 'Dos' },
      { id: 'student-3', nombre: 'Tres' },
    ];

    expect(excludeSubmittedStudents(students, ['student-1', 'student-3'])).toEqual([
      { id: 'student-2', nombre: 'Dos' },
    ]);
  });
});
