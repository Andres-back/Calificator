import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CalificacionDetalle } from '@/types/api';
import { GradeReprocessing } from './GradeReprocessing';

const mocks = vi.hoisted(() => ({ send: vi.fn(), history: vi.fn() }));
vi.mock('../api', () => ({ reprocessGrade: mocks.send, listGradingRevisions: mocks.history }));
vi.mock('@/components/evidence/MultiPageEvidencePicker', () => ({ MultiPageEvidencePicker: ({ onChange }: { onChange: (pages: unknown[]) => void }) => <button onClick={() => onChange([{ id: 'page', file: new File(['synthetic'], 'photo.jpg', { type: 'image/jpeg' }), rotation: 90 }])}>Tomar foto sintética</button> }));
const cal = { id: 'c1', evaluacion_id: 'e1', materia_id: 'm1', estudiante_id: 's1', estudiante_nombre: 'Alumno sintético', evaluacion_nombre: 'Actividad sintética',
  estado: 'confirmada', nota_confirmada: 0, revisado_por_docente: true, entrega_archivo_url: '/api/evidencia', updated_at: '2026-10-22T00:00:00', resultado_json: {} } as unknown as CalificacionDetalle;
function setup(changes: Partial<CalificacionDetalle> = {}) {
  const accepted = vi.fn();
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><GradeReprocessing cal={{ ...cal, ...changes }} onAccepted={accepted} /></QueryClientProvider>);
  return accepted;
}
beforeEach(() => { vi.clearAllMocks(); mocks.history.mockResolvedValue([]); mocks.send.mockResolvedValue({ ...cal, estado: 'procesando', nota_confirmada: null, resultado_json: { job_id: 'job1' } }); });

describe('corregir una entrega desde la revisión docente', () => {
  it('reabre una nota cero con confirmación y sin motivo obligatorio', async () => {
    const accepted = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a calificar' }));
    expect(screen.getByRole('button', { name: 'Enviar a calificar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await waitFor(() => expect(accepted).toHaveBeenCalledOnce());
    expect(mocks.send).toHaveBeenCalledWith('c1', expect.objectContaining({ reason: '', confirmed: true, version: cal.updated_at }));
  });
  it('una sugerencia sin confirmar no exige checkbox ni motivo', async () => {
    setup({ estado: 'sugerida', nota_confirmada: null, revisado_por_docente: false });
    fireEvent.click(screen.getByRole('button', { name: 'Volver a calificar' }));
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await waitFor(() => expect(mocks.send).toHaveBeenCalledOnce());
  });
  it('reemplaza directamente usando las hojas y giros seleccionados', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar evidencia' }));
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Enviar a calificar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Tomar foto sintética' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await waitFor(() => expect(mocks.send).toHaveBeenCalledWith('c1', expect.objectContaining({ files: [expect.any(File)], rotations: [90], reason: '' })));
  });
  it('cancelar no hace solicitudes y procesando no permite duplicar', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar evidencia' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('conserva borrador y solicitud al reintentar tras error de red', async () => {
    mocks.send.mockRejectedValueOnce(new Error('Sin conexión'));
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a calificar' }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await screen.findByRole('alert');
    const firstId = mocks.send.mock.calls[0][1].requestId;
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await waitFor(() => expect(mocks.send).toHaveBeenCalledTimes(2));
    expect(mocks.send.mock.calls[1][1].requestId).toBe(firstId);
  });
  it('muestra la nota cero y la evidencia anteriores sin texto técnico', async () => {
    mocks.history.mockResolvedValue([{ id: 'r1', created_at: '2026-10-22T00:00:00Z', actor_nombre: 'Docente sintético', accion: 'cambiar_evidencia', nota_anterior: '0.00', estado_anterior: 'confirmada', feedback_anterior: 'Explica tu respuesta.', motivo: null, evidencia_url: '/api/private/evidence' }]);
    setup();
    fireEvent.click(screen.getByText('Evidencias y resultados anteriores'));
    await screen.findByText('0.00');
    expect(screen.getByRole('link', { name: 'Abrir evidencia anterior' })).toHaveAttribute('href', '/api/private/evidence');
  });
  it('durante procesamiento bloquea ambos envíos', () => {
    setup({ estado: 'procesando' });
    expect(screen.getByRole('button', { name: 'Volver a calificar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cambiar evidencia' })).toBeDisabled();
  });
});
