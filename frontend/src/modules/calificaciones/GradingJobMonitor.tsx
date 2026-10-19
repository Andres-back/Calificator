import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, ChevronDown, LoaderCircle, RefreshCw, ScanLine, X } from 'lucide-react';

import { queryClient } from '@/lib/queryClient';
import { routes } from '@/config/routes';
import { useAuth } from '@/stores/auth';
import {
  getGradingJob,
  getGradingJobItems,
  readPendingGradings,
  recoverPendingGradings,
  removePendingGrading,
  retryGradingJob,
  subscribePendingGradings,
  updatePendingGrading,
  type GradingJobItem,
  type GradingJobSummary,
  type PendingGradingJob,
} from './gradingJobs';

function keepStableJobs(current: PendingGradingJob[], next: PendingGradingJob[]) {
  return JSON.stringify(current) === JSON.stringify(next) ? current : next;
}

export function GradingJobMonitor({ embedded = false }: { embedded?: boolean }) {
  const owner = useAuth(state => state.user?.id);
  return owner ? <AccountGradingJobMonitor key={owner} embedded={embedded} /> : null;
}

function AccountGradingJobMonitor({ embedded }: { embedded: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const expandRef = useRef<HTMLButtonElement>(null);
  const minimizeRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const mounted = useRef(true);
  const noticeIds = useRef(new Set<string>());
  const [jobs, setJobs] = useState(readPendingGradings);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [summaries, setSummaries] = useState<Record<string, GradingJobSummary>>({});
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const displayedJobId = useRef('');
  const [items, setItems] = useState<GradingJobItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [retryingItem, setRetryingItem] = useState<string | null>(null);
  const polling = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    mounted.current = true;
    const notices = noticeIds.current;
    return () => {
      mounted.current = false;
      // Ready notices contain a student's name; do not leave them on a new account.
      notices.forEach(id => toast.dismiss(id));
      notices.clear();
    };
  }, []);

  function changeExpanded(next: boolean) {
    setExpanded(next);
    window.requestAnimationFrame(() => {
      if (mounted.current) (next ? minimizeRef : expandRef).current?.focus({ preventScroll: true });
    });
  }

  useEffect(() => {
    let disposed = false;
    void recoverPendingGradings()
      .then((recovered) => {
        if (!disposed) setJobs((current) => keepStableJobs(current, recovered));
      })
      .catch(() => {
        // El almacenamiento local sigue siendo un respaldo si la red no está disponible.
      });
    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => subscribePendingGradings(
    () => setJobs((current) => keepStableJobs(current, readPendingGradings())),
  ), []);

  useEffect(() => {
    const pollableJobs = jobs.filter((job) => !job.completed);
    if (pollableJobs.length === 0) return undefined;
    let disposed = false;

    const poll = async () => {
      if (polling.current || disposed) return;
      polling.current = true;
      try {
        const states = await Promise.all(pollableJobs.map(async (job) => {
          try {
            const data = await getGradingJob(job.jobId);
            return { job, data, missing: false };
          } catch (error) {
            const status = (error as { response?: { status?: number } }).response?.status;
            return { job, data: null, missing: status === 404 };
          }
        }));
        if (disposed) return;

        const nextProgress: Record<string, number> = {};
        const nextSummaries: Record<string, GradingJobSummary> = {};
        for (const state of states) {
          if (state.data?.summary) nextSummaries[state.job.jobId] = state.data.summary;
          if (state.data && ['queued', 'running', 'retrying'].includes(state.data.estado)) {
            nextProgress[state.job.jobId] = state.data.progreso;
            continue;
          }
          if (state.data?.estado === 'success') {
            void queryClient.invalidateQueries({ queryKey: ['evaluation-review', state.job.evaluacionId] });
            await queryClient.invalidateQueries({
              queryKey: ['calificaciones', state.job.evaluacionId],
            });
            if (disposed) return;
            const failedCount = (state.data.summary?.requires_review ?? 0) + (state.data.summary?.failed_permanent ?? 0);
            if (state.job.kind === 'batch' && failedCount > 0 && state.data.summary) {
              updatePendingGrading(state.job.jobId, {
                completed: true,
                summary: state.data.summary,
              });
            } else {
              removePendingGrading(state.job.jobId);
            }
            noticeIds.current.add(`grading-ready-${state.job.jobId}`);
            toast.custom((item) => (
              <div className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl border border-emerald-200 bg-surface-elevated p-4 text-fg shadow-xl dark:border-emerald-500/30">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{state.job.kind === 'batch' ? 'Lote terminado' : 'Calificación lista para revisar'}</p>
                  <p className="truncate text-sm text-muted">{state.job.estudianteNombre}</p>
                  {failedCount > 0 && <p className="text-xs text-amber-700 dark:text-amber-300">{failedCount} caso(s) requieren atención.</p>}
                </div>
                <button
                  type="button"
                  className="focus-ring min-h-11 min-w-11 rounded-lg px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-200 dark:hover:bg-brand-500/10"
                  onClick={() => {
                    toast.dismiss(item.id);
                    if (!mounted.current) return;
                    navigate(`${routes.calificacionesEvaluacion(state.job.evaluacionId)}${state.job.estudianteId ? `&estudiante=${encodeURIComponent(state.job.estudianteId)}` : ''}`);
                  }}
                >
                  Revisar
                </button>
              </div>
            ), { id: `grading-ready-${state.job.jobId}`, duration: 12000 });
            continue;
          }
          if (state.data && ['failed', 'requires_review', 'failed_permanent'].includes(state.data.estado)) {
            void queryClient.invalidateQueries({ queryKey: ['evaluation-review', state.job.evaluacionId] });
            await queryClient.invalidateQueries({
              queryKey: ['calificaciones', state.job.evaluacionId],
            });
            if (disposed) return;
            if (state.job.kind === 'batch' && state.data.summary) {
              updatePendingGrading(state.job.jobId, {
                completed: true,
                summary: state.data.summary,
              });
            } else {
              removePendingGrading(state.job.jobId);
            }
            noticeIds.current.add(`grading-failed-${state.job.jobId}`);
            toast.error(
              `No se pudo completar la calificación de ${state.job.estudianteNombre}. La evidencia quedó guardada para reintentar.`,
              { id: `grading-failed-${state.job.jobId}`, duration: 9000 },
            );
            continue;
          }
          if (state.data?.estado === 'cancelled' || state.missing) {
            removePendingGrading(state.job.jobId);
          }
        }
        setProgress(nextProgress);
        setSummaries(nextSummaries);
      } finally {
        polling.current = false;
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), 3000);
    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [jobs, navigate]);

  if (jobs.length === 0) return null;
  const current: PendingGradingJob = jobs.find(job => job.jobId === selectedJobId) ?? jobs.find((job) => !job.completed) ?? jobs[0];
  displayedJobId.current = current.jobId;
  const currentProgress = progress[current.jobId] ?? 5;
  const summary = summaries[current.jobId] ?? current.summary;
  const completedWithAttention = Boolean(current.completed && current.kind === 'batch');
  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(current.createdAt).getTime()) / 1000),
  );
  const isTakingLonger = elapsedSeconds >= 90;
  const needsAttention = jobs.some(job => {
    const counts = summaries[job.jobId] ?? job.summary;
    return job.completed || (counts?.requires_review ?? 0) + (counts?.failed_permanent ?? 0) > 0;
  });
  const activeCount = jobs.reduce((count, job) => count + (job.completed ? 0 : job.total ?? 1), 0);

  async function toggleDetails() {
    if (detailsOpen) {
      setDetailsOpen(false);
      return;
    }
    setLoadingItems(true);
    try {
      const result = await getGradingJobItems(current.jobId);
      if (!mounted.current || displayedJobId.current !== current.jobId) return;
      setItems(result.items);
      setDetailsOpen(true);
    } catch {
      if (mounted.current) toast.error('No fue posible cargar el detalle del lote.');
    } finally {
      setLoadingItems(false);
    }
  }

  async function retryItem(item: GradingJobItem) {
    setRetryingItem(item.job_id);
    try {
      await retryGradingJob(current.jobId, [item.job_id]);
      if (!mounted.current) return;
      updatePendingGrading(current.jobId, { completed: false, summary: undefined });
      setItems((currentItems) => currentItems.map((currentItem) => (
        currentItem.job_id === item.job_id
          ? { ...currentItem, estado: 'retrying', progreso: 0, error_code: null }
          : currentItem
      )));
      toast.success('El caso volvió a la cola sin repetir los resultados correctos.');
    } catch {
      if (mounted.current) toast.error('No fue posible reintentar este caso; verifica si ya fue revisado.');
    } finally {
      setRetryingItem(null);
    }
  }

  return (
    <aside
      aria-label="Calificaciones en cola"
      className={`${embedded ? 'mx-4 mb-3' : 'mx-4 mt-3 sm:mx-6 lg:mx-8'} relative shrink-0 rounded-xl border border-cyan-200 bg-surface-elevated p-3 text-fg dark:border-cyan-500/30`}
    >
      <div className="flex items-center gap-2">
        <p role="status" className="min-w-0 flex-1 text-sm font-semibold">
          {needsAttention
            ? 'Hay calificaciones por revisar'
            : `${activeCount} en proceso`}
        </p>
        {!expanded ? <button ref={expandRef} type="button" aria-expanded={false} aria-controls={panelId} onClick={() => changeExpanded(true)} className="focus-ring min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-sm font-semibold text-brand-700 dark:text-brand-200">Ver progreso</button>
          : <button ref={minimizeRef} type="button" aria-label="Minimizar progreso" aria-expanded={true} aria-controls={panelId} onClick={() => changeExpanded(false)} className="focus-ring min-h-11 min-w-11 shrink-0 rounded-lg px-3 text-sm font-semibold text-brand-700 dark:text-brand-200">Minimizar</button>}
      </div>
      {expanded && <div id={panelId} className="mt-2 max-h-[40dvh] overflow-y-auto overscroll-contain px-1">
      {jobs.length > 1 && <label className="mb-3 block text-sm font-semibold">Trabajo a consultar
        <select value={current.jobId} onChange={event => {
          setSelectedJobId(event.target.value);
          setDetailsOpen(false);
          setItems([]);
        }} className="focus-ring mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-base text-fg">
          {jobs.map(job => <option key={job.jobId} value={job.jobId}>{job.estudianteNombre} · {job.completed ? 'Por revisar' : 'En proceso'}</option>)}
        </select>
      </label>}
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200">
          <ScanLine className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-bold text-fg">
            {completedWithAttention
              ? <AlertTriangle className="h-4 w-4 text-amber-500" />
              : <LoaderCircle className="h-4 w-4 animate-spin text-cyan-600" />}
            {completedWithAttention ? 'Lote terminado con casos por revisar' : 'Calificando en segundo plano'}
          </p>
          <p className="mt-1 truncate text-sm text-muted">{current.estudianteNombre}</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            {completedWithAttention
              ? 'Los resultados correctos se conservaron. Revisa o reintenta únicamente los casos señalados.'
              : isTakingLonger
              ? 'El trabajo sigue pendiente. Tu evidencia está guardada; puedes continuar navegando.'
              : 'Puedes seguir navegando o añadir más evidencias.'}
          </p>
          {summary && (
            <p className="mt-1 text-xs font-medium text-secondary">
              {summary.success} listas · {summary.running + summary.queued + summary.retrying} en curso · {summary.requires_review + summary.failed_permanent} por revisar
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-cyan-100 dark:bg-cyan-500/20">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-brand-500 transition-[width] duration-500"
          style={{ width: `${Math.max(5, currentProgress)}%` }}
        />
      </div>
      <p className="mt-2 text-right text-xs font-medium text-muted">
        {completedWithAttention
          ? 'Proceso finalizado'
          : jobs.filter((job) => !job.completed).length === 1
            ? '1 calificación en curso'
            : `${jobs.filter((job) => !job.completed).length} calificaciones en cola`}
      </p>
      {current.kind === 'batch' && summary && (
        <div className="mt-3 border-t border-border pt-3">
          <div className="flex gap-2">
            <button
              type="button"
              className="focus-ring flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold hover:bg-surface-2"
              onClick={() => void toggleDetails()}
              disabled={loadingItems}
            >
              {loadingItems ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ChevronDown className={`h-4 w-4 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />}
              {detailsOpen ? 'Ocultar casos' : 'Ver casos'}
            </button>
            {completedWithAttention && (
              <button
                type="button"
                aria-label="Cerrar resumen del lote"
                className="focus-ring grid min-h-11 min-w-11 place-items-center rounded-xl border border-border hover:bg-surface-2"
                onClick={() => removePendingGrading(current.jobId)}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {detailsOpen && (
            <div className="mt-2 max-h-[min(18rem,42vh)] space-y-2 overflow-y-auto overscroll-contain pr-1">
              {items.map((item, index) => {
                const retryable = ['failed', 'failed_permanent', 'requires_review'].includes(item.estado);
                return (
                  <div key={item.job_id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface p-2.5 text-xs">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        Caso {index + 1} · {item.estudiante_nombre || item.estudiante_id?.slice(0, 8) || 'sin estudiante'}
                      </p>
                      <p className="text-muted">{item.estado.replace(/_/g, ' ')} · {item.progreso}%</p>
                    </div>
                    {retryable && (
                      <button
                        type="button"
                        className="focus-ring flex min-h-11 min-w-11 items-center gap-1 rounded-lg px-2 font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-200 dark:hover:bg-brand-500/10"
                        onClick={() => void retryItem(item)}
                        disabled={retryingItem === item.job_id}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${retryingItem === item.job_id ? 'animate-spin' : ''}`} />
                        Reintentar
                      </button>
                    )}
                  </div>
                );
              })}
              {items.length === 0 && <p className="py-3 text-center text-xs text-muted">Todavía no hay casos para mostrar.</p>}
            </div>
          )}
        </div>
      )}
      </div>}
    </aside>
  );
}
