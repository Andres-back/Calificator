import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/stores/auth';
import type { User } from '@/types/api';
import { feedbackAvailable } from './api';
import { FeedbackWorkspace } from './FeedbackWorkspace';

vi.mock('./api', () => ({ feedbackAvailable: vi.fn() }));
vi.mock('./ShareFeedbackDialog', () => ({ ShareFeedbackDialog: ({ embedded }: { embedded?: boolean }) => <div>Gestión común {embedded ? 'integrada' : 'diálogo'}</div> }));
beforeEach(() => { vi.resetAllMocks(); useAuth.setState({ user: { id: 'teacher', rol: 'profesor', permissions: ['grading.read'] } as User }); });
function show() { render(<FeedbackWorkspace evaluationId="e1" gradeId="g1" onDirtyChange={vi.fn()} onReview={vi.fn()} fallback={<p>Editor anterior</p>} />); }
describe('puerta de gestión común', () => {
  it('usa el mismo espacio integrado cuando está habilitado', async () => {
    vi.mocked(feedbackAvailable).mockResolvedValue(true); show();
    expect(await screen.findByText('Gestión común integrada')).toBeInTheDocument();
    expect(screen.queryByText('Editor anterior')).toBeNull();
  });
  it('solo permite el fallback ante desactivación explícita, no un fallo de red', async () => {
    vi.mocked(feedbackAvailable).mockRejectedValue(new Error('offline')); show();
    expect(await screen.findByRole('alert')).toHaveTextContent('Tu nota no ha cambiado');
    expect(screen.queryByText('Editor anterior')).toBeNull();
  });
  it('conserva compatibilidad cuando la función fue desactivada explícitamente', async () => {
    vi.mocked(feedbackAvailable).mockResolvedValue(false); show();
    expect(await screen.findByText('Editor anterior')).toBeInTheDocument();
  });
  it('129 conserva la misma entrada al renovar la sesión y la oculta al perder permisos', async () => {
    vi.mocked(feedbackAvailable).mockResolvedValue(true); show();
    await screen.findByText('Gestión común integrada');
    act(() => useAuth.setState({ user: { ...useAuth.getState().user! } }));
    expect(screen.getByText('Gestión común integrada')).toBeInTheDocument();
    expect(feedbackAvailable).toHaveBeenCalledTimes(1);
    act(() => useAuth.setState({ user: null }));
    expect(screen.queryByText('Gestión común integrada')).toBeNull();
    expect(screen.queryByText('Editor anterior')).toBeNull();
  });
});
