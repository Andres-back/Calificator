import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import { QuestionVisualEditor } from './QuestionVisualEditor';
import { motifFile } from '@/modules/motif_library/api';

vi.mock('@/modules/motif_library/api', () => ({ motifFile: vi.fn() }));
vi.mock('@/modules/motif_library/MotifPicker', () => ({ MotifPicker: ({ onSelect }: { onSelect: (motif: object) => void }) => <button onClick={() => onSelect({ id: 'naturales-001', label: 'Semilla', description: 'Semilla germinando' })}>Elegir semilla de prueba</button> }));

const mocks = vi.hoisted(() => ({ structured: vi.fn(), upload: vi.fn(), generate: vi.fn(), job: vi.fn(), cancel: vi.fn(), preview: vi.fn() }));
vi.mock('../visualApi', () => ({ createStructuredVisual: mocks.structured, uploadVisual: mocks.upload,
  generateVisual: mocks.generate, readVisualJob: mocks.job, cancelVisualJob: mocks.cancel, getVisualProposal: mocks.preview }));
const block = { id: 'b', tipo: 'tabla', pregunta_ids: ['q'], orden: 0, recurso_id: 'r', descripcion: 'Tabla', seguridad_contenido: 'pendiente_revision', tabla: { encabezados: ['A'], filas: [['12']] } };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.structured.mockResolvedValue({ bloque: block });
  mocks.preview.mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
  vi.mocked(motifFile).mockResolvedValue(new File(['png'], 'naturales-001.png', { type: 'image/png' }));
  vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:fixture'), revokeObjectURL: vi.fn() });
});
it('stages a library image but requires the same preview and teacher confirmation', async () => {
  mocks.upload.mockResolvedValue({ id: 'curated-copy' });
  const accept = setup();
  fireEvent.click(screen.getByRole('button', { name: 'Elegir de la biblioteca' }));
  fireEvent.click(screen.getByRole('button', { name: 'Elegir semilla de prueba' }));
  const checkbox = await screen.findByRole('checkbox', { name: /no contiene respuestas/i });
  expect(accept).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Añadir a la pregunta' })).toBeDisabled();
  fireEvent.load(await screen.findByAltText('Vista previa del material propuesto'));
  fireEvent.click(checkbox);
  fireEvent.click(screen.getByRole('button', { name: 'Añadir a la pregunta' }));
  expect(mocks.upload).toHaveBeenCalledWith(expect.objectContaining({ materia_id: 'm', evaluacion_id: 'e' }), expect.any(File), 'imagen');
  expect(accept).toHaveBeenCalledWith(expect.objectContaining({ recurso_id: 'curated-copy', seguridad_contenido: 'publicable_confirmado', descripcion: expect.stringContaining('Biblioteca temática') }));
  expect(mocks.generate).not.toHaveBeenCalled();
});
it('cancels a library proposal without accepting a changed evaluation', async () => {
  mocks.upload.mockResolvedValue({ id: 'curated-copy' });
  const accept = setup();
  fireEvent.click(screen.getByRole('button', { name: 'Elegir de la biblioteca' }));
  fireEvent.click(screen.getByRole('button', { name: 'Elegir semilla de prueba' }));
  await screen.findByRole('checkbox', { name: /no contiene respuestas/i });
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(accept).not.toHaveBeenCalled();
  expect(mocks.generate).not.toHaveBeenCalled();
});
function setup() {
  const accept = vi.fn();
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <QuestionVisualEditor evaluationId="e" materiaId="m" questionId="q" generationEnabled onAccept={accept} />
  </QueryClientProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Añadir contenido' }));
  return accept;
}
it('previews structured data but only accepts after explicit clean-material confirmation', async () => {
  const accept = setup();
  fireEvent.change(screen.getByLabelText('Tipo de material'), { target: { value: 'tabla' } });
  fireEvent.click(screen.getByRole('button', { name: 'Previsualizar datos' }));
  await screen.findByRole('checkbox', { name: /no contiene respuestas/i });
  fireEvent.load(screen.getByAltText('Vista previa del material propuesto'));
  expect(accept).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Añadir a la pregunta' })).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox', { name: /no contiene respuestas/i }));
  fireEvent.click(screen.getByRole('button', { name: 'Añadir a la pregunta' }));
  expect(accept).toHaveBeenCalledWith(expect.objectContaining({ seguridad_contenido: 'publicable_confirmado', recurso_id: 'r' }));
});

