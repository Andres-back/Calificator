import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, LoaderCircle, ScanLine } from 'lucide-react';

import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import {
  readPendingGradings,
  removePendingGrading,
  subscribePendingGradings,
  type PendingGradingJob,
} from './gradingJobs';

interface JobRead {
  id: string;
  estado: 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
  progreso: number;
  error: string | null;
}

export function GradingJobMonitor() {
  const [jobs, setJobs] = useState(readPendingGradings);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const polling = useRef(false);
  const navigate = useNavigate();

  useEffect(() => subscribePendingGradings(
    () => setJobs(readPendingGradings()),
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
            const { data } = await api.get<JobRead>(`/jobs/${job.jobId}`);
            return { job, data, missing: false };
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
            removePendingGrading(state.job.jobId);
            await queryClient.invalidateQueries({
              queryKey: ['calificaciones', state.job.evaluacionId],
            });
            toast.custom((item) => (
              <div className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl border border-emerald-200 bg-surface-elevated p-4 text-fg shadow-xl dark:border-emerald-500/30">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Calificación lista para revisar</p>
                  <p className="truncate text-sm text-muted">{state.job.estudianteNombre}</p>
                </div>
                <button
                  type="button"
                  className="focus-ring rounded-lg px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-200 dark:hover:bg-brand-500/10"
                  onClick={() => {
                    toast.dismiss(item.id);
                    navigate(`/app/materias/${state.job.materiaId}/calificar?evaluacion=${state.job.evaluacionId}&estudiante=${state.job.estudianteId}`);
                  }}
                >
                  Revisar
                </button>
              </div>
            ), { id: `grading-ready-${state.job.jobId}`, duration: 12000 });
            continue;
          }
          if (state.data?.estado === 'failed') {
            removePendingGrading(state.job.jobId);
            await queryClient.invalidateQueries({
              queryKey: ['calificaciones', state.job.evaluacionId],
            });
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
        setJobs(readPendingGradings());
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
  const current: PendingGradingJob = jobs[0];
  const currentProgress = progress[current.jobId] ?? 5;
  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(current.createdAt).getTime()) / 1000),
  );
  const isTakingLonger = elapsedSeconds >= 90;

  return (
    <aside
      aria-live="polite"
      aria-label="Calificaciones en cola"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-40 w-[min(23rem,calc(100vw-2rem))] rounded-2xl border border-cyan-200 bg-surface-elevated/95 p-4 shadow-2xl shadow-cyan-950/15 backdrop-blur-xl dark:border-cyan-500/30"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200">
          <ScanLine className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-bold text-fg">
            <LoaderCircle className="h-4 w-4 animate-spin text-cyan-600" />
            Calificando en segundo plano
          </p>
          <p className="mt-1 truncate text-sm text-muted">{current.estudianteNombre}</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            {isTakingLonger
              ? 'OpenCode sigue procesando. No cancelamos la solicitud y la evidencia está segura.'
              : 'Puedes seguir navegando o añadir más evidencias.'}
          </p>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-cyan-100 dark:bg-cyan-500/20">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-brand-500 transition-[width] duration-500"
          style={{ width: `${Math.max(5, currentProgress)}%` }}
        />
      </div>
      <p className="mt-2 text-right text-xs font-medium text-muted">
        {jobs.length === 1 ? '1 calificación en curso' : `${jobs.length} calificaciones en cola`}
      </p>
    </aside>
  );
}
