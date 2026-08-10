const STORAGE_KEY = 'xcalificator.pending-digitalizations.v1';
const CHANGE_EVENT = 'xcalificator:digitalizations-changed';

export interface PendingDigitalizationJob {
  jobId: string;
  materiaId: string;
  nombre: string;
  createdAt: string;
}

export function readPendingDigitalizations(): PendingDigitalizationJob[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is PendingDigitalizationJob => (
      typeof item?.jobId === 'string'
      && typeof item?.materiaId === 'string'
      && typeof item?.nombre === 'string'
      && typeof item?.createdAt === 'string'
    ));
  } catch {
    return [];
  }
}

function writePendingDigitalizations(jobs: PendingDigitalizationJob[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function addPendingDigitalization(job: Omit<PendingDigitalizationJob, 'createdAt'>) {
  if (typeof window === 'undefined') return;
  const jobs = readPendingDigitalizations().filter((item) => item.jobId !== job.jobId);
  writePendingDigitalizations([
    ...jobs,
    { ...job, createdAt: new Date().toISOString() },
  ]);
}

export function removePendingDigitalization(jobId: string) {
  if (typeof window === 'undefined') return;
  writePendingDigitalizations(
    readPendingDigitalizations().filter((job) => job.jobId !== jobId),
  );
}

export function subscribePendingDigitalizations(listener: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}