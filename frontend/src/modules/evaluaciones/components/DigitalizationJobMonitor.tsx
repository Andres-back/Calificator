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
  estado: 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
  progreso: number;
  resultado_json: {
    evaluacion_id?: string;
    materia_id?: string;
    nombre?: string;
    preguntas_count?: number;
  };
  error: string | null;
}

function cleanJobError(error: string | null) {
  const cleaned = (error ?? '')
    .replace(/^\d{3}:\s*/, '')
    .replace(/^HTTPException:\s*/i, '')
    .trim();
  return cleaned || 'El servicio de IA no pudo completar el análisis. Puedes intentarlo de nuevo.';
}

function sortJobs(jobs: PendingDigitalizationJob[]) {
  const active = jobs
    .filter((job) => job.status === 'queued' || job.status === 'running')
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const finished = jobs
    .filter((job) => job.status !== 'queued' && job.status !== 'running')
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  return [...active, ...finished];
}

export function DigitalizationJobMonitor() {
  const [jobs, setJobs] = useState(readPendingDigitalizations);
  const polling = useRef(false);
  const navigate = useNavigate();

  useEffect(() => subscribePendingDigitalizations(
    () => setJobs(readPendingDigitalizations()),
  ), []);

  useEffect(() => {
    const activeJobs = jobs.filter(
      (job) => job.status === 'queued' || job.status === 'running',
    );
    if (activeJobs.length === 0) return undefined;

    let disposed = false;
    const poll = async () => {
      if (polling.current || disposed) return;
      polling.current = true;
      try {
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

          if (state.data.estado === 'queued' || state.data.estado === 'running') {
            updatePendingDigitalization(state.job.jobId, {
              status: state.data.estado,
              progress: state.data.progreso,
              error: undefined,
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

          if (state.data.estado === 'failed') {
            updatePendingDigitalization(state.job.jobId, {
              status: 'failed',
              progress: 100,
              error: cleanJobError(state.data.error),
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
  }, [jobs]);

  if (jobs.length === 0) return null;

  const orderedJobs = sortJobs(jobs);
  const visibleJob = orderedJobs[0];
  const active = visibleJob.status === 'queued' || visibleJob.status === 'running';
  const success = visibleJob.status === 'success';
  const currentProgress = visibleJob.progress || 5;

  const dismiss = () => removePendingDigitalization(visibleJob.jobId);
  const review = () => {
    dismiss();
    navigate('/app/materias/' + visibleJob.materiaId + '/evaluaciones');
  };
  const retry = () => {
    dismiss();
    navigate(
      '/app/materias/' + visibleJob.materiaId + '/evaluaciones?digitalizar=1',
    );
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
            <p className="mt-1 text-xs leading-5 text-muted">
              Puedes continuar navegando. Conservaremos este proceso aunque recargues la página.
            </p>
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
              onClick={retry}
            >
              <RefreshCw className="h-4 w-4" />
              Intentar de nuevo
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