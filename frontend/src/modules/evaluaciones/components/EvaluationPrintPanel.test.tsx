import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/config/queryKeys';
import type { Evaluacion } from '@/types/api';
import { EvaluationPrintPanel } from './EvaluationPrintPanel';
import { defaultPrintSettings } from '../printSettings';
import { EvaluationPrintPreparation } from './EvaluationPrintPreparation';

const mocks = vi.hoisted(() => ({ update: vi.fn(), prepare: vi.fn(), read: vi.fn(), pdf: vi.fn(), cancel: vi.fn() }));
vi.mock('../api', () => ({ updateEvaluacion: mocks.update }));
vi.mock('../printApi', () => ({ preparePrint: mocks.prepare, readPrintJob: mocks.read, preparedPrintPdf: mocks.pdf, cancelPrint: mocks.cancel }));
const evaluation = { id: 'test', materia_id: 'subject', contenido_version_id: 'version-1', updated_at: '2026-10-24T12:00:00Z', configuracion_impresion: null } as unknown as Evaluacion;
beforeEach(() => vi.clearAllMocks());

it('refreshes both subject and general lists so reopening the editor gets the saved format', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  const legacyKey = ['evaluaciones', evaluation.materia_id];
  const standardKey = queryKeys.evaluaciones.list(evaluation.materia_id);
  const unchangedGrades = { nota: 3.5, evidencia: 'unchanged-test-evidence' };
  client.setQueryData(legacyKey, evaluation);
  client.setQueryData(standardKey, evaluation);
  client.setQueryData(['calificaciones'], unchangedGrades);
  let persisted = evaluation;
  const subjectList = vi.fn(async () => persisted);
  const generalList = vi.fn(async () => persisted);
  const updated = { ...evaluation, updated_at: '2026-10-24T12:01:00Z',
    configuracion_impresion: { ...defaultPrintSettings(), distribucion: 'amplia' as const } };
  mocks.update.mockImplementation(async () => { persisted = updated; return updated; });
  function Lists() {
    const subject = useQuery({ queryKey: legacyKey, queryFn: subjectList });
    const general = useQuery({ queryKey: standardKey, queryFn: generalList });
    return <><output aria-label="Editor desde materia">{subject.data?.configuracion_impresion?.distribucion ?? 'anterior'}</output>
      <output aria-label="Editor desde lista general">{general.data?.configuracion_impresion?.distribucion ?? 'anterior'}</output></>;
  }
  render(<QueryClientProvider client={client}><Lists /><EvaluationPrintPanel evaluation={evaluation} onSaved={vi.fn()} /></QueryClientProvider>);
  await userEvent.click(screen.getByText('Formato de impresión'));
  await userEvent.click(screen.getByRole('button', { name: 'Personalizar impresión' }));
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Distribución' }), 'amplia');
  await userEvent.click(screen.getByRole('button', { name: 'Guardar formato y actualizar vista' }));
  await waitFor(() => expect(screen.getByLabelText('Editor desde materia')).toHaveTextContent('amplia'));
  expect(screen.getByLabelText('Editor desde lista general')).toHaveTextContent('amplia');
  expect(subjectList).toHaveBeenCalledTimes(1);
  expect(generalList).toHaveBeenCalledTimes(1);
  expect(client.getQueryData(['calificaciones'])).toEqual(unchangedGrades);
  client.clear();
});

it('saves only explicit presentation and concurrency guards, never academic content', async () => {
  mocks.update.mockResolvedValue({ ...evaluation, updated_at: '2026-10-24T12:01:00Z', configuracion_impresion: defaultPrintSettings() });
  const saved = vi.fn();
  render(<EvaluationPrintPanel evaluation={evaluation} onSaved={saved} />);
  await userEvent.click(screen.getByText('Formato de impresión'));
  expect(mocks.update).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Personalizar impresión' }));
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Distribución' }), 'media');
  await userEvent.click(screen.getByRole('button', { name: 'Guardar formato y actualizar vista' }));
  expect(mocks.update).toHaveBeenCalledWith('test', {
    configuracion_impresion: { ...defaultPrintSettings(), distribucion: 'media' },
    expected_updated_at: evaluation.updated_at, expected_content_version_id: 'version-1',
  });
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
  expect(mocks.prepare).not.toHaveBeenCalled();
});

it('retains the chosen mode after a conflict and never claims a successful save', async () => {
  mocks.update.mockRejectedValue(new Error('La evaluación cambió'));
  const saved = vi.fn();
  render(<EvaluationPrintPanel evaluation={{ ...evaluation, configuracion_impresion: defaultPrintSettings() }} onSaved={saved} />);
  await userEvent.click(screen.getByText('Formato de impresión'));
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Distribución' }), 'amplia');
  await userEvent.click(screen.getByRole('button', { name: 'Guardar formato y actualizar vista' }));
  await screen.findByRole('alert');
  expect(screen.getByRole('combobox', { name: 'Distribución' })).toHaveValue('amplia');
  expect(saved).not.toHaveBeenCalled();
});

it('previews without saving and reports actual pages and an impossible target', async () => {
  mocks.prepare.mockResolvedValue({ job_id: 'job-1' });
  mocks.read.mockResolvedValue({ estado: 'success', resultado_json: { paginas_reales: 3, meta_alcanzada: false, advertencias: ['Necesita 3 páginas.'], configuracion: defaultPrintSettings() } });
  mocks.pdf.mockResolvedValue(new Blob(['%PDF-test'], { type: 'application/pdf' }));
  render(<EvaluationPrintPreparation evaluation={evaluation} settings={defaultPrintSettings()} onApply={vi.fn()} />);
  expect(mocks.prepare).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Previsualizar sin guardar' }));
  expect(await screen.findByText('3 páginas en el PDF')).toBeInTheDocument();
  expect(screen.getByText('Necesita 3 páginas.')).toBeInTheDocument();
  expect(mocks.update).not.toHaveBeenCalled();
});
