import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EvidenceScanEditor } from './EvidenceScanEditor';
import { cropCutsAcrossPhoto, sidesOnPhotoFrame, type ScanQuad } from './scanGeometry';

// Spec 208: un recorte que corta la foto de un borde al otro avisa antes de aceptar.
const franjas: Record<string, ScanQuad> = {
  'recuadro de la primera respuesta (15 %)': [[0, 0.17], [1, 0.1733], [1, 0.3027], [0, 0.3441]],
  'banda central de un cuaderno': [[0, 0.2562], [1, 0.3101], [1, 0.6957], [0, 0.7372]],
  'mitad inferior hasta el borde': [[0, 0.4312], [1, 0.4171], [1, 1], [0, 1]],
  'columna de lado a lado vertical': [[0.33, 0], [1, 0], [1, 1], [0.33, 1]],
};

describe('208 recorte que corta la foto de un borde al otro', () => {
  it.each(Object.entries(franjas))('detecta %s', (_nombre, quad) => {
    expect(sidesOnPhotoFrame(quad)).toBeGreaterThanOrEqual(2);
    expect(cropCutsAcrossPhoto(quad)).toBe(true);
  });

  it('no avisa con la foto completa, una hoja dentro de la foto ni un solo lado en el borde', () => {
    expect(cropCutsAcrossPhoto([[0, 0], [1, 0], [1, 1], [0, 1]])).toBe(false);
    expect(cropCutsAcrossPhoto([[0.1076, 0.3214], [0.9007, 0.3157], [0.9135, 0.7716], [0.0958, 0.7792]])).toBe(false);
    expect(cropCutsAcrossPhoto([[0, 0.1], [0.88, 0.12], [0.9, 0.93], [0, 0.9]])).toBe(false);
    expect(sidesOnPhotoFrame([[0, 0], [0.9, 0.05], [0.92, 0.95], [0.05, 0.9]])).toBe(0);
  });
});

const mocks = vi.hoisted(() => ({ run: vi.fn(), dispose: vi.fn() }));
vi.mock('./evidenceScan', () => ({ EvidenceScanner: class { run = mocks.run; dispose = mocks.dispose; } }));
const photo = new File(['source'], 'source.png', { type: 'image/png' });
const detected = (quad: ScanQuad | null) => ({ width: 800, height: 1200, quad, sourcePreview: new Blob(['source'], { type: 'image/png' }), quality: { status: 'ok', warnings: [] } });

describe('208 aviso en el editor de la hoja', () => {
  beforeEach(() => { mocks.run.mockReset(); mocks.dispose.mockReset(); });

  const open = (quad: ScanQuad | null, previous?: Parameters<typeof EvidenceScanEditor>[0]['previous']) => {
    mocks.run.mockImplementation(async (_file, options) => options.mode === 'detect' ? detected(quad) : { ...detected(quad), preview: new Blob(['prepared'], { type: 'image/jpeg' }) });
    const onAccept = vi.fn();
    render(<EvidenceScanEditor file={photo} pageNumber={1} rotation={0} previous={previous} onAccept={onAccept} onClose={vi.fn()} />);
    return onAccept;
  };

  it('avisa al reabrir un recorte guardado que deja fuera parte de la foto, y deja aceptarlo igual', async () => {
    const band = franjas['recuadro de la primera respuesta (15 %)'];
    const onAccept = open(null, { decision: 'prepared', recipe: { width: 800, height: 1200, corners: band, rotation: 0, profile: 'natural', coordinate_frame: 'exif_oriented_source' } } as never);

    expect(await screen.findByTestId('scan-crop-warning')).toHaveTextContent('deja fuera una parte');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Usar esta hoja' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Usar esta hoja' }));
    expect(onAccept.mock.calls[0][0].recipe.corners).toEqual(band);
  });

  it('no avisa con una hoja detectada dentro de la foto', async () => {
    open([[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]]);
    await screen.findByRole('button', { name: 'Esquina 1, superior izquierda' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Usar esta hoja' })).toBeEnabled());
    expect(screen.queryByTestId('scan-crop-warning')).toBeNull();
  });

  it('avisa cuando el docente arrastra las esquinas hacia adentro desde la foto completa', async () => {
    open(null);
    await screen.findByRole('button', { name: 'Esquina 1, superior izquierda' });
    expect(screen.queryByTestId('scan-crop-warning')).toBeNull();
    // Cada paso baja la esquina 0,5 %; 12 pasos dejan fuera el 6 % de arriba. Se busca el botón una sola vez
    // porque getByRole en cada paso hacía que la prueba pasara de 5 s en CI.
    const down = screen.getByRole('button', { name: 'Mover esquina hacia abajo' });
    for (const corner of ['Esquina 1, superior izquierda', 'Esquina 2, superior derecha']) {
      fireEvent.click(screen.getByRole('button', { name: corner }));
      for (let step = 0; step < 12; step++) fireEvent.click(down);
    }
    expect(await screen.findByTestId('scan-crop-warning')).toBeInTheDocument();
  });
});
