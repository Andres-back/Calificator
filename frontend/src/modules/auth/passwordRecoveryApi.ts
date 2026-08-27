import { api } from '@/lib/api';

export const PASSWORD_RECOVERY_MESSAGE =
  'Si existe una cuenta activa con ese correo, recibirás instrucciones para restablecer tu contraseña.';

export async function requestPasswordRecovery(email: string) {
  const { data } = await api.post<{ detail: string }>('/auth/password-recovery/request', { email });
  return data;
}

export async function validatePasswordReset(token: string) {
  const { data } = await api.post<{ valid: boolean; detail: string }>(
    '/auth/password-recovery/validate',
    { token },
  );
  return data;
}

export async function resetPassword(
  token: string,
  password: string,
  passwordConfirmation: string,
) {
  const { data } = await api.post<{ detail: string }>('/auth/password-recovery/reset', {
    token,
    password,
    password_confirmation: passwordConfirmation,
  });
  return data;
}