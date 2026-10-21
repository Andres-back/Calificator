import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublicFeedbackEvidence } from './PublicFeedbackEvidence';
import { FeedbackAccessError, type PublicFeedbackClient } from './publicApi';

afterEach(() => vi.unstubAllGlobals());
describe('evidencia individual opcional', () => {
  it('consulta solo al abrir, usa blob privado y libera URL al cerrar', async () => {
    const create = vi.fn().mockReturnValue('blob:private-test'); const revoke = vi.fn();
    vi.stubGlobal('URL', class extends URL { static createObjectURL = create; static revokeObjectURL = revoke; });
    const evidence = vi.fn().mockResolvedValue({ blob: new Blob(['synthetic']), pages: 2 });
    const client = { evidence } as unknown as PublicFeedbackClient;
    render(<PublicFeedbackEvidence client={client} onUnavailable={vi.fn()} />);
    expect(evidence).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Ver foto de tu entrega' }));
    expect(await screen.findByAltText('Tu entrega, hoja 1')).toHaveAttribute('src', 'blob:private-test');
    expect(evidence).toHaveBeenCalledWith(1, expect.any(AbortSignal));
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar foto de tu entrega' }));
    await waitFor(() => expect(revoke).toHaveBeenCalledWith('blob:private-test'));
  });
  it('el cierre de acceso no deja la imagen anterior en pantalla', async () => {
    const closed = vi.fn();
    const client = { evidence: vi.fn().mockRejectedValue(new FeedbackAccessError(404)) } as unknown as PublicFeedbackClient;
    render(<PublicFeedbackEvidence client={client} onUnavailable={closed} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver foto de tu entrega' }));
    await waitFor(() => expect(closed).toHaveBeenCalledOnce());
    expect(screen.queryByRole('img')).toBeNull();
  });
});
