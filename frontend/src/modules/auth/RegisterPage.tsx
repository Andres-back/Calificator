import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, LockKeyhole, Mail, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Card, Field, Input, ThemeToggle } from '@/components/ui';
import { toApiError } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { routes } from '@/config/routes';

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuth((state) => state.register);
  const [form, setForm] = useState({ nombre: '', email: '', password: '', confirmacion: '', solicitar_docente: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (form.password !== form.confirmacion) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      await register({
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        password: form.password,
        solicitar_docente: form.solicitar_docente,
      });
      toast.success(
        form.solicitar_docente
          ? 'Cuenta creada. Tu solicitud para ser docente está pendiente de revisión.'
          : 'Cuenta creada correctamente.',
      );
      navigate(routes.app, { replace: true });
    } catch (cause) {
      setError(toApiError(cause).detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-surface px-4 py-10 text-fg">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,.14),transparent_32%)]" />
      <div className="absolute right-4 top-4 z-10"><ThemeToggle /></div>
      <Card className="relative w-full max-w-lg p-6 shadow-xl sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <img src="/branding/logo-full.png" alt="XCalificator" className="h-14 w-14 rounded-xl object-contain" />
          <div>
            <h1 className="font-display text-2xl font-extrabold">Crear cuenta</h1>
            <p className="text-sm text-muted">Empieza como estudiante de forma segura.</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nombre completo" required>
            <div className="relative"><UserRound className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted" /><Input className="pl-10" required minLength={2} autoComplete="name" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
          </Field>
          <Field label="Correo electrónico" required>
            <div className="relative"><Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted" /><Input className="pl-10" type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contraseña" required><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted" /><Input className="pl-10" type="password" minLength={8} required autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div></Field>
            <Field label="Confirmar contraseña" required><Input type="password" minLength={8} required autoComplete="new-password" value={form.confirmacion} onChange={(e) => setForm({ ...form, confirmacion: e.target.value })} /></Field>
          </div>
          <label className="focus-within:ring-2 focus-within:ring-brand-500 flex min-h-16 cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface-2 p-4">
            <input type="checkbox" className="mt-1 h-5 w-5 accent-brand-600" checked={form.solicitar_docente} onChange={(e) => setForm({ ...form, solicitar_docente: e.target.checked })} />
            <span><span className="flex items-center gap-2 font-semibold"><GraduationCap className="h-4 w-4 text-brand-600" /> Solicitar acceso como docente</span><span className="mt-1 block text-sm leading-5 text-muted">Un administrador revisará la solicitud. Mientras tanto podrás usar la cuenta como estudiante.</span></span>
          </label>
          {error && <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">{error}</div>}
          <Button type="submit" size="lg" className="w-full" loading={loading} loadingLabel="Creando cuenta…">Crear mi cuenta</Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted">¿Ya tienes cuenta? <Link className="font-semibold text-brand-600 hover:underline" to={routes.login}>Iniciar sesión</Link></p>
      </Card>
    </main>
  );
}
