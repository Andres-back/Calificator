import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import { Button, Card, Field, Input, LoadingScreen, ThemeToggle } from '@/components/ui';
import { routes } from '@/config/routes';
import { toApiError } from '@/lib/api';
import { resetPassword, validatePasswordReset } from './passwordRecoveryApi';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => params.get('token') ?? '', [params]);
  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [detail, setDetail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let active = true;
    if (!token) {
      setValidating(false);
      setDetail('El enlace no es válido. Solicita uno nuevo.');
      return () => { active = false; };
    }
    validatePasswordReset(token)
      .then((result) => {
        if (!active) return;
        setValid(result.valid);
        setDetail(result.detail);
      })
      .catch(() => {
        if (active) setDetail('No pudimos comprobar el enlace. Intenta nuevamente.');
      })
      .finally(() => { if (active) setValidating(false); });
    return () => { active = false; };
  }, [token]);

  const passwordError = password && password.length < 8
    ? 'Usa al menos 8 caracteres.'
    : confirmation && password !== confirmation
      ? 'Las contraseñas no coinciden.'
      : '';

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8 || password !== confirmation) return;
    setSaving(true);
    setDetail('');
    try {
      const result = await resetPassword(token, password, confirmation);
      setComplete(true);
      setDetail(result.detail);
      window.setTimeout(() => navigate(routes.login, { replace: true }), 2500);
    } catch (error) {
      setDetail(toApiError(error).detail);
      setValid(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-surface px-4 py-10 text-fg">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,.14),transparent_32%)]" />
      <div className="absolute right-5 top-5 z-10"><ThemeToggle /></div>
      <Card className="relative w-full max-w-md p-6 shadow-xl sm:p-8">
        {validating ? <LoadingScreen label="Comprobando enlace…" /> : (
          <>
            <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
              {complete ? <CheckCircle2 className="h-7 w-7" /> : <KeyRound className="h-7 w-7" />}
            </div>
            <h1 className="text-center font-display text-2xl font-extrabold">
              {complete ? 'Contraseña actualizada' : valid ? 'Crea una contraseña nueva' : 'Enlace no disponible'}
            </h1>
            <p className="mt-3 text-center text-sm leading-6 text-muted">{detail}</p>

            {valid && !complete && (
              <form onSubmit={submit} className="mt-7 space-y-4">
                <Field label="Nueva contraseña" required hint="Mínimo 8 caracteres.">
                  <div className="relative">
                    <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <Input
                      type={show ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="new-password"
                      className="pl-10 pr-11"
                    />
                    <button type="button" onClick={() => setShow((value) => !value)} className="focus-ring absolute right-0 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-muted" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>
                <Field label="Confirma la contraseña" required error={passwordError || undefined}>
                  <Input
                    type={show ? 'text' : 'password'}
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    autoComplete="new-password"
                    aria-invalid={Boolean(passwordError)}
                  />
                </Field>
                <Button type="submit" size="lg" className="w-full" loading={saving} loadingLabel="Guardando…" disabled={Boolean(passwordError) || !password || !confirmation}>
                  Guardar contraseña
                </Button>
              </form>
            )}

            {(!valid || complete) && (
              <div className="mt-7 grid gap-3">
                {!complete && <Link to={routes.requestPasswordReset}><Button className="w-full">Solicitar otro enlace</Button></Link>}
                <Link to={routes.login}><Button variant="secondary" className="w-full">Ir al inicio de sesión</Button></Link>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}