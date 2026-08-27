import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RequestPasswordResetPage } from './RequestPasswordResetPage';

const recovery = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('./passwordRecoveryApi', () => ({
  PASSWORD_RECOVERY_MESSAGE: 'Si existe una cuenta activa con ese correo, recibirás instrucciones para restablecer tu contraseña.',
  requestPasswordRecovery: recovery.request,
}));

describe('Password recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recovery.request.mockResolvedValue({ detail: 'neutral' });
  });

  it('submits an email and always presents the neutral confirmation', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><RequestPasswordResetPage /></MemoryRouter>);

    await user.type(screen.getByLabelText(/Correo electrónico/), 'persona@example.com');
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }));

    await waitFor(() => expect(recovery.request).toHaveBeenCalledWith('persona@example.com'));
    expect(screen.getByText(/Si existe una cuenta activa/)).toBeInTheDocument();
    expect(screen.queryByText(/no existe/i)).not.toBeInTheDocument();
  });
});