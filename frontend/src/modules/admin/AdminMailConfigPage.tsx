import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, KeyRound, MailCheck, Send, Server, ShieldCheck, TriangleAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, Card, Field, Input, QueryError, Skeleton } from '@/components/ui';
import { toApiError } from '@/lib/api';
import {
  getMailConfig,
  getRecoveryStatus,
  saveMailConfig,
  testMailConfig,
  type MailConfigUpdate,
} from './mailApi';

const initialForm: MailConfigUpdate = {
  host: 'smtp.gmail.com',
  port: 587,
  use_starttls: true,
  username: '',
  from_email: '',
  password: '',
};

export function AdminMailConfigPage() {
  const queryClient = useQueryClient();
  const configQuery = useQuery({ queryKey: ['admin-mail-config'], queryFn: getMailConfig });
  const statusQuery = useQuery({ queryKey: ['admin-mail-status'], queryFn: getRecoveryStatus });
  const [form, setForm] = useState<MailConfigUpdate>(initialForm);

  useEffect(() => {
    if (!configQuery.data) return;
    setForm({
      host: configQuery.data.host,
      port: configQuery.data.port,
      use_starttls: configQuery.data.use_starttls,
      username: configQuery.data.username,
      from_email: configQuery.data.from_email ?? '',
      password: '',
    });
  }, [configQuery.data]);

  const saveMutation = useMutation({
    mutationFn: saveMailConfig,
    onSuccess: () => {
      toast.success('Configuración de correo guardada.');
      setForm((current) => ({ ...current, password: '' }));
      void queryClient.invalidateQueries({ queryKey: ['admin-mail-config'] });
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });
  const testMutation = useMutation({
    mutationFn: testMailConfig,
    onSuccess: (result) => {
      if (result.status === 'success') toast.success(result.detail);
      else toast.error(result.detail);
      void queryClient.invalidateQueries({ queryKey: ['admin-mail-config'] });
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    saveMutation.mutate({
      ...form,
      host: form.host.trim(),
      username: form.username.trim(),
      from_email: form.from_email.trim(),
      password: form.password?.trim() || undefined,
    });
  };

  const stats = statusQuery.data;
  const lastTestSummary = configQuery.data?.last_test_status === 'success'
    ? 'Correcta' + (configQuery.data.last_test_latency_ms ? ' · ' + configQuery.data.last_test_latency_ms + ' ms' : '')
    : configQuery.data?.last_test_status === 'error'
      ? 'Falló. Revisa las credenciales y vuelve a intentar.'
      : 'Todavía no se ha enviado una prueba.';

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-800 via-brand-600 to-sky-600 p-6 text-white shadow-lg sm:p-8">
        <Badge className="border-white/20 bg-white/15 text-white">Administración</Badge>
        <h1 className="mt-3 font-display text-3xl font-extrabold">Correo y recuperación</h1>
        <p className="mt-2 max-w-2xl text-brand-50">
          Configura el remitente institucional para recuperar contraseñas. La clave se cifra y nunca vuelve a mostrarse.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        {statusQuery.isLoading ? [1, 2, 3].map((item) => <Skeleton key={item} className="h-28" />) : (
          <>
            <Card className="p-5"><p className="text-sm font-semibold text-muted">Pendientes</p><p className="mt-2 text-3xl font-extrabold">{stats?.pending ?? 0}</p></Card>
            <Card className="p-5"><p className="text-sm font-semibold text-muted">Enviados · 24 h</p><p className="mt-2 text-3xl font-extrabold text-emerald-600">{stats?.sent_last_24h ?? 0}</p></Card>
            <Card className="p-5"><p className="text-sm font-semibold text-muted">Fallidos · 24 h</p><p className="mt-2 text-3xl font-extrabold text-rose-600">{stats?.failed_last_24h ?? 0}</p></Card>
          </>
        )}
      </div>

      {configQuery.isLoading && <Skeleton className="h-[32rem]" />}
      {configQuery.isError && <QueryError title="No pudimos cargar la configuración de correo" error={configQuery.error} onRetry={() => void configQuery.refetch()} />}
      {configQuery.data && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <Card className="p-5 sm:p-7">
            <form onSubmit={submit} className="space-y-5">
              <div>
                <h2 className="font-display text-xl font-bold">Servidor SMTP</h2>
                <p className="mt-1 text-sm text-muted">Compatible con Gmail y otros proveedores SMTP con STARTTLS.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
                <Field label="Servidor" required>
                  <Input value={form.host} onChange={(event) => setForm({ ...form, host: event.target.value })} placeholder="smtp.gmail.com" />
                </Field>
                <Field label="Puerto" required>
                  <Input type="number" min={1} max={65535} value={form.port} onChange={(event) => setForm({ ...form, port: Number(event.target.value) })} />
                </Field>
              </div>
              <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm font-semibold">
                <input type="checkbox" checked={form.use_starttls} onChange={(event) => setForm({ ...form, use_starttls: event.target.checked })} className="h-5 w-5 accent-brand-600" />
                Usar conexión segura STARTTLS
              </label>
              <Field label="Usuario SMTP" required hint="En Gmail suele ser la dirección completa de correo.">
                <Input type="email" autoComplete="username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
              </Field>
              <Field label="Correo remitente" required hint="Los mensajes de prueba se enviarán a esta misma dirección.">
                <Input type="email" value={form.from_email} onChange={(event) => setForm({ ...form, from_email: event.target.value })} />
              </Field>
              <Field
                label={configQuery.data.has_password ? 'Nueva contraseña de aplicación (opcional)' : 'Contraseña de aplicación'}
                required={!configQuery.data.has_password}
                hint={configQuery.data.has_password ? 'Déjala vacía para conservar la clave cifrada actual.' : 'No uses la contraseña normal de la cuenta.'}
              >
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  placeholder={configQuery.data.has_password ? 'Clave configurada · escribe solo para reemplazar' : 'Contraseña de aplicación'}
                />
              </Field>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" loading={saveMutation.isPending} loadingLabel="Guardando…">
                  <ShieldCheck className="h-4 w-4" /> Guardar configuración
                </Button>
                <Button type="button" variant="secondary" onClick={() => testMutation.mutate()} loading={testMutation.isPending} loadingLabel="Enviando…" disabled={!configQuery.data.configured}>
                  <Send className="h-4 w-4" /> Enviar prueba
                </Button>
              </div>
            </form>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200"><Server className="h-5 w-5" /></span>
                <div>
                  <p className="font-bold">Estado del servicio</p>
                  <Badge className="mt-2" tone={configQuery.data.configured ? 'success' : 'warning'}>
                    {configQuery.data.configured ? 'Configurado' : 'Falta configuración'}
                  </Badge>
                  <p className="mt-2 text-sm text-muted">Origen: {configQuery.data.source === 'database' ? 'Panel administrativo' : configQuery.data.source === 'environment' ? 'Entorno del servidor' : 'Sin configurar'}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-start gap-3">
                {configQuery.data.last_test_status === 'success'
                  ? <MailCheck className="mt-0.5 h-5 w-5 text-emerald-600" />
                  : configQuery.data.last_test_status === 'error'
                    ? <TriangleAlert className="mt-0.5 h-5 w-5 text-rose-600" />
                    : <KeyRound className="mt-0.5 h-5 w-5 text-muted" />}
                <div>
                  <p className="font-bold">Última prueba</p>
                  <p className="mt-1 text-sm text-muted">{lastTestSummary}</p>
                  {configQuery.data.last_test_status === 'success' && <CheckCircle2 className="mt-3 h-5 w-5 text-emerald-600" />}
                </div>
              </div>
            </Card>
            <Card className="border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              <p className="font-bold">Seguridad</p>
              <p className="mt-2 text-sm leading-6">Al reemplazar la contraseña anterior se pierde de forma atómica. La interfaz nunca puede recuperarla ni copiarla.</p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
