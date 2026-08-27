import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, Bot, FileText, GitCompareArrows, Presentation, Settings2, ShieldCheck, UsersRound, Sparkles } from 'lucide-react';
import { ActionCard, AlertCard, Badge, Card, MetricCard, Skeleton } from '@/components/ui';
import { getAIAudit, getAISettings, getConfigHash } from '@/modules/admin/api';
import { toApiError } from '@/lib/api';
import { useAuth } from '@/stores/auth';

const quickLinks = [
  { to: '/app/admin/usuarios', label: 'Usuarios y roles', description: 'Aprobar docentes y administrar accesos', icon: UsersRound, tone: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300' },
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
  const consistencyQuery = useQuery({
    queryKey: ['admin', 'ai-config-hash'],
    queryFn: getConfigHash,
  });
  const auditQuery = useQuery({
    queryKey: ['admin', 'ai-audit', 6],
    queryFn: () => getAIAudit(6),
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

      {providerAlerts.length > 0 && (
        <AlertCard
          tone="error"
          title={`${providerAlerts.length} proveedor${providerAlerts.length === 1 ? '' : 'es'} de IA requiere${providerAlerts.length === 1 ? '' : 'n'} atención`}
          description="La última prueba reportó un error. Revisa el proveedor antes de depender de ese flujo."
          action={<Link to="/app/admin/configuracion-ia" className="focus-ring inline-flex min-h-11 items-center rounded-lg border border-rose-700 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50 dark:text-rose-200 dark:hover:bg-rose-500/10">Revisar proveedores</Link>}
        />
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Estado de la plataforma">
        {settingsQuery.isLoading ? (
          Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-36" />)
        ) : (
          <>
            <MetricCard icon={Bot} label="Proveedores activos" value={activeProviders.length} context={`${configuredProviders} con credenciales configuradas`} tone="brand" status="Actual" />
            <MetricCard icon={AlertTriangle} label="Alertas de proveedor" value={providerAlerts.length} context={providerAlerts.length ? 'Requieren revisión técnica' : 'Sin errores reportados'} tone={providerAlerts.length ? 'warning' : 'success'} status={providerAlerts.length ? 'Atención' : 'Correcto'} />
            <MetricCard icon={GitCompareArrows} label="Backend y worker" value={consistencyQuery.isLoading ? '—' : consistencyQuery.data?.consistent ? 'Consistentes' : 'Revisar'} context={consistencyQuery.data?.consistent ? 'Ambos usan la misma configuración' : 'Comprueba el estado del worker'} tone={consistencyQuery.data?.consistent ? 'success' : 'warning'} status="Configuración" />
            <MetricCard icon={Activity} label="Llamadas de IA" value={usage?.total_calls ?? 0} context="Uso registrado por la plataforma" tone="info" status="Acumulado" />
            <MetricCard icon={Sparkles} label="Costo estimado" value={formatCost(usage?.total_cost ?? 0)} context="Costo acumulado informado por los proveedores" tone="neutral" status="Referencia" />
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
            <ActionCard key={item.to} to={item.to} icon={item.icon} title={item.label} description={item.description} />
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
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-surface-2 text-secondary"><FileText className="h-5 w-5" aria-hidden="true" /></span>
            <div>
              <h2 className="font-display font-bold">Últimos cambios administrativos</h2>
              <p className="text-sm text-secondary">Registro reciente de configuración</p>
            </div>
          </div>
          {auditQuery.isLoading ? (
            <Skeleton className="mt-5 h-24" />
          ) : auditQuery.data?.logs.length ? (
            <ul className="mt-5 divide-y divide-border">
              {auditQuery.data.logs.slice(0, 4).map((log, index) => (
                <li key={`${log.created_at ?? 'sin-fecha'}-${index}`} className="py-3">
                  <p className="text-sm font-semibold text-fg">{log.action}</p>
                  <p className="mt-0.5 text-xs text-secondary">{log.entity}{log.field ? ` · ${log.field}` : ''}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-sm leading-6 text-secondary">Todavía no hay cambios administrativos registrados.</p>
          )}
        </Card>
      </section>
    </div>
  );
}
