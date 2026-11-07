import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DigitalizarEvaluacionModal } from './DigitalizarEvaluacionModal';
import { readPendingDigitalizations } from '@/modules/evaluaciones/digitalizationJobs';
import type { EvidenceScanRecipe, EvidenceScanSelection } from '@/components/evidence/scanTypes';

const RECIPE: EvidenceScanRecipe = {
  width: 800, height: 1100, corners: [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]],
  rotation: 0, profile: 'lectura_suave', coordinate_frame: 'exif_oriented_source',
};
const CAPABILITY = { schema_version: 1, enabled: true, algorithm: 'opencv-4.13.0-scan2', max_pages: 10,
  max_file_bytes: 10485760, max_total_bytes: 41943040, max_scan_pixels: 16000000, corner_assistance_enabled: false };

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: { post: mocks.post, get: mocks.get },
  setSessionExpiredHandler: vi.fn(),
  toApiError: (error: unknown) => ({ detail: String(error) }),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: mocks.success, error: mocks.error },
}));
vi.mock('@/components/evidence/EvidenceScanEditor', () => ({
  EvidenceScanEditor: ({ onAccept, pageNumber, rotation }: { onAccept: (selection: EvidenceScanSelection) => void; pageNumber: number; rotation: number }) => (
    <div role="dialog" aria-label={`Preparar hoja ${pageNumber}`}>
      <button onClick={() => onAccept({ decision: 'prepared', preview: new Blob(['prepared'], { type: 'image/png' }), recipe: { ...RECIPE, rotation: rotation as 0 } })}>Usar esta preparación</button>
      <button onClick={() => onAccept({ decision: 'original' })}>Usar foto original</button>
    </div>
  ),
}));
vi.mock('@/components/evidence/imageQuality', () => ({ analyzeEvidenceImage: vi.fn().mockResolvedValue({ status: 'good', warnings: [] }) }));

function renderModal(onCompleted = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const view = render(
    <QueryClientProvider client={client}>
      <DigitalizarEvaluacionModal
        open
        materiaId="materia-1"
        onClose={vi.fn()}
        onCompleted={onCompleted}
      />
    </QueryClientProvider>,
  );
  return { ...view, onCompleted };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  window.localStorage.clear();
  URL.createObjectURL = vi.fn(() => 'blob:photo');
  URL.revokeObjectURL = vi.fn();
  mocks.get.mockResolvedValue({ data: { ...CAPABILITY, enabled: false } });
  mocks.post.mockResolvedValue({
    data: {
      job_id: 'job-1',
      estado: 'queued',
      materia_id: 'materia-1',
      nombre: 'Prueba multiplicación',
    },
  });
});

