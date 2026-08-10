import { useEffect, useRef, useState } from 'react';

import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, FileSearch, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import {
  readPendingDigitalizations,
  removePendingDigitalization,
  subscribePendingDigitalizations,
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

export function DigitalizationJobMonitor() {
  const [jobs, setJobs] = useState(readPendingDigitalizations);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const polling = useRef(false);
  const navigate = useNavigate();


  useEffect(() => subscribePendingDigitalizations(
    () => setJobs(readPendingDigitalizations()),
  ), []);

  useEffect(() => {
    if (jobs.length === 0) return undefined;
    let disposed = false;

    const poll = async () => {
      if (polling.current || disposed) return;
      polling.current = true;
      try {
        const states = await Promise.all(jobs.map(async (job) => {
          try {
            const { data } = await api.get<JobRead>('/jobs/' + job.jobId);
            return { job, data };
          } catch (error) {
            const status = (error as { response?: { status?: number } }).response?.status;
            return { job, data: null, missing: status === 404 };
          }
        }));
        if (disposed) return;

        const nextProgress: Record<string, number> = {};
        for (const state of states) {
          if (state.data?.estado === 'queued' || state.data?.estado === 'running') {
            nextProgress[state.job.jobId] = state.data.progreso;
            continue;
          }
          if (state.data?.estado === 'success') {
            removePendingDigitalization(state.job.jobId);
            await queryClient.invalidateQueries({
              queryKey: ['evaluaciones', state.job.materiaId],
            });
            toast.custom((item) => (
              <div className="flex max-w-sm items-center gap-3 rounded-2xl border border-emerald-200 bg-surface-elevated p-4 text-fg shadow-xl dark:border-emerald-500/30">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Tu evaluación está lista</p>
                  <p className="truncate text-sm text-muted">{state.job.nombre}</p>
                </div>
                <button
                  type="button"
                  className="focus-ring rounded-lg px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-200 dark:hover:bg-brand-500/10"
                  onClick={() => {
                    toast.dismiss(item.id);
                    navigate('/app/materias/' + state.job.materiaId + '/evaluaciones');
                  }}
                >
                  Revisar
                </button>
              </div>
            ), { id: 'digitalization-ready-' + state.job.jobId, duration: 12000 });
            continue;
          }
          if (state.data?.estado === 'failed') {
            removePendingDigitalization(state.job.jobId);
            toast.error(
              'No pudimos digitalizar “' + state.job.nombre + '”. Revisa el archivo e intenta nuevamente.',
              { id: 'digitalization-failed-' + state.job.jobId, duration: 8000 },
            );
            continue;
          }
          if (state.data?.estado === 'cancelled' || state.missing) {
            removePendingDigitalization(state.job.jobId);
          }
        }
        setProgress(nextProgress);
        setJobs(readPendingDigitalizations());
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
  const visibleJob: PendingDigitalizationJob = jobs[0];
  const currentProgress = progress[visibleJob.jobId] ?? 5;

  return (
    <aside
      aria-live="polite"
      aria-label="Digitalización en curso"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 w-[min(23rem,calc(100vw-2rem))] rounded-2xl border border-brand-200 bg-surface-elevated/95 p-4 shadow-2xl shadow-brand-950/15 backdrop-blur-xl dark:border-brand-500/30"
    >
      <div className="flex items-center gap-3">
        <DocumentProcessingAnimation compact />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-bold text-fg">
            <FileSearch className="h-4 w-4 text-brand-600" />
            Estamos trabajando en tu documento
          </p>
          <p className="mt-1 truncate text-sm text-muted">{visibleJob.nombre}</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Puedes continuar navegando. Te avisaremos cuando esté listo.
          </p>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-brand-100 dark:bg-brand-500/20">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-600 to-cyan-400 transition-[width] duration-500"
          style={{ width: Math.max(5, currentProgress) + '%' }}
        />
      </div>
      {jobs.length > 1 && (
        <p className="mt-2 text-right text-xs font-medium text-muted">
          {jobs.length - 1} documento(s) más en cola
        </p>
      )}
      <span className="sr-only">
        Progreso aproximado: {currentProgress} por ciento.
      </span>
      <XCircle className="sr-only" aria-hidden="true" />
    </aside>
  );
}