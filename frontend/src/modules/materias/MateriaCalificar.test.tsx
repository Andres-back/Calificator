import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { excludeSubmittedStudents, summarizeCaptureRegistration } from '@/modules/calificaciones/submissionCandidates';
import { GradingUploadPanel } from './MateriaCalificar';
import type { EvidencePage } from '@/components/evidence/evidencePayload';

const mocks = vi.hoisted(() => ({
  calificar: vi.fn(),
  invalidateQueries: vi.fn(),
  pages: [] as EvidencePage[],
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
        onClick={() => onChange(mocks.pages)}
      >Añadir hoja de prueba</button>
    </div>
  ),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

function renderPanel({
  onStudentChange = vi.fn<(id: string) => void>(),
  onUploadAccepted = vi.fn<(id: string, name: string) => void>(),
  onDirtyChange = vi.fn<(dirty: boolean) => void>(),
  eligibilityVerified = true,
  studentId = '',
  progress,
  suggestNextStudent = false,
  students: suppliedStudents,
}: {
  onStudentChange?: Mock<(id: string) => void>;
  onUploadAccepted?: Mock<(id: string, name: string) => void>;
  onDirtyChange?: Mock<(dirty: boolean) => void>;
  eligibilityVerified?: boolean;
  studentId?: string;
  progress?: { total: number; registered: number };
  suggestNextStudent?: boolean;
  students?: { id: string; nombre: string }[];
} = {}) {
  const students = suppliedStudents ?? Array.from({ length: 24 }, (_, index) => ({
    id: `student-${index + 1}`,
    nombre: index === 19 ? 'Ángela Zambrano' : `Estudiante ${index + 1}`,
  }));
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={client}>
      <GradingUploadPanel
        evaluationId="evaluation-1"
        evaluationName="Multiplicación"
        materiaName="Matemáticas"
        eligibilityVerified={eligibilityVerified}
        students={students}
        studentId={studentId}
        progress={progress}
        suggestNextStudent={suggestNextStudent}
        onStudentChange={onStudentChange}
        onDirtyChange={onDirtyChange}
        onUploadAccepted={onUploadAccepted}
      />
    </QueryClientProvider>,
  );
  return { onStudentChange, onUploadAccepted, onDirtyChange, unmount: view.unmount };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pages = [{ id: 'page-1', file: new File(['evidence'], 'evidence.jpg', { type: 'image/jpeg' }), rotation: 0, quality: { status: 'good', warnings: [], width: 800, height: 1000 } }];
});

