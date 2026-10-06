import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button, Card, Field, Input } from '@/components/ui';
import { routes } from '@/config/routes';
import { toApiError } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { updateMyProfile, type ProfileUpdate } from './api';

export function ProfilePage() {
  const { user, fetchMe, clearSession } = useAuth();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState(user?.nombre ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field: string; message: string } | null>(null);
  const active = useRef(true);
  const [owner] = useState(user?.id);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const emailChanged = email.trim().toLowerCase() !== user?.email.toLowerCase();
  const changed = nombre.trim() !== user?.nombre || emailChanged || Boolean(password);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !changed || !user || user.id !== owner) return;
    setError(null);
    if (password && password !== confirmation) return setError({ field: 'confirmation', message: 'Las contraseñas no coinciden' });
    if ((emailChanged || password) && !currentPassword) return setError({ field: 'current', message: 'Escribe tu contraseña actual para confirmar el cambio' });
    const payload: ProfileUpdate = {};
    if (nombre.trim() !== user.nombre) payload.nombre = nombre.trim();
    if (emailChanged) payload.email = email.trim().toLowerCase();
    if (password) payload.password = password;
    if (emailChanged || password) payload.current_password = currentPassword;
    setBusy(true);
    try {
      const updated = await updateMyProfile(payload);
      if (!active.current || useAuth.getState().user?.id !== owner) return;
      setCurrentPassword(''); setPassword(''); setConfirmation('');
      if (payload.password) {
        clearSession();
        toast.success('Contraseña guardada. Inicia sesión con tu nueva clave.');
        navigate(routes.login, { replace: true });
      } else {
        setNombre(updated.nombre); setEmail(updated.email);
        await fetchMe();
        toast.success('Perfil actualizado');
      }
    } catch (failure) {
      if (active.current && useAuth.getState().user?.id === owner) {
        const detail = toApiError(failure);
        setError({ field: detail.status === 409 ? 'email' : detail.detail.includes('contraseña actual') ? 'current' : 'general', message: detail.detail });
      }
    } finally { if (active.current) setBusy(false); }
  }
  if (!user || user.id !== owner) return null;
  return <div className="mx-auto w-full max-w-2xl space-y-4">
    <h1 className="font-display text-2xl font-bold">Mi perfil</h1>
    <p className="text-sm text-muted">Actualiza tus datos de acceso. Tus materias y notas no cambian.</p>
    <Card className="p-4 sm:p-6"><form className="space-y-5" onSubmit={(event) => void submit(event)}>
      {error?.field === 'general' && <p role="alert" className="text-sm text-error">{error.message}</p>}
      <fieldset disabled={busy} className="space-y-5">
        <Field label="Nombre completo"><Input autoComplete="name" className="text-base" required minLength={2} maxLength={160} value={nombre} onChange={(event) => { setNombre(event.target.value); setError(null); }} /></Field>
        <Field label="Correo de acceso" hint="Este será el correo para iniciar sesión." error={error?.field === 'email' ? error.message : undefined}><Input aria-label="Correo de acceso" type="email" autoComplete="email" className="text-base" required value={email} onChange={(event) => { setEmail(event.target.value); setError(null); }} aria-invalid={error?.field === 'email'} /></Field>
        <Field label="Contraseña actual" hint="Solo se necesita para cambiar el correo o la contraseña." error={error?.field === 'current' ? error.message : undefined}><Input aria-label="Contraseña actual" type="password" autoComplete="current-password" className="text-base" maxLength={128} value={currentPassword} onChange={(event) => { setCurrentPassword(event.target.value); setError(null); }} aria-invalid={error?.field === 'current'} /></Field>
        <details className="rounded-xl border border-border p-3"><summary className="focus-ring min-h-11 cursor-pointer content-center rounded-lg font-semibold">Cambiar contraseña</summary><div className="mt-4 space-y-4">
          <p className="text-sm text-muted">Al guardar una nueva clave se cerrarán tus sesiones. Tendrás que volver a ingresar.</p>
          <Field label="Nueva contraseña"><Input type="password" autoComplete="new-password" className="text-base" minLength={8} maxLength={128} value={password} onChange={(event) => { setPassword(event.target.value); setError(null); }} /></Field>
          <Field label="Confirmar nueva contraseña" error={error?.field === 'confirmation' ? error.message : undefined}><Input aria-label="Confirmar nueva contraseña" type="password" autoComplete="new-password" className="text-base" maxLength={128} value={confirmation} onChange={(event) => { setConfirmation(event.target.value); setError(null); }} aria-invalid={error?.field === 'confirmation'} /></Field>
        </div></details>
      </fieldset>
      <Button className="min-h-11 w-full sm:w-auto" type="submit" loading={busy} disabled={!changed || busy}>Guardar cambios</Button>
    </form></Card>
  </div>;
}
