const STORAGE_KEY = 'xcalificator.pending-digitalizations.v1';
const CHANGE_EVENT = 'xcalificator:digitalizations-changed';

export type DigitalizationJobStatus =
  | 'queued'
  | 'running'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'unavailable';

export interface PendingDigitalizationJob {
  jobId: string;
  materiaId: string;
  nombre: string;
  createdAt: string;
  updatedAt: string;
  status: DigitalizationJobStatus;
  progress: number;
  evaluationId?: string;
  questionsCount?: number;
  error?: string;
  timingsMs?: Record<string, number>;
  terminalReason?: string;
}

type NewDigitalizationJob = Pick<
  PendingDigitalizationJob,
  'jobId' | 'materiaId' | 'nombre'
>;

const VALID_STATUSES = new Set<DigitalizationJobStatus>([
  'queued',
  'running',
  'success',
  'failed',
  'cancelled',
  'unavailable',
]);

function normalizeStatus(value: unknown): DigitalizationJobStatus {
  return typeof value === 'string' && VALID_STATUSES.has(value as DigitalizationJobStatus)
    ? value as DigitalizationJobStatus
    : 'queued';
}

export function readPendingDigitalizations(): PendingDigitalizationJob[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Record<string, unknown> => (
        typeof item?.jobId === 'string'
        && typeof item?.materiaId === 'string'
        && typeof item?.nombre === 'string'
        && typeof item?.createdAt === 'string'
      ))
      .map((item) => ({
        jobId: item.jobId as string,
        materiaId: item.materiaId as string,
        nombre: item.nombre as string,
        createdAt: item.createdAt as string,
        updatedAt: typeof item.updatedAt === 'string'
          ? item.updatedAt
          : item.createdAt as string,
        status: normalizeStatus(item.status),
        progress: typeof item.progress === 'number'
          ? Math.min(100, Math.max(0, item.progress))
          : 5,
        evaluationId: typeof item.evaluationId === 'string'
          ? item.evaluationId
          : undefined,
        questionsCount: typeof item.questionsCount === 'number'
          ? item.questionsCount
          : undefined,
        error: typeof item.error === 'string' ? item.error : undefined,
        timingsMs: item.timingsMs && typeof item.timingsMs === 'object'
          ? item.timingsMs as Record<string, number>
          : undefined,
        terminalReason: typeof item.terminalReason === 'string'
          ? item.terminalReason
          : undefined,
      }));
  } catch {
    return [];
  }
}

function writePendingDigitalizations(jobs: PendingDigitalizationJob[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function addPendingDigitalization(job: NewDigitalizationJob) {
  if (typeof window === 'undefined') return;
  const now = new Date().toISOString();
  const jobs = readPendingDigitalizations().filter((item) => item.jobId !== job.jobId);
  writePendingDigitalizations([
    ...jobs,
    {
      ...job,
      createdAt: now,
      updatedAt: now,
      status: 'queued',
      progress: 5,
    },
  ]);
}

export function updatePendingDigitalization(
  jobId: string,
  changes: Partial<
    Omit<PendingDigitalizationJob, 'jobId' | 'materiaId' | 'nombre' | 'createdAt'>
  >,
) {
  if (typeof window === 'undefined') return;
  writePendingDigitalizations(readPendingDigitalizations().map((job) => (
    job.jobId === jobId
      ? { ...job, ...changes, updatedAt: new Date().toISOString() }
      : job
  )));
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