import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, FileText } from 'lucide-react';
import { Button, Modal, Select } from '@/components/ui';
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

export function EvaluationPreviewModal({ evaluation, canViewSolutions, onClose }: {
  evaluation: Evaluacion | null;
  canViewSolutions: boolean;
  onClose: () => void;
}) {
  const [solutions, setSolutions] = useState(false);
  const [file, setFile] = useState<PreviewFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [wordPending, setWordPending] = useState(false);
  const [wordError, setWordError] = useState<string | null>(null);
  const wordController = useRef<AbortController | null>(null);
  const evaluationId = evaluation?.id;
  const showSolutions = solutions && canViewSolutions;

  useEffect(() => {
    setSolutions(false);
    setWordError(null);
    setWordPending(false);
    return () => wordController.current?.abort();
  }, [evaluationId]);

  useEffect(() => {
    setFile(null);
    setError(null);
    setWordError(null);
    if (!evaluationId) return;
    const controller = new AbortController();
    let url: string | undefined;
    getEvaluationDocument(evaluationId, 'pdf', showSolutions, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setFile({ evaluationId, solutions: showSolutions, url, blob });
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(toApiError(failure).detail);
      });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [evaluationId, showSolutions, retry]);

  const currentFile = file && file.evaluationId === evaluationId && file.solutions === showSolutions ? file : null;

  async function downloadWord() {
    if (!evaluation || wordPending) return;
    const controller = new AbortController();
    wordController.current = controller;
    setWordPending(true);
    setWordError(null);
    try {
      const blob = await getEvaluationDocument(evaluation.id, 'docx', showSolutions, controller.signal);
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
      className="flex h-[calc(100dvh-2rem)] max-w-5xl flex-col overflow-hidden p-4 sm:p-5">
      <div className="mb-3 shrink-0 space-y-2">
        <p className="break-words font-semibold">{evaluation?.nombre}</p>
        <div className="flex flex-wrap items-center gap-2">
          {canViewSolutions ? (
            <label className="min-w-0 flex-1 text-sm">
              <span className="sr-only">Versión del documento</span>
              <Select value={showSolutions ? 'solutions' : 'student'} disabled={wordPending}
                onChange={(event) => setSolutions(event.currentTarget.value === 'solutions')}>
                <option value="student">Sin respuestas</option>
                <option value="solutions">Solucionario</option>
              </Select>
            </label>
          ) : <p className="text-sm text-muted">Evaluación para estudiantes · Sin respuestas</p>}
          {currentFile && (
            <a href={currentFile.url} target="_blank" rel="noopener noreferrer"
              className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-brand-600 dark:text-brand-300">
              <ExternalLink className="h-4 w-4" aria-hidden="true" /> Abrir PDF
            </a>
          )}
        </div>
        <p className="text-xs text-muted">{showSolutions ? 'Solo docente: respuestas guardadas.' : 'Versión sin respuestas para imprimir.'}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-surface-2">
        {error ? (
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
      <div className="mt-3 shrink-0 space-y-2 border-t border-border pt-3">
        {wordError && <p role="alert" className="break-words text-sm text-rose-700 dark:text-rose-300">{wordError}</p>}
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" className="min-h-11 px-2" variant="outline" disabled={!currentFile || !evaluation}
            onClick={() => { if (currentFile && evaluation) downloadUrl(currentFile.url, documentName(evaluation, showSolutions, 'pdf')); }}>
            <Download className="h-4 w-4 shrink-0" aria-hidden="true" /> Descargar PDF
          </Button>
          <Button size="sm" className="min-h-11 px-2" onClick={downloadWord} loading={wordPending} disabled={!currentFile}>
            <FileText className="h-4 w-4 shrink-0" aria-hidden="true" /> Descargar Word
          </Button>
        </div>
        <p className="text-xs leading-5 text-muted">Word editable: sus cambios no se sincronizan con XCalificator.</p>
      </div>
    </Modal>
  );
}
