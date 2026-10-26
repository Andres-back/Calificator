import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { Download, ExternalLink, FileText } from 'lucide-react';
import { Button, Modal, RichContent, Select } from '@/components/ui';
import { EvaluationContentViewer } from './EvaluationContentViewer';
import { EvaluationSourceReview } from './EvaluationSourceReview';
import { EvaluationPrintPanel } from './EvaluationPrintPanel';
import { EvaluationDocumentContent } from './EvaluationDocumentContent';
import { toApiError } from '@/lib/api';
import { getEvaluationDocument } from '../api';
import type { Evaluacion } from '@/types/api';

interface PreviewFile { evaluationId: string; solutions: boolean; url: string; blob: Blob }
const EvaluationPdfViewer = lazy(() => import('./EvaluationPdfViewer'));

function documentName(evaluation: Evaluacion, solutions: boolean, extension: 'pdf' | 'docx') {
  const name = evaluation.nombre.replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 100) || 'evaluacion';
  return `${name}${solutions ? ' - solucionario' : ''}.${extension}`;
}

function downloadUrl(url: string, name: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function EvaluationPreviewModal({ evaluation: suppliedEvaluation, canViewSolutions, canEditPresentation = false, onClose }: {
  evaluation: Evaluacion | null;
  canViewSolutions: boolean;
  canEditPresentation?: boolean;
  onClose: () => void;
}) {
  const [printEvaluation, setPrintEvaluation] = useState<Evaluacion | null>(null);
  const evaluation = printEvaluation?.id === suppliedEvaluation?.id ? printEvaluation : suppliedEvaluation;
  const [solutions, setSolutions] = useState(false);
  const [file, setFile] = useState<PreviewFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [wordPending, setWordPending] = useState(false);
  const [wordError, setWordError] = useState<string | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [contentView, setContentView] = useState(false);
  const optionsId = useId();
  const wordController = useRef<AbortController | null>(null);
  const evaluationId = evaluation?.id;
  const versionId = evaluation?.contenido_version_id;
  const showSolutions = solutions && canViewSolutions;
  useEffect(() => { setPrintEvaluation(null); }, [suppliedEvaluation?.id, suppliedEvaluation?.updated_at]);

  useEffect(() => {
    setSolutions(false);
    setOptionsOpen(false);
    setContentView(false);
  }, [evaluationId]);

  useEffect(() => {
    setWordError(null);
    setWordPending(false);
    return () => wordController.current?.abort();
  }, [evaluationId, showSolutions]);

  useEffect(() => {
    setFile(null);
    setError(null);
    setWordError(null);
    if (!evaluationId) return;
    const controller = new AbortController();
    let url: string | undefined;
    const request = versionId ? getEvaluationDocument(evaluationId, 'pdf', showSolutions, controller.signal, versionId)
      : getEvaluationDocument(evaluationId, 'pdf', showSolutions, controller.signal);
    request
      .then((blob) => {
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setFile({ evaluationId, solutions: showSolutions, url, blob });
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(toApiError(failure).detail);
      });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [evaluationId, versionId, showSolutions, retry]);

  const currentFile = file && file.evaluationId === evaluationId && file.solutions === showSolutions ? file : null;

  async function downloadWord() {
    if (!evaluation || wordPending) return;
    const controller = new AbortController();
    wordController.current = controller;
    setWordPending(true);
    setWordError(null);
    try {
      const blob = await (versionId ? getEvaluationDocument(evaluation.id, 'docx', showSolutions, controller.signal, versionId)
        : getEvaluationDocument(evaluation.id, 'docx', showSolutions, controller.signal));
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      downloadUrl(url, documentName(evaluation, showSolutions, 'docx'));
      // Dejar que el navegador móvil inicie la descarga antes de liberar el archivo.
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (failure) {
      if (!controller.signal.aborted) setWordError(toApiError(failure).detail);
    } finally {
      if (!controller.signal.aborted) setWordPending(false);
    }
  }

  return (
    <Modal open={Boolean(evaluation)} onClose={onClose} title="Visualizar evaluación"
      className="fixed inset-0 flex h-[100dvh] max-h-[100dvh] max-w-none flex-col overflow-hidden rounded-none p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:inset-3 sm:h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-1.5rem)] sm:w-auto sm:rounded-xl sm:p-4">
      <div className="relative mb-2 flex shrink-0 items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold" title={evaluation?.nombre}>{evaluation?.nombre}</p>
        <Button variant="outline" className="min-h-11 shrink-0 px-3" aria-expanded={optionsOpen} aria-controls={optionsId} onClick={() => setOptionsOpen(!optionsOpen)}>Opciones</Button>
        {optionsOpen && <div id={optionsId} className="absolute right-0 top-full z-10 mt-2 max-h-[65dvh] w-[min(22rem,100%)] space-y-3 overflow-auto rounded-xl border border-border bg-surface p-3 shadow-xl">
          {canViewSolutions ? (
            <label className="block text-sm">
              <span className="mb-1 block">Versión del documento</span>
              <Select value={showSolutions ? 'solutions' : 'student'} disabled={wordPending}
                onChange={(event) => setSolutions(event.currentTarget.value === 'solutions')}>
                <option value="student">Sin respuestas</option>
                <option value="solutions">Solucionario</option>
              </Select>
            </label>
          ) : <p className="text-sm text-muted">Evaluación para estudiantes · Sin respuestas</p>}
          {canViewSolutions && canEditPresentation && evaluation && !evaluation.material_origen_id && <EvaluationPrintPanel key={evaluation.id} evaluation={evaluation}
            onSaved={updated => { setPrintEvaluation(updated); setFile(null); setOptionsOpen(false); setRetry(value => value + 1); }} />}
          {(evaluation?.contenido_visual || evaluation?.lectura || evaluation?.estructura_documento) && <Button type="button" variant="outline" className="min-h-11 w-full" onClick={() => { setContentView(value => !value); setOptionsOpen(false); }}>
            {contentView ? 'Ver formato para imprimir' : evaluation?.lectura ? 'Ver lectura y preguntas' : 'Ver preguntas y figuras'}
          </Button>}
          {currentFile && (
            <a href={currentFile.url} target="_blank" rel="noopener noreferrer"
              className="focus-ring flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-brand-600 dark:text-brand-300">
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" /> Ver evaluación completa (otra pestaña)
            </a>
          )}
          <p className="text-xs text-muted">{showSolutions ? 'Solo docente: respuestas guardadas.' : 'Versión sin respuestas para imprimir.'}</p>
          {wordError && <p role="alert" className="break-words text-sm text-rose-700 dark:text-rose-300">{wordError}</p>}
          <div className="grid gap-2">
            <Button size="sm" className="min-h-11" variant="outline" disabled={!currentFile || !evaluation}
              onClick={() => { if (currentFile && evaluation) downloadUrl(currentFile.url, documentName(evaluation, showSolutions, 'pdf')); }}>
              <Download className="h-4 w-4 shrink-0" aria-hidden="true" /> Descargar PDF
            </Button>
            <Button size="sm" className="min-h-11" onClick={downloadWord} loading={wordPending} disabled={!currentFile}>
              <FileText className="h-4 w-4 shrink-0" aria-hidden="true" /> Descargar Word
            </Button>
          </div>
          <p className="text-xs leading-5 text-muted">Word editable: sus cambios no se sincronizan con XCalificator.</p>
        </div>}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-surface-2">
        {contentView && evaluation ? <div className="h-full min-w-0 space-y-4 overflow-y-auto p-3 sm:p-5">
          {evaluation.estructura_documento ? <EvaluationDocumentContent document={evaluation.estructura_documento} questions={evaluation.preguntas}
            evaluationId={evaluation.id} versionId={evaluation.contenido_version_id} visuals={evaluation.contenido_visual} /> : <>
          {evaluation.lectura && <article className="min-w-0 space-y-3 rounded-xl border border-border bg-surface p-4 sm:p-6">
            <h3 className="font-semibold">Lectura o texto de apoyo</h3>
            <p className="whitespace-pre-wrap break-words text-base leading-7">{evaluation.lectura}</p>
          </article>}
          {evaluation.preguntas.map((question, index) => <article key={String(question.contenido_id || index)} className="min-w-0 space-y-3 rounded-xl border border-border bg-surface p-4">
            <h3 className="font-semibold">Pregunta {String(question.numero || index + 1)}</h3>
            <RichContent content={String(question.enunciado || '')} variant="evaluation" />
            <EvaluationContentViewer evaluationId={evaluation.id} versionId={evaluation.contenido_version_id}
              content={evaluation.contenido_visual} questionId={String(question.contenido_id || '')} />
            {Array.isArray(question.opciones) && <ul className="space-y-2">{question.opciones.map((option, optionIndex) => <li key={optionIndex} className="break-words text-sm">{String(typeof option === 'object' && option ? (option as { texto?: string }).texto || '' : option)}</li>)}</ul>}
            {showSolutions && <p className="text-sm"><strong>Respuesta esperada: </strong>{String(evaluation.respuestas_esperadas.find(answer => Number(answer.numero) === Number(question.numero || index + 1))?.respuesta || 'Pendiente de confirmar')}</p>}
          </article>)}</>}
          {canViewSolutions && evaluation.contenido_visual && 'cobertura' in evaluation.contenido_visual && <EvaluationSourceReview evaluationId={evaluation.id}
            versionId={evaluation.contenido_version_id} manifest={evaluation.contenido_visual}
            questions={evaluation.preguntas.filter(question => question.contenido_id).map(question => ({ id: String(question.contenido_id), label: `Pregunta ${question.numero}` }))} />}
        </div> : error ? (
          <div role="alert" className="space-y-3 p-5">
            <p className="text-sm">{error}</p>
            <Button variant="outline" onClick={() => setRetry((value) => value + 1)}>Volver a intentar</Button>
          </div>
        ) : currentFile ? (
          <Suspense fallback={<p role="status" className="p-5 text-sm text-muted">Cargando visor…</p>}>
            <EvaluationPdfViewer key={`${currentFile.evaluationId}:${currentFile.solutions}:${currentFile.url}`} blob={currentFile.blob} />
          </Suspense>
        ) : <p role="status" className="p-5 text-sm text-muted">Preparando vista final…</p>}
      </div>
    </Modal>
  );
}
