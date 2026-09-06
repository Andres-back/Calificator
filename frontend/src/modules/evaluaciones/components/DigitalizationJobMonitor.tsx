import { useEffect, useRef, useState } from 'react';

import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  RefreshCw,
  X,
  XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import {
  readPendingDigitalizations,
  removePendingDigitalization,
  subscribePendingDigitalizations,
  updatePendingDigitalization,
  type PendingDigitalizationJob,
} from '@/modules/evaluaciones/digitalizationJobs';
import { DocumentProcessingAnimation } from './DocumentProcessingAnimation';

interface JobRead {
  id: string;
  estado: 'queued' | 'running' | 'retrying' | 'success' | 'failed' | 'requires_review' | 'failed_permanent' | 'cancelled';
  progreso: number;
  stage?: string | null;
  resultado_json: {
    evaluacion_id?: string;
    materia_id?: string;
    nombre?: string;
    preguntas_count?: number;
  };
  timings_ms?: Record<string, number>;
  terminal_reason?: string | null;
  error: string | null;
}

function cleanJobError(error: string | null) {
  const cleaned = (error ?? '')
    .replace(/^\d{3}:\s*/, '')
    .replace(/^HTTPException:\s*/i, '')
    .trim();
  return cleaned || 'El servicio de IA no pudo completar el análisis. Puedes intentarlo de nuevo.';
}

function timingSummary(timings?: Record<string, number>) {
  if (!timings) return null;
  const labels: Record<string, string> = {
    queue: 'En cola', prepare: 'Preparando archivo', extraction: 'Leyendo documento',
    structure: 'Organizando preguntas', primary: 'Evaluando', secondary: 'Contrastando',
    consolidation: 'Consolidando', persistence: 'Guardando borrador',
  };
  const stages = Object.entries(timings)
    .filter(([stage, value]) => stage !== 'total' && value > 0)
    .sort((left, right) => right[1] - left[1]);
  const totalSeconds = Math.max(0, Math.round((timings.total ?? 0) / 1000));
  return {
    slowest: stages[0] ? labels[stages[0][0]] ?? stages[0][0] : null,
    totalSeconds,
  };
}

function stageLabel(stage?: string) {
  const labels: Record<string, string> = {
    queued: 'Esperando turno',
    reading: 'Leyendo el documento',
    structuring: 'Organizando preguntas y respuestas',
    saving: 'Guardando el borrador',
    completed: 'Borrador completado',
  };
  return stage ? labels[stage] ?? 'Procesando el documento' : 'Procesando el documento';
}

function sortJobs(jobs: PendingDigitalizationJob[]) {
  const active = jobs
    .filter((job) => ['queued', 'running', 'retrying'].includes(job.status))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const finished = jobs
    .filter((job) => !['queued', 'running', 'retrying'].includes(job.status))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  return [...active, ...finished];
}

