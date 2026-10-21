import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/stores/auth';
import type { User } from '@/types/api';
import { FeedbackToolsButton } from './FeedbackToolsButton';
import { feedbackAvailable } from './api';

vi.mock('./api', () => ({ feedbackAvailable: vi.fn() }));
vi.mock('./ShareFeedbackDialog', () => ({ ShareFeedbackDialog: () => <div role="dialog">Lista privada de prueba</div> }));
beforeEach(() => {
  vi.resetAllMocks();
  useAuth.setState({ user: { id: 't', rol: 'profesor', permissions: ['grading.read'] } as User });
});
describe('entrada gradual de devoluciones', () => {
  it('solo abre cuando está habilitada y monta el diálogo fuera del menú', async () => {
    vi.mocked(feedbackAvailable).mockResolvedValue(true);
    const { container } = render(<MemoryRouter><FeedbackToolsButton evaluationId="e" /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Retroalimentaciones' }));
    const dialog = await screen.findByRole('dialog');
    expect(container.contains(dialog)).toBe(false);
  });
  it('no muestra una función deshabilitada', async () => {
    vi.mocked(feedbackAvailable).mockResolvedValue(false);
    render(<MemoryRouter><FeedbackToolsButton evaluationId="e" /></MemoryRouter>);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
