import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, KeyRound, Mail } from 'lucide-react';
import { Button, Card, Field, Input, ThemeToggle } from '@/components/ui';
import { routes } from '@/config/routes';
import { toApiError } from '@/lib/api';
import { PASSWORD_RECOVERY_MESSAGE, requestPasswordRecovery } from './passwordRecoveryApi';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RequestPasswordResetPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = email.trim();
    if (!EMAIL_PATTERN.test(normalized)) {
      setError('Ingresa un correo válido.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await requestPasswordRecovery(normalized);
      setSent(true);
    } catch (requestError) {
      const apiError = toApiError(requestError);
      setError(apiError.status === 429
        ? 'Has realizado varias solicitudes. Espera un momento antes de intentar de nuevo.'
        : apiError.detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-surface px-4 py-10 text-fg">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,.14),transparent_32%)]" />
      <div className="absolute right-5 top-5 z-10"><ThemeToggle /></div>
      <Card className="relative w-full max-w-md p-6 shadow-xl sm:p-8">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
          {sent ? <CheckCircle2 className="h-7 w-7" /> : <KeyRound className="h-7 w-7" />}
        </div>
        <h1 className="text-center font-display text-2xl font-extrabold">
          {sent ? 'Revisa tu correo' : 'Recupera tu acceso'}
        </h1>
        <p className="mt-3 text-center text-sm leading-6 text-muted">
          {sent ? PASSWORD_RECOVERY_MESSAGE : 'Escribe el correo de tu cuenta y te enviaremos un enlace seguro.'}
        </p>

        {!sent && (
          <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
            <Field label="Correo electrónico" required error={error || undefined}>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => { setEmail(event.target.value); setError(''); }}
                  className="pl-10"
                  placeholder="tu@correo.com"
                  aria-invalid={Boolean(error)}
                />
              </div>
            </Field>
            <Button type="submit" size="lg" className="w-full" loading={loading} loadingLabel="Enviando…">
              Enviar enlace
            </Button>
          </form>
        )}

        {sent && (
          <Button variant="secondary" className="mt-7 w-full" onClick={() => { setSent(false); setEmail(''); }}>
            Enviar a otro correo
          </Button>
        )}
        <p className="mt-5 text-center text-sm">
          <Link to={routes.login} className="font-bold text-brand-600 hover:underline dark:text-brand-300">
            Volver al inicio de sesión
          </Link>
        </p>
      </Card>
    </div>
  );
}