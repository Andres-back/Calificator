import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Modal } from '@/components/ui';
import { toApiError } from '@/lib/api';
import type { Evaluacion, EvaluationPrintSettings } from '@/types/api';
import { cancelPrint, preparedPrintPdf, preparePrint, readPrintJob, type PrintDraft, type PrintJob } from '../printApi';

const PdfViewer = lazy(() => import('./EvaluationPdfViewer'));

export function EvaluationPrintPreparation({ evaluation, settings, draft, onApply }: {
  evaluation: Evaluacion; settings: EvaluationPrintSettings; draft?: PrintDraft;
  onApply: (settings: EvaluationPrintSettings) => void;
}) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<PrintJob['resultado_json'] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState<Blob | null>(null);
  const [opened, setOpened] = useState(false);
  const [retry, setRetry] = useState(0);
  const [resultKey, setResultKey] = useState('');
  const lock = useRef(false);
  const mounted = useRef(true);
  const inputKey = JSON.stringify([evaluation.id, evaluation.updated_at, evaluation.contenido_version_id, settings, draft]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!jobId) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    async function poll() {
      try {
        const job = await readPrintJob(jobId!, controller.signal);
        if (controller.signal.aborted) return;
        if (job.estado === 'success') {
          const blob = await preparedPrintPdf(jobId!, controller.signal);
          if (!controller.signal.aborted) { setResult(job.resultado_json); setFile(blob); setBusy(false); lock.current = false; }
        } else if (['failed', 'failed_permanent', 'requires_review', 'cancelled'].includes(job.estado)) {
          setError(job.error || 'La preparación se detuvo. Tu evaluación sigue igual.'); setBusy(false); lock.current = false;
        } else if (++attempts < 90) timer = setTimeout(() => { void poll(); }, 2000);
        else { setError('Está tardando más de lo esperado. Puedes volver a consultar o cancelar sin perder tus ajustes.'); setBusy(false); lock.current = false; }
      } catch (failure) {
        if (!controller.signal.aborted) { setError(toApiError(failure).detail); setBusy(false); lock.current = false; }
      }
    }
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [jobId, retry]);

  async function start() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setFile(null); setResult(null); setOpened(false);
    const key = inputKey;
    try {
      const created = await preparePrint(evaluation, settings, draft);
      if (mounted.current) { setResultKey(key); setJobId(created.job_id); setRetry(value => value + 1); }
    } catch (failure) { if (mounted.current) { setError(toApiError(failure).detail); setBusy(false); } lock.current = false; }
  }
  async function cancel() {
    if (!jobId) return;
    try { await cancelPrint(jobId); setJobId(null); setBusy(false); setResult(null); setFile(null); lock.current = false; }
    catch (failure) { setError(toApiError(failure).detail); }
  }
  const current = resultKey === inputKey;
  return <div className="space-y-2 rounded-lg border border-border p-3">
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" className="min-h-11" loading={busy} disabled={busy} onClick={start}>Previsualizar sin guardar</Button>
      {jobId && !file && <Button type="button" variant="outline" className="min-h-11" onClick={cancel}>Cancelar preparación</Button>}
      {jobId && error && <Button type="button" variant="outline" onClick={() => { setError(''); setBusy(true); setRetry(value => value + 1); }}>Consultar estado</Button>}
    </div>
    {busy && <p role="status" className="text-sm">Preparando las hojas en segundo plano. Puedes seguir revisando preguntas.</p>}
    {error && <p role="alert" className="break-words text-sm text-rose-700 dark:text-rose-300">{error}</p>}
    {result && current && <div className="space-y-2 text-sm"><p role="status"><strong>{result.paginas_reales} páginas en el PDF</strong> · Sin guardar cambios</p>
      {result.advertencias?.map(warning => <p key={warning} className="break-words text-amber-800 dark:text-amber-200">{warning}</p>)}
      <div className="flex flex-wrap gap-2"><Button type="button" className="min-h-11" variant="outline" onClick={() => setOpened(true)}>Ver vista preparada</Button>
        {result.configuracion && JSON.stringify(result.configuracion) !== JSON.stringify(settings) && <Button type="button" className="min-h-11" variant="outline" onClick={() => onApply(result.configuracion!)}>Usar estos ajustes en mi borrador</Button>}
      </div></div>}
    {result && !current && <p className="text-sm text-muted">Los ajustes cambiaron. Prepara otra vista para ver el resultado actualizado.</p>}
    <p className="text-xs leading-5 text-muted">No guarda cambios ni gasta IA. Revisa la vista antes de guardar.</p>
    {opened && file && current && createPortal(<Modal open onClose={() => setOpened(false)} title="Vista preparada · Sin guardar"
      className="fixed inset-0 flex h-[100dvh] max-h-[100dvh] max-w-none flex-col rounded-none bg-surface p-3 sm:inset-3 sm:h-[calc(100dvh-1.5rem)] sm:w-auto sm:rounded-xl">
      <div className="min-h-0 flex-1">{file && <Suspense fallback={<p>Abriendo documento…</p>}><PdfViewer blob={file} /></Suspense>}</div>
    </Modal>, document.body)}
  </div>;
}