it('cannot accept a proposal whose real image did not load', async () => {
  setup();
  fireEvent.change(screen.getByLabelText('Tipo de material'), { target: { value: 'tabla' } });
  fireEvent.click(screen.getByRole('button', { name: 'Previsualizar datos' }));
  const preview = await screen.findByAltText('Vista previa del material propuesto');
  fireEvent.error(preview);
  await screen.findByRole('alert');
  expect(screen.getByRole('checkbox', { name: /no contiene respuestas/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Añadir a la pregunta' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Volver a abrir propuesta' }));
  fireEvent.load(await screen.findByAltText('Vista previa del material propuesto'));
  expect(screen.getByRole('checkbox', { name: /no contiene respuestas/ })).toBeEnabled();
  expect(mocks.structured).toHaveBeenCalledTimes(1);
});

it('retrieves a completed durable proposal after reload without regeneration or auto-acceptance', async () => {
  mocks.job.mockResolvedValue({ estado: 'success', resultado_json: { bloque: block, expected_version_id: 'revision-a' } });
  const accept = vi.fn(); const jobChanged = vi.fn();
  render(<QueryClientProvider client={new QueryClient()}><QuestionVisualEditor evaluationId="e" materiaId="m" questionId="q" versionId="revision-a" pendingJobId="saved-job" onJobChange={jobChanged} onAccept={accept} /></QueryClientProvider>);
  fireEvent.load(await screen.findByAltText('Vista previa del material propuesto'));
  expect(jobChanged).not.toHaveBeenCalled();
  expect(accept).not.toHaveBeenCalled(); expect(mocks.generate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('checkbox', { name: /no contiene respuestas/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Añadir a la pregunta' }));
  expect(accept).toHaveBeenCalledOnce(); expect(jobChanged).toHaveBeenCalledWith(null);
});

it('does not apply a recovered proposal to another revision', async () => {
  mocks.job.mockResolvedValue({ estado: 'success', resultado_json: { bloque: block, expected_version_id: 'old-revision' } });
  const accept = vi.fn();
  render(<QueryClientProvider client={new QueryClient()}><QuestionVisualEditor evaluationId="e" materiaId="m" questionId="q" versionId="new-revision" pendingJobId="saved-job" onAccept={accept} /></QueryClientProvider>);
  await screen.findByRole('alert');
  expect(screen.queryByAltText('Vista previa del material propuesto')).not.toBeInTheDocument();
  expect(accept).not.toHaveBeenCalled(); expect(mocks.generate).not.toHaveBeenCalled();
});
it('retains the entered table after an error and does not change the evaluation on cancel', async () => {
  mocks.structured.mockRejectedValue(new Error('synthetic'));
  const accept = setup();
  fireEvent.change(screen.getByLabelText('Tipo de material'), { target: { value: 'tabla' } });
  fireEvent.change(screen.getByLabelText('Fila 1, columna 1'), { target: { value: '37' } });
  fireEvent.click(screen.getByRole('button', { name: 'Previsualizar datos' }));
  await screen.findByRole('alert');
  expect(screen.getByLabelText('Fila 1, columna 1')).toHaveValue('37');
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(accept).not.toHaveBeenCalled();
});

it('cancels a late generation response without accepting or reopening it', async () => {
  let resolve!: (value: { job_id: string }) => void;
  mocks.generate.mockReturnValue(new Promise(value => { resolve = value; }));
  const accept = setup();
  fireEvent.click(screen.getByRole('button', { name: 'Crear propuesta con IA' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  resolve({ job_id: 'late-job' });
  await waitFor(() => expect(mocks.cancel).toHaveBeenCalledWith('late-job'));
  expect(accept).not.toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