describe('GradingUploadPanel student picker', () => {
  it('095 progreso cuenta IDs del grupo una vez y no confunde registro con nota final', () => {
    expect(summarizeCaptureRegistration([{ id: 's1' }, { id: 's1' }, { id: 's2' }], ['s1', 's1', 'other'])).toEqual({ total: 2, registered: 1 });
    renderPanel({ progress: { total: 30, registered: 6 } });
    expect(screen.getByText('6 de 30 registrados')).toBeVisible();
    expect(screen.getByText(/No significa que la nota ya esté publicada/)).toBeVisible();
  });
  it('095 propone sin seleccionar ni abrir cámara o enviar automáticamente', async () => {
    const { onStudentChange } = renderPanel({ suggestNextStudent: true });
    expect(onStudentChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Elegir a Estudiante 1' }));
    expect(onStudentChange).toHaveBeenCalledWith('student-1');
    expect(mocks.calificar).not.toHaveBeenCalled();
    expect(screen.getByTestId('evidence-picker')).toHaveAttribute('data-disabled', 'true');
  });
  it('095 no avanza ni propone mientras la disponibilidad no está verificada', () => {
    renderPanel({ eligibilityVerified: false, suggestNextStudent: true, progress: { total: 30, registered: 6 } });
    expect(screen.queryByText('6 de 30 registrados')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Elegir a Estudiante 1' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar a calificar' })).toBeDisabled();
  });
  it('095 termina el grupo sin proponer otra identidad ni habilitar envío', () => {
    renderPanel({ students: [], suggestNextStudent: true, progress: { total: 1, registered: 1 } });
    expect(screen.getByText('1 de 1 registrados')).toBeVisible();
    expect(screen.getByText(/No quedan estudiantes pendientes de entrega/)).toBeVisible();
    expect(screen.queryByRole('button', { name: /^Elegir a/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar a calificar' })).toBeDisabled();
    expect(summarizeCaptureRegistration([], ['other'])).toEqual({ total: 0, registered: 0 });
  });
  it('shows candidates immediately in normal flow, without choosing a student automatically', () => {
    const { onStudentChange } = renderPanel();
    expect(screen.getByRole('option', { name: 'Estudiante 1' })).toBeVisible();
    expect(screen.getByRole('listbox')).not.toHaveClass('absolute');
    expect(onStudentChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Enviar a calificar' })).toBeDisabled();
  });
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
    const { onStudentChange, onUploadAccepted, onDirtyChange } = renderPanel({ studentId: 'student-1' });

    await user.click(screen.getByRole('button', { name: 'Añadir hoja de prueba' }));
    await user.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await waitFor(() => expect(onUploadAccepted).toHaveBeenCalledWith('student-1', 'Estudiante 1'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mocks.calificar).toHaveBeenCalledWith('evaluation-1', 'student-1', [mocks.pages[0].file], [0]);
    expect(onStudentChange).toHaveBeenCalledWith('');
    const acceptedAt = onUploadAccepted.mock.invocationCallOrder[0];
    const lastDirtyBeforeAcceptance = onDirtyChange.mock.calls.reduce((last, [dirty], index) => dirty && onDirtyChange.mock.invocationCallOrder[index] < acceptedAt ? onDirtyChange.mock.invocationCallOrder[index] : last, 0);
    expect(onDirtyChange.mock.calls.some(([dirty], index) => !dirty && onDirtyChange.mock.invocationCallOrder[index] > lastDirtyBeforeAcceptance && onDirtyChange.mock.invocationCallOrder[index] < acceptedAt)).toBe(true);
    expect(acceptedAt).toBeLessThan(onStudentChange.mock.invocationCallOrder[0]);
  });

  it('keeps the student selected when the upload fails', async () => {
    const user = userEvent.setup();
    mocks.calificar.mockRejectedValue(new Error('fallo de red'));
    const { onStudentChange, onUploadAccepted } = renderPanel({ studentId: 'student-1' });

    await user.click(screen.getByRole('button', { name: 'Añadir hoja de prueba' }));
    await user.click(screen.getByRole('button', { name: 'Enviar a calificar' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onUploadAccepted).not.toHaveBeenCalled();
    expect(onStudentChange).not.toHaveBeenCalledWith('');
    expect(screen.getByRole('button', { name: 'Enviar a calificar' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await waitFor(() => expect(mocks.calificar).toHaveBeenCalledTimes(2));
    expect(mocks.calificar.mock.calls[1]).toEqual(mocks.calificar.mock.calls[0]);
  });

  it('blocks submission while photo quality is pending or unusable', async () => {
    const user = userEvent.setup();
    mocks.pages = [{ ...mocks.pages[0], quality: undefined }];
    renderPanel({ studentId: 'student-1' });
    await user.click(screen.getByRole('button', { name: 'Añadir hoja de prueba' }));
    expect(screen.getByText(/Comprobando la calidad/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar a calificar' })).toBeDisabled();
    mocks.pages = [{ ...mocks.pages[0], quality: { status: 'unusable', warnings: ['No se lee'], width: 40, height: 40 } }];
    await user.click(screen.getByRole('button', { name: 'Añadir hoja de prueba' }));
    expect(screen.getByRole('button', { name: 'Enviar a calificar' })).toBeDisabled();
    expect(mocks.calificar).not.toHaveBeenCalled();
  });

  it('freezes one request with the exact files and rotations on rapid double activation', async () => {
    const user = userEvent.setup();
    mocks.calificar.mockReturnValue(new Promise(() => {}));
    mocks.pages = [mocks.pages[0], { ...mocks.pages[0], id: 'page-2', file: new File(['second'], 'second.jpg', { type: 'image/jpeg' }), rotation: 90 }];
    renderPanel({ studentId: 'student-1' });
    await user.click(screen.getByRole('button', { name: 'Añadir hoja de prueba' }));
    const send = screen.getByRole('button', { name: 'Enviar a calificar' });
    fireEvent.click(send);
    fireEvent.click(send);
    await waitFor(() => expect(mocks.calificar).toHaveBeenCalledTimes(1));
    expect(mocks.calificar).toHaveBeenCalledWith('evaluation-1', 'student-1', mocks.pages.map((page) => page.file), [0, 90]);
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByTestId('evidence-picker')).toHaveAttribute('data-disabled', 'true');
  });

  it('identifies a PDF as one document, not an invented page count', async () => {
    const user = userEvent.setup();
    mocks.calificar.mockResolvedValue({ evaluacion_id: 'evaluation-1', materia_id: 'subject-1', estudiante_id: 'student-1', resultado_json: { job_id: 'pdf-job' } });
    mocks.pages = [{ id: 'pdf', file: new File(['pdf'], 'respuestas.pdf', { type: 'application/pdf' }), rotation: 0 }];
    renderPanel({ studentId: 'student-1' });
    await user.click(screen.getByRole('button', { name: 'Añadir hoja de prueba' }));
    expect(screen.getByText(/1 PDF.*respuestas.pdf/)).toBeVisible();
    expect(screen.getByText(/Multiplicación · Matemáticas/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Enviar a calificar' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await waitFor(() => expect(mocks.calificar).toHaveBeenCalledWith('evaluation-1', 'student-1', [mocks.pages[0].file], [0]));
  });

  it('does not clear a new context when an abandoned pending upload later succeeds', async () => {
    const user = userEvent.setup();
    let finish!: (result: object) => void;
    mocks.calificar.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const { unmount, onStudentChange, onUploadAccepted } = renderPanel({ studentId: 'student-1' });
    await user.click(screen.getByRole('button', { name: 'Añadir hoja de prueba' }));
    await user.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await waitFor(() => expect(mocks.calificar).toHaveBeenCalledTimes(1));
    unmount();
    finish({ evaluacion_id: 'evaluation-1', materia_id: 'subject-1', estudiante_id: 'student-1', resultado_json: { job_id: 'job-late' } });
    await waitFor(() => expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['calificaciones', 'evaluation-1'] }));
    expect(onStudentChange).not.toHaveBeenCalled();
    expect(onUploadAccepted).not.toHaveBeenCalled();
  });

  it('does not enable sending while candidates are being revalidated', () => {
    renderPanel({ studentId: 'student-1', eligibilityVerified: false });
    expect(screen.getByRole('button', { name: 'Enviar a calificar' })).toBeDisabled();
    expect(screen.getByRole('combobox')).toBeDisabled();
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
