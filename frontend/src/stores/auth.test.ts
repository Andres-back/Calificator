import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from './auth';
import { readTeacherReviewResume, saveTeacherReviewResume } from '@/modules/calificaciones/teacherReviewResume';
const mocks = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn(), authorization: vi.fn(), clear: vi.fn(), cancel: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { post: mocks.post, get: mocks.get }, resetSessionExpiryState: vi.fn(), setSessionExpiredHandler: vi.fn() }));
vi.mock('@/lib/queryClient', () => ({ queryClient: { cancelQueries: mocks.cancel, clear: mocks.clear } }));
vi.mock('@/modules/admin/authorizationApi', () => ({ getAuthorizationContext: mocks.authorization }));
const user = { id: 'p1', nombre: 'Docente', email: 'p@example.test', rol: 'profesor' as const, estado: 'activo' as const };
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  useAuth.setState({ user, status: 'authenticated' });
  saveTeacherReviewResume('p1', { materiaId: 'm1', evaluacionId: 'e1' });
  mocks.post.mockResolvedValue({});
  mocks.get.mockResolvedValue({ data: { user: { ...user, id: 'p2' } } });
  mocks.authorization.mockResolvedValue({ permissions: ['grading.read'] });
});
describe('sesión y continuación docente', () => {
  it('limpia referencias incluso si logout falla y conserva limpieza de caché', async () => {
    mocks.post.mockRejectedValue(new Error('offline'));
    await expect(useAuth.getState().logout()).rejects.toThrow('offline');
    expect(readTeacherReviewResume('p1')).toBeNull();
    expect(useAuth.getState().user).toBeNull();
    expect(mocks.clear).toHaveBeenCalled();
  });
  it('cambiar de cuenta no conserva contexto de la anterior', async () => {
    await useAuth.getState().login('other@example.test', 'synthetic');
    expect(useAuth.getState().user?.id).toBe('p2');
    expect(readTeacherReviewResume('p1')).toBeNull();
  });
  it('sesión perdida limpia contexto sin impedir estado no autenticado', async () => {
    mocks.get.mockRejectedValue(new Error('401'));
    await useAuth.getState().fetchMe();
    expect(useAuth.getState().status).toBe('unauthenticated');
    expect(readTeacherReviewResume('p1')).toBeNull();
  });
  it('refresco de la misma cuenta conserva el contexto', async () => {
    mocks.get.mockResolvedValue({ data: { user } });
    await useAuth.getState().fetchMe();
    expect(readTeacherReviewResume('p1')).not.toBeNull();
  });
});
