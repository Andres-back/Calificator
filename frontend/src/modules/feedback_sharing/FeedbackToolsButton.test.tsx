import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/stores/auth';
import type { User } from '@/types/api';
import { FeedbackToolsButton } from './FeedbackToolsButton';
import { feedbackAvailable, listFeedbackAccesses, copyFeedbackAccesses } from './api';

vi.mock('./api', () => ({ feedbackAvailable: vi.fn(), listFeedbackAccesses: vi.fn(), copyFeedbackAccesses: vi.fn() }));
vi.mock('./ShareFeedbackDialog', () => ({ ShareFeedbackDialog: () => <div role="dialog">Lista privada de prueba</div> }));
beforeEach(() => {
  vi.resetAllMocks();
  useAuth.setState({ user: { id: 't', rol: 'profesor', permissions: ['grading.read'] } as User });
});
describe('entrada gradual de retroalimentaciones', () => {
  it('solo abre cuando está habilitada y monta el diálogo fuera del menú', async () => {
    vi.mocked(feedbackAvailable).mockResolvedValue(true);
    const { container } = render(<MemoryRouter><FeedbackToolsButton evaluationId="e" /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Retroalimentación del grupo' }));
    const dialog = await screen.findByRole('dialog');
    expect(container.contains(dialog)).toBe(false);
  });
  it('no muestra una función deshabilitada', async () => {
    vi.mocked(feedbackAvailable).mockResolvedValue(false);
    render(<MemoryRouter><FeedbackToolsButton evaluationId="e" /></MemoryRouter>);
    expect(screen.queryByRole('button')).toBeNull();
  });
  it('139 abre el centro individual común sin otro circuito de copia', async () => {
    useAuth.setState({ user: { id: 't', rol: 'profesor', permissions: ['grading.read', 'grading.publish'] } as User });
    vi.mocked(feedbackAvailable).mockResolvedValue(true);
    vi.mocked(listFeedbackAccesses).mockResolvedValue([{ id: 'a1', calificacion_id: 'g1', estado: 'active', copy_available: true } as never]);
    const url = 'https://example.test/devolucion#' + 'a'.repeat(43);
    vi.mocked(copyFeedbackAccesses).mockResolvedValue([{ id: 'a1', url, estudiante: 'Ana' }]);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<MemoryRouter><FeedbackToolsButton evaluationId="e" gradeId="g1" /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Compartir retroalimentación' }));
    expect(await screen.findByRole('dialog')).toBeVisible();
    expect(writeText).not.toHaveBeenCalled();
    expect(listFeedbackAccesses).not.toHaveBeenCalled();
    expect(copyFeedbackAccesses).not.toHaveBeenCalled();
  });
  it('abre las opciones individuales si todavía no hay enlace, sin emitirlo', async () => {
    useAuth.setState({ user: { id: 't', rol: 'profesor', permissions: ['grading.read', 'grading.publish'] } as User });
    vi.mocked(feedbackAvailable).mockResolvedValue(true);
    vi.mocked(listFeedbackAccesses).mockResolvedValue([]);
    render(<MemoryRouter><FeedbackToolsButton evaluationId="e" gradeId="g1" /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Compartir retroalimentación' }));
    expect(await screen.findByRole('dialog')).toBeVisible();
    expect(copyFeedbackAccesses).not.toHaveBeenCalled();
  });
  it('129 conserva el grupo abierto durante renovación y lo retira al salir', async () => {
    vi.mocked(feedbackAvailable).mockResolvedValue(true);
    render(<MemoryRouter><FeedbackToolsButton evaluationId="e" /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Retroalimentación del grupo' }));
    await screen.findByRole('dialog');
    act(() => useAuth.setState({ user: { ...useAuth.getState().user! } }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(feedbackAvailable).toHaveBeenCalledTimes(1);
    act(() => useAuth.setState({ user: null }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
