import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CalificacionDetalle } from '@/types/api';
import { GradeReprocessing } from './GradeReprocessing';

const mocks = vi.hoisted(() => ({ send: vi.fn(), history: vi.fn(), realPicker: false, scan: false }));
vi.mock('@/components/evidence/useEvidenceScanCapability', () => ({
  useEvidenceScanCapability: () => ({ available: mocks.scan, scope: 'teacher:e1:s1' }),
}));
vi.mock('../api', () => ({ reprocessGrade: mocks.send, listGradingRevisions: mocks.history }));
vi.mock('@/components/evidence/MultiPageEvidencePicker', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/evidence/MultiPageEvidencePicker')>();
  return { MultiPageEvidencePicker: (props: React.ComponentProps<typeof actual.MultiPageEvidencePicker>) => mocks.realPicker
    ? <actual.MultiPageEvidencePicker {...props} />
    : <button onClick={() => props.onChange([{ id: crypto.randomUUID(), file: new File(['synthetic'], 'photo.jpg', { type: 'image/jpeg' }), rotation: 90,
      ...(mocks.scan ? { scan: { decision: 'original' as const } } : {}) }])}>Tomar foto sintética</button> };
});
vi.mock('@/components/evidence/imageQuality', () => ({ analyzeEvidenceImage: vi.fn().mockResolvedValue(null) }));
const cal = { id: 'c1', evaluacion_id: 'e1', materia_id: 'm1', estudiante_id: 's1', estudiante_nombre: 'Alumno sintético', evaluacion_nombre: 'Actividad sintética',
  estado: 'confirmada', nota_confirmada: 0, revisado_por_docente: true, entrega_archivo_url: '/api/evidencia', updated_at: '2026-10-22T00:00:00', resultado_json: {} } as unknown as CalificacionDetalle;
function setup(changes: Partial<CalificacionDetalle> = {}, expandOptions = true) {
  const accepted = vi.fn();
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><GradeReprocessing cal={{ ...cal, ...changes }} onAccepted={accepted} /></QueryClientProvider>);
  if (expandOptions) fireEvent.click(screen.getByText('Recalificar y cambiar evidencia'));
  return accepted;
}
beforeEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); mocks.realPicker = false; mocks.scan = false; mocks.history.mockResolvedValue([]); mocks.send.mockResolvedValue({ ...cal, estado: 'procesando', nota_confirmada: null, resultado_json: { job_id: 'job1' } }); });

describe('corregir una entrega desde la revisión docente', () => {
  it('permite el reemplazo habitual sin preparación y conserva la confirmación docente', async () => {
    mocks.scan = true;
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar evidencia' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tomar foto sintética' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar sin escaneo' }));
    expect(mocks.send).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Enviar a calificar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await waitFor(() => expect(mocks.send).toHaveBeenCalledOnce());
    expect(mocks.send.mock.calls[0][1].scan).toBeUndefined();
    expect(mocks.send.mock.calls[0][1].rotations).toEqual([90]);
    expect(mocks.send.mock.calls[0][1].confirmed).toBe(true);
  });
  it('131 replaces evidence with raw photos and a closed reviewed recipe, not legacy rotations', async () => {
    mocks.scan = true;
    setup({ estado: 'sugerida', revisado_por_docente: false, nota_confirmada: null });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar evidencia' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tomar foto sintética' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await waitFor(() => expect(mocks.send).toHaveBeenCalledOnce());
    const payload = mocks.send.mock.calls[0][1];
    expect(payload.files[0]).toBeInstanceOf(File);
    expect(payload.scan.pages[0]).toMatchObject({ decision: 'original', rotation: 90, confirmed: true });
    expect(payload.rotations).toBeUndefined();
  });
  it('127 native replacement requires explicit reopening confirmation and preserves file/rotation payload', async () => {
    mocks.realPicker = true;
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('iPhone');
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar evidencia' }));
    fireEvent.click(screen.getByRole('button', { name: /^Tomar foto/ }));
    const input = document.querySelector('input[capture]')!;
    expect(input.getAttribute('capture')).toBe('environment');
    const file = new File(['anonymous'], 'new.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(mocks.send).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Enviar a calificar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Rotar hoja 1' }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await waitFor(() => expect(mocks.send).toHaveBeenCalledWith('c1', expect.objectContaining({ files: [file], rotations: [90], confirmed: true, version: cal.updated_at })));
  });
  it('mantiene las opciones avanzadas plegadas hasta que el docente las abre', () => {
    setup({}, false);
    expect(screen.getByRole('button', { name: 'Volver a calificar' })).not.toBeVisible();
    fireEvent.click(screen.getByText('Recalificar y cambiar evidencia'));
    expect(screen.getByRole('button', { name: 'Volver a calificar' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cambiar evidencia' })).toBeVisible();
  });
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
