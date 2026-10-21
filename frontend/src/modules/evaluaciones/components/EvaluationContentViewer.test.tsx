import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EvaluationVisualManifest } from '@/types/api';
import { EvaluationContentViewer } from './EvaluationContentViewer';
import { EvaluationSourceReview } from './EvaluationSourceReview';

const mocks = vi.hoisted(() => ({ resource: vi.fn(), original: vi.fn(), revoke: vi.fn() }));
vi.mock('../api', () => ({ getEvaluationResource: mocks.resource, getEvaluationOriginal: mocks.original }));
const manifest: EvaluationVisualManifest = {
  schema_version: 1, pregunta_ids: ['q1', 'q2'], recurso_ids: ['image'], original_recurso_id: 'original',
  bloques: [{ id: 'table', tipo: 'tabla', orden: 0, pregunta_ids: ['q1', 'q2'], recurso_id: 'image',
    descripcion: 'Precios en pesos', seguridad_contenido: 'publicable_confirmado',
    tabla: { encabezados: ['Producto', 'Precio'], filas: [['Libro', '2400']] } },
  { id: 'private', tipo: 'imagen', orden: 1, pregunta_ids: ['q1'], recurso_id: 'original',
    descripcion: 'Página respondida', seguridad_contenido: 'privado_original' }],
  cobertura: { detectados: [], conservados: [], estado: 'completa', avisos: [] },
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.resource.mockResolvedValue(new Blob(['image'], { type: 'image/png' }));
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:private-image'), revokeObjectURL: mocks.revoke }));
});
describe('evaluation visual reader', () => {
  it('shows accessible shared tables, with local scrolling and no private original', () => {
    render(<EvaluationContentViewer evaluationId="exam" versionId="v1" content={manifest} questionId="q2" />);
    expect(screen.getByRole('table', { name: 'Precios en pesos' })).toHaveTextContent('Libro2400');
    expect(screen.getByRole('region', { name: 'Tabla Precios en pesos' })).toHaveAttribute('tabindex', '0');
    expect(screen.queryByAltText('Página respondida')).not.toBeInTheDocument();
    expect(mocks.resource).not.toHaveBeenCalled();
  });
  it('loads only an authorized resource, supports enlargement and revokes blobs on unmount', async () => {
    const content = { schema_version: 1 as const, bloques: [{ id: 'figure', tipo: 'imagen' as const,
      orden: 0, pregunta_ids: ['q1'], recurso_id: 'figure', descripcion: 'Triángulo con lados rotulados' }] };
    const user = userEvent.setup();
    const view = render(<EvaluationContentViewer evaluationId="exam" versionId="v1" content={content} questionId="q1" />);
    expect(await screen.findByAltText('Triángulo con lados rotulados')).toHaveAttribute('src', 'blob:private-image');
    expect(mocks.resource).toHaveBeenCalledWith('exam', 'figure', 'v1', expect.any(AbortSignal));
    await user.click(screen.getByRole('button', { name: /Ampliar/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cerrar diálogo' }));
    view.unmount();
    expect(mocks.revoke).toHaveBeenCalledWith('blob:private-image');
  });
  it('reports missing material instead of rendering an empty figure', async () => {
    mocks.resource.mockRejectedValue(new Error('missing'));
    const content = { schema_version: 1 as const, bloques: [{ id: 'f', tipo: 'imagen' as const,
      orden: 0, pregunta_ids: [], recurso_id: 'missing', descripcion: 'Figura' }] };
    render(<EvaluationContentViewer evaluationId="exam" content={content} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos abrir este material');
    expect(screen.getByRole('button', { name: 'Volver a intentar' })).toBeInTheDocument();
  });
  it('allows teacher associations but never a private original to become public', async () => {
    const user = userEvent.setup(); const change = vi.fn();
    render(<EvaluationSourceReview evaluationId="exam" manifest={manifest}
      questions={[{ id: 'q1', label: 'Pregunta 1' }, { id: 'q2', label: 'Pregunta 2' }]}
      onChange={change} />);
    await user.click(screen.getByRole('button', { name: 'Revisar material conservado' }));
    expect(screen.getByRole('checkbox', { name: /Material limpio.*Página respondida/ })).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /Pregunta 2.*Precios/ }));
    await waitFor(() => expect(change).toHaveBeenCalled());
    expect(change.mock.lastCall?.[0].bloques[0].pregunta_ids).toEqual(['q1']);
    expect(change.mock.lastCall?.[0].original_recurso_id).toBe('original');
  });
});
