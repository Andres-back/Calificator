import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedbackAccessList } from './FeedbackAccessList';
import { changeFeedbackAccess, type FeedbackAccess } from './api';

vi.mock('./api', () => ({ changeFeedbackAccess: vi.fn() }));
const access: FeedbackAccess = { id: 'a', calificacion_id: 'g', estudiante: 'Ana', estado: 'expired', version: 2, fingerprint: 'a'.repeat(64), expires_at: '2026-01-01' };
beforeEach(() => vi.resetAllMocks());
describe('control docente de vigencia', () => {
  it('distingue reemplazar de reactivar y exige confirmación', async () => {
    vi.mocked(changeFeedbackAccess).mockResolvedValue({ ...access, url: null });
    render(<FeedbackAccessList accesses={[access]} previews={[]} signal={new AbortController().signal} valid={() => true} onChanged={vi.fn()} onIssued={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Reactivar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Reemplazar enlace' }));
    expect(screen.getByText(/Esto no amplía su duración ni reactiva/)).toBeInTheDocument();
    expect(changeFeedbackAccess).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cambio' }));
    await waitFor(() => expect(changeFeedbackAccess).toHaveBeenCalledWith(access, 'renovar', expect.objectContaining({ expected_version: 2, confirmar_reemplazo: true }), expect.any(AbortSignal)));
  });
  it('reintenta con la misma identidad tras un resultado incierto', async () => {
    vi.mocked(changeFeedbackAccess).mockRejectedValue(new Error('connection'));
    render(<FeedbackAccessList accesses={[{ ...access, estado: 'active' }]} previews={[]} signal={new AbortController().signal} valid={() => true} onChanged={vi.fn()} onIssued={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cambio' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cambio' }));
    await waitFor(() => expect(changeFeedbackAccess).toHaveBeenCalledTimes(2));
    expect(vi.mocked(changeFeedbackAccess).mock.calls[0][2]).toEqual(vi.mocked(changeFeedbackAccess).mock.calls[1][2]);
  });
});
