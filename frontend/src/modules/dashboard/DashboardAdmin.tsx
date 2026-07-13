import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, ArrowRight, Bot, FileText, Presentation, Settings2, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { Badge, Card, Skeleton } from '@/components/ui';
import { getAISettings } from '@/modules/admin/api';
import { toApiError } from '@/lib/api';
import { useAuth } from '@/stores/auth';

const quickLinks = [
  { to: '/app/admin/configuracion-ia', label: 'IA y credenciales', description: 'Claves, modelos, ruteo y consistencia', icon: Settings2, tone: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300' },
  { to: '/app/presentaciones', label: 'Presentaciones', description: 'Revisar generación y exportación', icon: Presentation, tone: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300' },
  { to: '/app/reportes', label: 'Reportes', description: 'Consultar indicadores disponibles', icon: FileText, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' },
  { to: '/app/xali', label: 'Asistente Xali', description: 'Acceder al asistente institucional', icon: Sparkles, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300' },
];

function formatCost(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'USD', maximumFractionDigits: 3 }).format(value);
}

export function DashboardAdmin() {
  const user = useAuth((state) => state.user);
  const settingsQuery = useQuery({
    queryKey: ['admin', 'ai-settings'],
    queryFn: getAISettings,
  });
  const firstName = user?.nombre?.split(' ')[0] ?? 'Administrador';

  const providers = settingsQuery.data?.providers ?? [];
  const activeProviders = providers.filter((provider) => provider.active);
  const configuredProviders = activeProviders.filter((provider) => provider.auth_configured).length;
  const providerAlerts = providers.filter((provider) => provider.last_test_status === 'error' || provider.last_test_status === 'failed');
  const usage = settingsQuery.data?.usage;

  return (
    <div className="space-y-7">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-border pb-6"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-500/20 bg-brand-500/10 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:text-brand-200">
              <ShieldCheck className="h-3.5 w-3.5" /> Administración de plataforma
            </span>
            <h1 className="mt-3 font-display text-3xl font-extrabold">Hola, {firstName}</h1>
            <p className="mt-2 max-w-2xl text-muted">
              Supervisa la disponibilidad operativa de IA y administra los accesos institucionales disponibles.
            </p>
          </div>
          <Link to="/app/admin/configuracion-ia" className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-brand-600 bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700">
            <Settings2 className="h-4 w-4" /> Administrar IA
          </Link>
        </div>
      </motion.section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {settingsQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32" />)
        ) : (
          <>
            <StatusCard icon={Bot} label="Proveedores activos" value={`${activeProviders.length}`} detail={`${configuredProviders} con credenciales configuradas`} tone="brand" />
            <StatusCard icon={Activity} label="Llamadas de IA" value={`${usage?.total_calls ?? 0}`} detail="Uso registrado por la plataforma" tone="success" />
            <StatusCard icon={AlertTriangle} label="Alertas de proveedor" value={`${providerAlerts.length}`} detail={providerAlerts.length ? 'Requieren revisión técnica' : 'Sin errores reportados'} tone={providerAlerts.length ? 'warning' : 'success'} />
            <StatusCard icon={Sparkles} label="Costo estimado" value={formatCost(usage?.total_cost ?? 0)} detail="Acumulado registrado" tone="neutral" />
          </>
        )}
      </section>

      {settingsQuery.isError && (
        <Card className="border-rose-200 p-5 dark:border-rose-500/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-rose-700 dark:text-rose-200">No fue posible consultar el estado de IA</p>
              <p className="mt-1 text-sm text-muted">{toApiError(settingsQuery.error).detail}</p>
            </div>
            <button type="button" onClick={() => void settingsQuery.refetch()} className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-surface-2">
              Reintentar
            </button>
          </div>
        </Card>
      )}

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Administración</p>
            <h2 className="mt-1 font-display text-xl font-bold">Accesos de plataforma</h2>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((item) => (
            <Link key={item.to} to={item.to}>
              <Card interactive className="group flex h-full items-center gap-3 p-4">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${item.tone}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm">{item.label}</p>
                  <p className="mt-0.5 text-xs text-muted">{item.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-surface-2 text-brand-500"><AlertTriangle className="h-5 w-5" /></span>
            <div>
              <h2 className="font-display font-bold">Alertas de proveedores</h2>
              <p className="text-sm text-muted">Resultados de las últimas pruebas registradas.</p>
            </div>
          </div>
          {settingsQuery.isLoading ? (
            <Skeleton className="mt-5 h-16" />
          ) : providerAlerts.length === 0 ? (
            <p className="mt-5 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">No hay proveedores con errores reportados.</p>
          ) : (
            <ul className="mt-5 divide-y divide-border">
              {providerAlerts.map((provider) => (
                <li key={provider.name} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-semibold">{provider.label}</p>
                    <p className="text-xs text-muted">{provider.last_test_error ?? 'La última prueba no fue satisfactoria.'}</p>
                  </div>
                  <Badge tone="warning">Revisar</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-surface-2 text-muted"><Users className="h-5 w-5" /></span>
            <div>
              <h2 className="font-display font-bold">Usuarios</h2>
              <p className="text-sm text-muted">Administración de cuentas</p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-6 text-muted">
            El módulo de usuarios todavía no está disponible en este entorno. No se muestra una acción que no tenga un endpoint autorizado.
          </p>
        </Card>
      </section>
    </div>
  );
}

function StatusCard({ icon: Icon, label, value, detail, tone }: {
  icon: typeof Activity;
  label: string;
  value: string;
  detail: string;
  tone: 'brand' | 'success' | 'warning' | 'neutral';
}) {
  const tones = {
    brand: 'bg-brand-500/10 text-brand-600 dark:text-brand-300',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
    neutral: 'bg-surface-2 text-muted',
  };
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-lg ${tones[tone]}`}><Icon className="h-5 w-5" /></span>
        <Badge tone={tone === 'neutral' ? 'neutral' : tone}>{tone === 'warning' ? 'Atención' : 'Actual'}</Badge>
      </div>
      <p className="mt-5 text-2xl font-extrabold">{value}</p>
      <p className="mt-1 text-sm font-semibold">{label}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </Card>
  );
}
