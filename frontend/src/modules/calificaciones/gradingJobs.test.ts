import { beforeEach, expect, it, vi } from 'vitest';
import { useAuth } from '@/stores/auth';
import { addPendingGrading, readPendingGradings, recoverPendingGradings } from './gradingJobs';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { get: mocks.get }, setSessionExpiredHandler: vi.fn() }));
const user = { id: 'teacher-a', nombre: 'Docente', email: 'teacher@example.test', rol: 'profesor' as const, estado: 'activo' as const };
const job = { jobId: 'job-a', evaluacionId: 'exam-a', materiaId: 'subject-a', estudianteId: 'student-a', estudianteNombre: 'Estudiante sintético' };

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useAuth.setState({ user, status: 'authenticated' });
});

it('isolates local work by account without deleting legacy or another account', () => {
  const legacy = JSON.stringify([{ ...job, createdAt: new Date().toISOString() }]);
  localStorage.setItem('xcalificator.pending-gradings.v1', legacy);
  expect(readPendingGradings()).toEqual([]);
  addPendingGrading(job);
  useAuth.setState({ user: { ...user, id: 'teacher-b' } });
  expect(readPendingGradings()).toEqual([]);
  addPendingGrading({ ...job, jobId: 'job-b' });
  useAuth.setState({ user });
  expect(readPendingGradings().map(item => item.jobId)).toEqual(['job-a']);
  expect(localStorage.getItem('xcalificator.pending-gradings.v1')).toBe(legacy);
});

it('does not write recovered data after a different account starts', async () => {
  let resolve!: (value: unknown) => void;
  mocks.get.mockReturnValue(new Promise(done => { resolve = done; }));
  const pending = recoverPendingGradings();
  useAuth.setState({ user: { ...user, id: 'teacher-b' } });
  resolve({ data: { items: [{ job_id: 'old-job', estudiante_nombre: 'No mostrar' }] } });
  expect(await pending).toEqual([]);
  expect(readPendingGradings()).toEqual([]);
});

it('keeps account-owned pending work when recovery is unavailable', async () => {
  addPendingGrading(job);
  mocks.get.mockRejectedValue(new Error('offline'));
  await expect(recoverPendingGradings()).rejects.toThrow('offline');
  expect(readPendingGradings()[0].jobId).toBe('job-a');
});

it('does not expose local jobs when signed out', () => {
  addPendingGrading(job);
  useAuth.setState({ user: null, status: 'unauthenticated' });
  expect(readPendingGradings()).toEqual([]);
});

it('preserves an upload accepted while the recovery snapshot is in flight', async () => {
  let resolve!: (value: unknown) => void;
  mocks.get.mockReturnValue(new Promise(done => { resolve = done; }));
  const pending = recoverPendingGradings();
  addPendingGrading(job);
  resolve({ data: { items: [] } });
  expect((await pending).map(item => item.jobId)).toEqual(['job-a']);
});
