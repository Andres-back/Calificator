const STORAGE_KEY = 'xcalificator.pending-gradings.v1';
const CHANGE_EVENT = 'xcalificator:gradings-changed';

export interface PendingGradingJob {
  jobId: string;
  evaluacionId: string;
  materiaId: string;
  estudianteId: string;
  estudianteNombre: string;
  createdAt: string;
}

export function readPendingGradings(): PendingGradingJob[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
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
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function addPendingGrading(job: Omit<PendingGradingJob, 'createdAt'>) {
  if (typeof window === 'undefined') return;
  const jobs = readPendingGradings().filter((item) => item.jobId !== job.jobId);
  writePendingGradings([...jobs, { ...job, createdAt: new Date().toISOString() }]);
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
