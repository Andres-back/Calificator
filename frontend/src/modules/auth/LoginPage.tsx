import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { BookOpenCheck, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { Button, Card, Field, Input, LoadingScreen, ThemeToggle } from '@/components/ui';
import { toApiError } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import type { UserRole } from '@/types/api';

const LAST_EMAIL_KEY = 'xcalificator:last-login-email';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = {
  email?: string;
  password?: string;
  general?: string;
};

function getLandingPath(role?: UserRole) {
  if (role === 'estudiante') return '/app/materias';
  return '/app';
}

function friendlyLoginError(error: unknown) {
  const apiError = toApiError(error);
  if (apiError.status === 0) return 'No se pudo conectar con el servidor. Intenta nuevamente.';
  if (apiError.status === 401 || apiError.status === 403) return 'Correo o contraseña incorrectos.';
  return 'No fue posible iniciar sesión. Intenta nuevamente.';
}

function validateLogin(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!email.trim()) errors.email = 'El correo es requerido.';
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Ingresa un correo válido.';
  if (!password) errors.password = 'La contraseña es requerida.';
  return errors;
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login, status, user } = useAuth();
  const [email, setEmail] = useState(() => localStorage.getItem(LAST_EMAIL_KEY) ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const landingPath = useMemo(() => getLandingPath(user?.rol), [user?.rol]);

  useEffect(() => {
    if (status === 'authenticated') {
      navigate(landingPath, { replace: true });
    }
  }, [landingPath, navigate, status]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    const validationErrors = validateLogin(email, password);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setLoading(true);
    try {
      const loggedUser = await login(email.trim(), password);
      localStorage.setItem(LAST_EMAIL_KEY, email.trim());
      toast.success('Bienvenido a XCalificator');
      navigate(getLandingPath(loggedUser.rol), { replace: true });
    } catch (error) {
      setErrors({ general: friendlyLoginError(error) });
    } finally {
      setLoading(false);
    }
  };

  if (status === 'authenticated') {
    return (
      <div className="grid min-h-screen place-items-center">
        <LoadingScreen label="Redirigiendo..." />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface text-fg">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.13),transparent_30%)]" />
      <div className="absolute inset-0 z-0">
        <img
          src="/branding/pattern-hero.png"
          alt=""
          className="h-full w-full object-cover opacity-[0.06] dark:opacity-[0.04]"
        />
      </div>
      <div className="absolute right-5 top-5 z-10">
        <ThemeToggle />
      </div>

      <main className="relative grid min-h-screen place-items-center px-4 py-10 sm:px-6">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
          <section className="hidden lg:block">
            <div className="mb-8 flex items-center gap-3">
              <img src="/branding/logo-full.png" alt="XCalificator" className="h-14 w-14 rounded-xl object-contain" />
              <div>
                <p className="font-display text-2xl font-extrabold">XCalificator</p>
                <p className="text-sm text-muted">Evaluación asistida por IA</p>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="max-w-xl"
            >
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-400/20 dark:bg-brand-500/15 dark:text-brand-200">
                <Sparkles className="h-3.5 w-3.5" />
                La IA sugiere. El docente decide.
              </p>
              <h1 className="font-display text-5xl font-extrabold leading-tight">
                Plataforma educativa para evaluar con criterio docente.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-muted">
                Plataforma de apoyo docente para crear, resolver y calificar evaluaciones con IA.
              </p>

              <div className="mt-6">
                <img
                  src="/branding/hero-login.png"
                  alt="XCalificator - IA para educación"
                  className="w-full max-w-md rounded-2xl shadow-lg"
                />
              </div>

              <div className="mt-8 grid gap-3">
                {[
                  { icon: BookOpenCheck, text: 'Crea evaluaciones y recursos en un flujo ordenado.' },
                  { icon: ShieldCheck, text: 'Mantiene al docente como autoridad final de la nota.' },
                  { icon: LockKeyhole, text: 'Acceso seguro mediante sesion protegida por el backend.' },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3 text-sm text-muted">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-surface-2 text-brand-500">
                      <item.icon className="h-4.5 w-4.5" />
                    </div>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </section>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="mx-auto w-full max-w-md p-6 shadow-lg sm:p-8">
              <div className="mb-7 text-center">
                <img src="/branding/logo-full.png" alt="XCalificator" className="mx-auto mb-4 h-16 w-16 rounded-xl object-contain lg:hidden" />
                <p className="font-display text-2xl font-extrabold">XCalificator</p>
                <p className="mt-2 text-sm font-semibold text-brand-600 dark:text-brand-300">La IA sugiere. El docente decide.</p>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Plataforma de apoyo docente para crear, resolver y calificar evaluaciones con IA.
                </p>
              </div>

              <form onSubmit={submit} className="space-y-4" noValidate>
                <Field label="Correo electrónico" required>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setErrors((current) => ({ ...current, email: undefined, general: undefined }));
                      }}
                      placeholder="docente@colegio.edu.co"
                      autoComplete="email"
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? 'email-error' : undefined}
                      className="pl-10"
                    />
                  </div>
                  {errors.email && <span id="email-error" className="block text-xs font-medium text-rose-600">{errors.email}</span>}
                </Field>

                <Field label="Contraseña" required>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setErrors((current) => ({ ...current, password: undefined, general: undefined }));
                      }}
                      placeholder="Tu contraseña"
                      autoComplete="current-password"
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={errors.password ? 'password-error' : undefined}
                      className="pl-10 pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg focus-ring"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <span id="password-error" className="block text-xs font-medium text-rose-600">{errors.password}</span>}
                </Field>

                {errors.general && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                    {errors.general}
                  </div>
                )}

                <Button type="submit" size="lg" loading={loading} disabled={loading} className="w-full">
                  Iniciar sesion
                </Button>
              </form>

              <div className="mt-5 flex items-center justify-between gap-3 text-xs text-muted">
                <span>Tu contraseña nunca se guarda en este dispositivo.</span>
                <span className="rounded-full bg-surface-2 px-2.5 py-1 font-semibold">Recuperar: próximamente</span>
              </div>

              {/* Quick access — temporal, para desarrollo */}
              <div className="mt-5 border-t border-border pt-4">
                <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted">Accesos rápidos</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setLoading(true);
                      setErrors({});
                      try {
                        const loggedUser = await login('profesor@test.com', 'Test1234!');
                        localStorage.setItem(LAST_EMAIL_KEY, 'profesor@test.com');
                        toast.success('Bienvenido a XCalificator');
                        navigate(getLandingPath(loggedUser.rol), { replace: true });
                      } catch (error) {
                        setErrors({ general: friendlyLoginError(error) });
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="flex-1 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300"
                  >
                    👨‍🏫 Profesor
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setLoading(true);
                      setErrors({});
                      try {
                        const loggedUser = await login('estudiante@test.com', 'Test1234!');
                        localStorage.setItem(LAST_EMAIL_KEY, 'estudiante@test.com');
                        toast.success('Bienvenido a XCalificator');
                        navigate(getLandingPath(loggedUser.rol), { replace: true });
                      } catch (error) {
                        setErrors({ general: friendlyLoginError(error) });
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="flex-1 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-medium text-cyan-700 transition-colors hover:bg-cyan-100 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-300"
                  >
                    🎓 Estudiante
                  </button>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
