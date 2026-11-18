/** Spec 206: recalificar con las respuestas esperadas corregidas es opcional y explícito. */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CalificacionDetalle } from '@/types/api';
import { GradeReprocessing } from './GradeReprocessing';

const mocks = vi.hoisted(() => ({ send: vi.fn(), history: vi.fn(), context: vi.fn(), detail: vi.fn(), edit: vi.fn() }));
vi.mock('@/components/evidence/useEvidenceScanCapability', () => ({
  useEvidenceScanCapability: () => ({ available: false, scope: 'teacher:e1:s1' }),
}));
vi.mock('../api', () => ({ reprocessGrade: mocks.send, listGradingRevisions: mocks.history, getRegradingContext: mocks.context, getCalificacionDetalle: mocks.detail, getEvidenceEditContext: mocks.edit }));
vi.mock('@/components/evidence/imageQuality', () => ({ analyzeEvidenceImage: vi.fn().mockResolvedValue(null) }));

const cal = { id: 'c1', evaluacion_id: 'e1', materia_id: 'm1', estudiante_id: 's1', estudiante_nombre: 'Alumno sintético', evaluacion_nombre: 'Lectura sintética',
  estado: 'requiere_revision', nota_confirmada: null, revisado_por_docente: false, entrega_archivo_url: '/api/evidencia', updated_at: '2026-11-18T00:00:00', resultado_json: {} } as unknown as CalificacionDetalle;
const corrected = { estado: 'respuestas_actualizadas', version_entrega_id: 'old', version_objetivo_id: 'new', fingerprint: 'b'.repeat(64),
  requiere_confirmacion: false, cambios: [], respuestas_cambiadas: ['1', '2', '5'], lectura_cambiada: false,
  mensaje: 'Corregiste las respuestas esperadas o la lectura después de recibir esta entrega.' };

function open() {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <GradeReprocessing cal={cal} onAccepted={vi.fn()} /></QueryClientProvider>);
  fireEvent.click(screen.getByText('Recalificar y cambiar evidencia'));
  fireEvent.click(screen.getByRole('button', { name: 'Volver a calificar' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.context.mockResolvedValue(corrected); mocks.detail.mockResolvedValue(cal); mocks.history.mockResolvedValue([]);
  mocks.send.mockResolvedValue({ ...cal, estado: 'procesando' });
});

describe('206 recalificar con respuestas corregidas', () => {
  it('muestra qué preguntas cambiaron sin mostrar las respuestas y usa las actuales por defecto', async () => {
    open();
    await screen.findByText('Corregiste las respuestas esperadas');
    expect(screen.getByText('1, 2, 5')).toBeVisible();
    expect(screen.getByText(/Respuesta esperada nueva en las preguntas/)).toBeVisible();
    expect(screen.getByRole('checkbox', { name: /Calificar esta entrega con las respuestas actuales/ })).toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));

    await waitFor(() => expect(mocks.send).toHaveBeenCalledOnce());
    expect(mocks.send).toHaveBeenCalledWith('c1', expect.objectContaining({
      useCurrentScores: true, targetScoreVersion: 'new', scoreContextFingerprint: corrected.fingerprint,
    }));
  });

  it('al desmarcar la casilla conserva las respuestas originales de la entrega', async () => {
    open();
    fireEvent.click(await screen.findByRole('checkbox', { name: /Calificar esta entrega con las respuestas actuales/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));

    await waitFor(() => expect(mocks.send).toHaveBeenCalledOnce());
    const sent = mocks.send.mock.calls[0][1];
    expect(sent.useCurrentScores).toBeUndefined();
    expect(sent.targetScoreVersion).toBeUndefined();
  });

  it('avisa cuando también cambió la lectura o el reparto de puntos', async () => {
    mocks.context.mockResolvedValue({ ...corrected, respuestas_cambiadas: ['4'], lectura_cambiada: true,
      cambios: [{ numero: '4', puntaje_anterior: '0.5', puntaje_actual: '1' }] });
    open();
    await screen.findByText('Corregiste las respuestas esperadas');
    expect(await screen.findByText(/Respuesta esperada nueva en la pregunta/)).toBeInTheDocument();
    expect(screen.getByText('La lectura o el texto de apoyo cambió.')).toBeInTheDocument();
    expect(screen.getByText(/También cambió el reparto de puntos de una pregunta/)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Usar los puntos actuales/ })).not.toBeInTheDocument();
  });
});