export function DigitalizationJobMonitor() {
  const [jobs, setJobs] = useState(readPendingDigitalizations);
  const [retryingJob, setRetryingJob] = useState(false);
  const polling = useRef(false);
  const navigate = useNavigate();
  const activeJobIds = jobs
    .filter((job) => ['queued', 'running', 'retrying'].includes(job.status))
    .map((job) => job.jobId)
    .sort()
    .join('|');

  useEffect(() => subscribePendingDigitalizations(
    () => setJobs(readPendingDigitalizations()),
  ), []);

  useEffect(() => {
    if (!activeJobIds) return undefined;

    let disposed = false;
    const poll = async () => {
      if (polling.current || disposed) return;
      polling.current = true;
      try {
        const activeJobs = readPendingDigitalizations().filter(
          (job) => activeJobIds.split('|').includes(job.jobId),
        );
        const states = await Promise.all(activeJobs.map(async (job) => {
          try {
            const { data } = await api.get<JobRead>('/jobs/' + job.jobId);
            return { job, data, missing: false };
          } catch (error) {
            const status = (error as { response?: { status?: number } }).response?.status;
            return { job, data: null, missing: status === 404 };
          }
        }));
        if (disposed) return;

        for (const state of states) {
          if (state.missing) {
            updatePendingDigitalization(state.job.jobId, {
              status: 'unavailable',
              error: 'No encontramos el registro de este proceso. Puedes iniciar una nueva digitalización.',
            });
            continue;
          }
          if (!state.data) continue;

          if (['queued', 'running', 'retrying'].includes(state.data.estado)) {
            const activeStatus = state.data.estado as 'queued' | 'running' | 'retrying';
            updatePendingDigitalization(state.job.jobId, {
              status: activeStatus,
              progress: state.data.progreso,
              error: undefined,
              timingsMs: state.data.timings_ms,
              terminalReason: state.data.terminal_reason ?? undefined,
              stage: state.data.stage ?? undefined,
            });
            continue;
          }

          if (state.data.estado === 'success') {
            updatePendingDigitalization(state.job.jobId, {
              status: 'success',
              progress: 100,
              evaluationId: state.data.resultado_json.evaluacion_id,
              questionsCount: state.data.resultado_json.preguntas_count,
              error: undefined,
              timingsMs: state.data.timings_ms,
              terminalReason: state.data.terminal_reason ?? undefined,
            });
            await queryClient.invalidateQueries({
              queryKey: ['evaluaciones', state.job.materiaId],
            });
            toast.success('La evaluación digitalizada está lista para revisar.', {
              id: 'digitalization-ready-' + state.job.jobId,
              duration: 8000,
            });
            continue;
          }

          if (['failed', 'requires_review', 'failed_permanent'].includes(state.data.estado)) {
            updatePendingDigitalization(state.job.jobId, {
              status: 'failed',
              progress: 100,
              error: cleanJobError(state.data.error),
              timingsMs: state.data.timings_ms,
              terminalReason: state.data.terminal_reason ?? undefined,
            });
            toast.error('No se pudo digitalizar el documento. Revisa el detalle.', {
              id: 'digitalization-failed-' + state.job.jobId,
              duration: 8000,
            });
            continue;
          }

          updatePendingDigitalization(state.job.jobId, {
            status: 'cancelled',
            progress: state.data.progreso,
            error: 'La digitalización fue cancelada.',
          });
        }
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
  }, [activeJobIds]);

  if (jobs.length === 0) return null;

  const orderedJobs = sortJobs(jobs);
  const visibleJob = orderedJobs[0];
  const active = ['queued', 'running', 'retrying'].includes(visibleJob.status);
  const success = visibleJob.status === 'success';
  const currentProgress = visibleJob.progress || 5;
  const timing = timingSummary(visibleJob.timingsMs);
  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(visibleJob.createdAt).getTime()) / 1000),
  );
  const isTakingLonger = active && elapsedSeconds >= 90;

  const dismiss = () => removePendingDigitalization(visibleJob.jobId);
  const review = () => {
    dismiss();
    navigate('/app/materias/' + visibleJob.materiaId + '/evaluaciones');
  };
  const retry = async () => {
    if (retryingJob) return;
    setRetryingJob(true);
    try {
      await api.post('/jobs/' + visibleJob.jobId + '/reintentar', {});
      updatePendingDigitalization(visibleJob.jobId, {
        status: 'retrying',
        progress: 5,
        error: undefined,
        stage: 'queued',
      });
      toast.success('Reintento añadido a la cola sin volver a subir el documento.');
    } catch {
      toast.error('No fue posible reintentar este proceso. Puedes iniciar uno nuevo.');
    } finally {
      setRetryingJob(false);
    }
  };

  return (
    <aside
      aria-live="polite"
      aria-label="Estado de digitalización"
      className={[
        'fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40',
        'w-[min(25rem,calc(100vw-2rem))] rounded-2xl border bg-surface-elevated/95',
        'p-4 shadow-2xl backdrop-blur-xl',
        success
          ? 'border-emerald-200 shadow-emerald-950/10 dark:border-emerald-500/30'
          : visibleJob.status === 'failed' || visibleJob.status === 'unavailable'
            ? 'border-amber-200 shadow-amber-950/10 dark:border-amber-500/30'
            : 'border-brand-200 shadow-brand-950/15 dark:border-brand-500/30',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        {active ? (
          <DocumentProcessingAnimation compact />
        ) : success ? (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckCircle2 className="h-6 w-6" />
          </span>
        ) : (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
            <AlertTriangle className="h-6 w-6" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-bold text-fg">
            {active && <FileSearch className="h-4 w-4 text-brand-600" />}
            {active
              ? 'Estamos trabajando en tu documento'
              : success
                ? 'Evaluación lista para revisar'
                : visibleJob.status === 'cancelled'
                  ? 'Digitalización cancelada'
                  : 'No se pudo completar la digitalización'}
          </p>
          <p className="mt-1 truncate text-sm font-medium text-fg">{visibleJob.nombre}</p>

          {active ? (
            <div className="mt-1 text-xs leading-5 text-muted">
              <p>
                {isTakingLonger
                  ? 'OpenCode sigue trabajando. La solicitud permanece activa y conservaremos el resultado cuando llegue.'
                  : 'Puedes continuar navegando. Conservaremos este proceso aunque recargues la página.'}
              </p>
              {timing && (timing.slowest || timing.totalSeconds > 0) ? (
                <p className="mt-1 font-semibold text-brand-700 dark:text-brand-300">
                  {timing.slowest ?? 'Procesando'}
                  {timing.totalSeconds > 0 ? ' · ' + timing.totalSeconds + ' s transcurridos' : ''}
                </p>
              ) : null}
              <p className="mt-1 font-semibold text-brand-700 dark:text-brand-300">
                {visibleJob.status === 'retrying'
                  ? 'Reintentando de forma segura'
                  : stageLabel(visibleJob.stage)}
              </p>
            </div>
          ) : success ? (
            <p className="mt-1 text-xs leading-5 text-muted">
              {visibleJob.questionsCount
                ? 'Se detectaron ' + visibleJob.questionsCount + ' preguntas. Revísalas antes de publicar.'
                : 'El borrador quedó guardado. Revísalo antes de publicar.'}
            </p>
          ) : (
            <p className="mt-1 text-xs leading-5 text-muted">
              {visibleJob.error}
            </p>
          )}
        </div>

        <button
          type="button"
          className="focus-ring -mr-1 -mt-1 rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-fg"
          onClick={dismiss}
          aria-label="Descartar aviso"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {active && (
        <>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-brand-100 dark:bg-brand-500/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-600 to-cyan-400 transition-[width] duration-500"
              style={{ width: Math.max(5, currentProgress) + '%' }}
            />
          </div>
          <span className="sr-only">
            Progreso aproximado: {currentProgress} por ciento.
          </span>
        </>
      )}

      {!active && (
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          {success ? (
            <button
              type="button"
              className="focus-ring rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              onClick={review}
            >
              Revisar borrador
            </button>
          ) : (
            <button
              type="button"
              className="focus-ring inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              onClick={() => void retry()}
              disabled={retryingJob}
            >
              <RefreshCw className={retryingJob ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
              {retryingJob ? 'Añadiendo…' : 'Reintentar sin subir de nuevo'}
            </button>
          )}
        </div>
      )}

      {orderedJobs.length > 1 && (
        <p className="mt-2 text-right text-xs font-medium text-muted">
          {orderedJobs.length - 1} proceso(s) más guardado(s)
        </p>
      )}
      <XCircle className="sr-only" aria-hidden="true" />
    </aside>
  );
}