describe('DigitalizarEvaluacionModal', () => {
  it('127 native photo preserves the digitalization limits and does not submit until requested', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Android');
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /^Tomar foto/ }));
    const input = document.querySelector('input[capture]')!;
    expect(input.getAttribute('accept')).not.toContain('pdf');
    const file = new File(['synthetic'], 'evaluacion.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByText('0.0 MB de 20 MB')).toBeInTheDocument();
    expect(mocks.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Digitalizar' }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledOnce());
    const form = mocks.post.mock.calls[0][1] as FormData;
    expect(form.getAll('file')).toEqual([file]);
    expect(form.get('materia_id')).toBe('materia-1');
    expect(JSON.parse(String(form.get('rotaciones')))).toEqual([0]);
  });
  it('queues FormData, persists the job and lets the teacher continue navigating', async () => {
    const user = userEvent.setup();
    const { container } = renderModal();
    await user.click(screen.getByRole('button', { name: 'PDF o Word' }));
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"][accept*="docx"]');
    expect(fileInput).not.toBeNull();

    const file = new File(['%PDF-1.7'], 'prueba.pdf', { type: 'application/pdf' });
    await user.upload(fileInput as HTMLInputElement, file);
    await user.clear(screen.getByLabelText(/Nombre de la evaluación/i));
    await user.type(
      screen.getByLabelText(/Nombre de la evaluación/i),
      'Prueba multiplicación',
    );
    await user.click(screen.getByRole('button', { name: 'Digitalizar' }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1));
    expect(mocks.post).toHaveBeenCalledWith(
      '/evaluaciones/externa/digitalizar-con-archivo',
      expect.any(FormData),
    );
    const form = mocks.post.mock.calls[0][1] as FormData;
    expect(form.get('materia_id')).toBe('materia-1');
    expect(form.get('nota_maxima')).toBe('5');
    expect(form.get('modalidad')).toBe('fisica');
    expect(form.get('file')).toBe(file);

    expect(
      await screen.findByRole('heading', {
        name: 'Estamos trabajando en tu documento',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Puedes continuar navegando; te avisaremos/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Continuar navegando' }),
    ).toBeEnabled();
    expect(readPendingDigitalizations()).toEqual([
      expect.objectContaining({
        jobId: 'job-1',
        materiaId: 'materia-1',
        nombre: 'Prueba multiplicación',
      }),
    ]);
  });

  it('sends ordered photos and rotations as one request, without constructing a PDF in the phone', async () => {
    const user = userEvent.setup();
    renderModal();
    const files = ['primera', 'segunda', 'tercera'].map(name => new File([name], name + '.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: /^Subir fotos/ }));
    await user.upload(screen.getByLabelText('Seleccionar fotografías'), files);
    await user.click(screen.getByRole('button', { name: 'Subir hoja 3' }));
    await user.click(screen.getByRole('button', { name: 'Rotar hoja 2' }));
    await user.click(screen.getByRole('button', { name: 'Digitalizar' }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1));
    const form = mocks.post.mock.calls[0][1] as FormData;
    expect(form.getAll('file')).toEqual([files[0], files[2], files[1]]);
    expect(JSON.parse(String(form.get('rotaciones')))).toEqual([0, 90, 0]);
  });

  it('157 sin escáner habilitado conserva el envío de hoy, sin editor ni recetas', async () => {
    const user = userEvent.setup();
    renderModal();
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/evaluaciones/externa/capacidad-escaneo', expect.anything()));
    const file = new File(['uno'], 'hoja.png', { type: 'image/png' });
    await user.click(screen.getByRole('button', { name: /^Subir fotos/ }));
    await user.upload(screen.getByLabelText('Seleccionar fotografías'), file);
    expect(screen.queryByRole('dialog', { name: 'Preparar hoja 1' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Preparar hoja 1' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Digitalizar' }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledOnce());
    const form = mocks.post.mock.calls[0][1] as FormData;
    expect(form.get('recetas')).toBeNull();
    expect(form.getAll('file')).toEqual([file]);
  });

  it('157 con escáner ofrece «Preparar hoja» y envía la receta revisada junto al original', async () => {
    mocks.get.mockResolvedValue({ data: CAPABILITY });
    const user = userEvent.setup();
    renderModal();
    const files = ['uno', 'dos'].map(name => new File([name], name + '.png', { type: 'image/png' }));
    await waitFor(() => expect(mocks.get).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /^Subir fotos/ }));
    await user.upload(screen.getByLabelText('Seleccionar fotografías'), files);
    await user.click(await screen.findByRole('button', { name: 'Usar esta preparación' }));
    expect(screen.getByRole('button', { name: 'Digitalizar' })).toBeDisabled();
    expect(screen.getByText(/Revisa cada hoja o elige usar su foto original/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Usar original sin preparar' }));
    await user.click(screen.getByRole('button', { name: 'Digitalizar' }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledOnce());
    const form = mocks.post.mock.calls[0][1] as FormData;
    expect(form.getAll('file')).toEqual(files);
    expect(JSON.parse(String(form.get('rotaciones')))).toEqual([0, 0]);
    expect(JSON.parse(String(form.get('recetas')))).toEqual([RECIPE, null]);
  });

  it('157 permite usar todas las fotos originales y muestra los avisos de preparación', async () => {
    mocks.get.mockResolvedValue({ data: CAPABILITY });
    mocks.post.mockResolvedValue({ data: { job_id: 'job-2', estado: 'queued', materia_id: 'materia-1', nombre: 'Hoja',
      avisos: ['No pudimos preparar la hoja 1. Usamos su foto original.'] } });
    const user = userEvent.setup();
    renderModal();
    await waitFor(() => expect(mocks.get).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /^Subir fotos/ }));
    await user.upload(screen.getByLabelText('Seleccionar fotografías'), new File(['uno'], 'hoja.png', { type: 'image/png' }));
    expect(await screen.findByRole('dialog', { name: 'Preparar hoja 1' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Usar esta preparación' }));
    await user.click(screen.getByRole('button', { name: 'Usar las fotos originales' }));
    expect(screen.queryByRole('button', { name: 'Preparar hoja 1' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Digitalizar' }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledOnce());
    expect((mocks.post.mock.calls[0][1] as FormData).get('recetas')).toBeNull();
    expect(await screen.findByText('No pudimos preparar la hoja 1. Usamos su foto original.')).toBeInTheDocument();
  });
});
