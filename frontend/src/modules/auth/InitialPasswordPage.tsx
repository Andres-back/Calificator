import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import { Button, Card, Field, Input } from '@/components/ui';
import { api, toApiError } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import type { AuthResponse } from '@/types/api';
import { routes } from '@/config/routes';

export function InitialPasswordPage() {
  const user = useAuth((state) => state.user);
  const fetchMe = useAuth((state) => state.fetchMe);
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  if (!user?.debe_cambiar_password) return <Navigate to={routes.app} replace />;
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (password !== confirmation) return toast.error('Las contraseñas no coinciden'); setSaving(true); try { await api.post<AuthResponse>('/auth/initial-password', { password, password_confirmation: confirmation }); await fetchMe(); toast.success('Contraseña personal guardada'); navigate(routes.app, { replace: true }); } catch (error) { toast.error(toApiError(error).detail); } finally { setSaving(false); } };
  return <main className="grid min-h-screen place-items-center bg-page p-4"><Card className="w-full max-w-md p-6"><span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-600 text-white"><KeyRound /></span><h1 className="mt-4 font-display text-2xl font-extrabold">Crea tu contraseña personal</h1><p className="mt-2 text-sm text-muted">La clave entregada por tu docente era temporal. Elige una nueva antes de continuar.</p><form className="mt-6 space-y-4" onSubmit={submit}><Field label="Nueva contraseña"><Input type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></Field><Field label="Confirmar contraseña"><Input type="password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></Field><Button type="submit" className="w-full" loading={saving}>Guardar y entrar</Button></form></Card></main>;
}
