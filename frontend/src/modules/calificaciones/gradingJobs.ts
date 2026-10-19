import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

const STORAGE_KEY = 'xcalificator.pending-gradings.v1';
const CHANGE_EVENT = 'xcalificator:gradings-changed';

// Never attribute legacy, unowned names to the next person using this browser.
function storageKey() {
  const owner = useAuth.getState().user?.id;
  return owner ? `${STORAGE_KEY}:${encodeURIComponent(owner)}` : null;
}

let sessionRevision = 0;
useAuth.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id) sessionRevision += 1;
});

export interface PendingGradingJob {
  jobId: string;
  evaluacionId: string;
  materiaId: string;
  estudianteId: string;
  estudianteNombre: string;
  createdAt: string;
  kind?: 'individual' | 'batch';
  total?: number;
  completed?: boolean;
  summary?: GradingJobSummary;
}

export interface GradingJobSummary {
  total: number;
  queued: number;
  running: number;
  retrying: number;
  success: number;
  requires_review: number;
  failed_permanent: number;
  cancelled: number;
}

export interface GradingJobRead {
  id: string;
  estado: 'queued' | 'running' | 'retrying' | 'success' | 'failed' | 'requires_review' | 'failed_permanent' | 'cancelled';
  progreso: number;
  error: string | null;
  summary?: GradingJobSummary | null;
}

export interface GradingJobItem {
  job_id: string;
  entrega_id: string | null;
  estudiante_id: string | null;
  estado: string;
  stage: string | null;
  progreso: number;
  attempt_count: number;
  error_code: string | null;
  estudiante_nombre?: string | null;
  timings_ms?: Record<string, number> | null;
  elapsed_ms?: number;
}

interface PendingGradingJobFromServer {
  job_id: string;
  evaluacion_id: string;
  materia_id: string;
  estudiante_id: string | null;
  estudiante_nombre: string;
  kind: 'individual' | 'batch';
  total: number;
  estado: 'queued' | 'running' | 'retrying';
  progreso: number;
  stage: string | null;
  created_at: string;
}

export function readPendingGradings(): PendingGradingJob[] {
  if (typeof window === 'undefined') return [];
  const key = storageKey();
  if (!key) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is PendingGradingJob => (
      typeof item?.jobId === 'string'
      && typeof item?.evaluacionId === 'string'
      && typeof item?.materiaId === 'string'
      && typeof item?.estudianteId === 'string'
      && typeof item?.estudianteNombre === 'string'
      && typeof item?.createdAt === 'string'
    ));
  } catch {
    return [];
  }
}

function writePendingGradings(jobs: PendingGradingJob[]) {
  const key = storageKey();
  if (!key) return;
  window.localStorage.setItem(key, JSON.stringify(jobs));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export async function recoverPendingGradings(): Promise<PendingGradingJob[]> {
  const revision = sessionRevision;
  if (!storageKey()) return [];
  const initialJobs = readPendingGradings();
  const { data } = await api.get<{ items: PendingGradingJobFromServer[] }>(
    '/jobs/pendientes',
  );
  if (sessionRevision !== revision) return [];
  if (!Array.isArray(data?.items)) return readPendingGradings();
  const localById = new Map(readPendingGradings().map((job) => [job.jobId, job]));
  const recovered = data.items.map((item): PendingGradingJob => {
    const local = localById.get(item.job_id);
    return {
      jobId: item.job_id,
      evaluacionId: item.evaluacion_id,
      materiaId: item.materia_id,
      estudianteId: item.estudiante_id ?? '',
      estudianteNombre: item.kind === 'batch'
        ? `Lote de ${item.total} estudiantes`
        : item.estudiante_nombre || local?.estudianteNombre || 'Estudiante',
      createdAt: item.created_at,
      kind: item.kind,
      total: item.total,
    };
  });
  const activeIds = new Set(recovered.map((job) => job.jobId));
  const completedLocal = [...localById.values()].filter(
    (job) => job.completed && !activeIds.has(job.jobId),
  );
  // An accepted upload can arrive while recovery is in flight. Do not discard it
  // simply because it was absent from the earlier server snapshot.
  const initialIds = new Set(initialJobs.map(job => job.jobId));
  const newlyAccepted = [...localById.values()].filter(
    job => !job.completed && !initialIds.has(job.jobId) && !activeIds.has(job.jobId),
  );
  const next = [...completedLocal, ...recovered, ...newlyAccepted];
  writePendingGradings(next);
  return next;
}

export function addPendingGrading(job: Omit<PendingGradingJob, 'createdAt'>) {
  if (typeof window === 'undefined') return;
  const jobs = readPendingGradings().filter((item) => item.jobId !== job.jobId);
  writePendingGradings([...jobs, { ...job, createdAt: new Date().toISOString() }]);
}

export function addPendingGradingBatch(job: {
  jobId: string;
  evaluacionId: string;
  materiaId: string;
  total: number;
}) {
  addPendingGrading({
    ...job,
    estudianteId: '',
    estudianteNombre: `Lote de ${job.total} estudiantes`,
    kind: 'batch',
  });
}

export function updatePendingGrading(
  jobId: string,
  changes: Partial<Omit<PendingGradingJob, 'jobId' | 'createdAt'>>,
) {
  if (typeof window === 'undefined') return;
  const jobs = readPendingGradings();
  let changed = false;
  const updated = jobs.map((job) => {
    if (job.jobId !== jobId) return job;
    const next = { ...job, ...changes };
    if (JSON.stringify(job) === JSON.stringify(next)) return job;
    changed = true;
    return next;
  });
  if (changed) writePendingGradings(updated);
}

export async function getGradingJob(jobId: string): Promise<GradingJobRead> {
  const { data } = await api.get<GradingJobRead>(`/jobs/${jobId}`);
  return data;
}

export async function getGradingJobItems(jobId: string, offset = 0, limit = 30) {
  const { data } = await api.get<{ items: GradingJobItem[]; total: number; limit: number; offset: number }>(
    `/jobs/${jobId}/items`,
    { params: { offset, limit } },
  );
  return data;
}

export async function retryGradingJob(jobId: string, jobIds?: string[]) {
  const { data } = await api.post<{ requested: number; enqueued: number; skipped: number }>(
    `/jobs/${jobId}/reintentar`,
    jobIds?.length ? { job_ids: jobIds } : {},
  );
  return data;
}

export function removePendingGrading(jobId: string) {
  if (typeof window === 'undefined') return;
  writePendingGradings(readPendingGradings().filter((job) => job.jobId !== jobId));
}

export function subscribePendingGradings(listener: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}
