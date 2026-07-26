import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Cpu,
  ImageIcon,
  MessageSquare,
  Server,
  ShieldCheck,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, Field, Input, Select, Skeleton, QueryError } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { toApiError } from '@/lib/api';
import {
  clearCache,
  getAIAudit,
  getAISettings,
  getConfigHash,
  restoreDefaults,
  saveFeatures,
  saveProviders,
  testProvider,
  type AIProvider,
  type FeatureRouting,
} from './api';
import { queryClient } from '@/lib/queryClient';
import { AICredentialsPanel } from './AICredentialsPanel';

const PROVIDER_ICONS: Record<string, typeof Cpu> = {
  open_code: Sparkles,
  groq: Activity,
  ollama: Server,
  template: ShieldCheck,
  openai_image: ImageIcon,
  cloudflare_image: Cpu,
};

function providerSnapshot(providers: AIProvider[] | undefined) {
  return JSON.stringify((providers ?? []).map(({ id, tipo, label, base_url, model, active, priority, timeout_seconds, max_retries }) => ({
    id,
    tipo,
    label,
    base_url,
    model,
    active,
    priority,
    timeout_seconds,
    max_retries,
  })));
}

function featureSnapshot(features: FeatureRouting[] | undefined) {
  return JSON.stringify((features ?? []).map(({ feature, label, primary_provider, fallback_provider, active }) => ({
    feature,
    label,
    primary_provider,
    fallback_provider,
    active,
  })));
}

function providerStatus(provider: AIProvider) {
  if (!provider.active) return <Badge tone="neutral">Inactivo</Badge>;
  if (provider.last_test_status === 'error' || provider.last_test_error) return <Badge tone="error">Error</Badge>;
  if (provider.auth_configured) return <Badge tone="success">Disponible</Badge>;
  return <Badge tone="warning">Sin configurar</Badge>;
}

function formatDate(value: string | null) {
  if (!value) return 'Sin registros';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

export function AdminAIConfigPage() {
  const [draftProviders, setDraftProviders] = useState<AIProvider[]>([]);
  const [draftFeatures, setDraftFeatures] = useState<FeatureRouting[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ['admin-ai-settings'],
    queryFn: getAISettings,
    retry: false,
  });
  const configHashQuery = useQuery({
    queryKey: ['admin-ai-config-hash'],
    queryFn: getConfigHash,
    retry: false,
  });
  const auditQuery = useQuery({
    queryKey: ['admin-ai-audit'],
    queryFn: () => getAIAudit(6),
    retry: false,
  });

  useEffect(() => {
    if (settingsQuery.data && Array.isArray(settingsQuery.data.providers) && Array.isArray(settingsQuery.data.features) && !hasUnsavedChanges) {
      setDraftProviders(settingsQuery.data.providers.map((provider) => ({ ...provider })));
      setDraftFeatures(settingsQuery.data.features.map((feature) => ({ ...feature })));
    }
  }, [hasUnsavedChanges, settingsQuery.data]);

  const providersChanged = useMemo(
    () => Boolean(settingsQuery.data) && providerSnapshot(draftProviders) !== providerSnapshot(settingsQuery.data!.providers),
    [draftProviders, settingsQuery.data],
  );
  const featuresChanged = useMemo(
    () => Boolean(settingsQuery.data) && featureSnapshot(draftFeatures) !== featureSnapshot(settingsQuery.data!.features),
    [draftFeatures, settingsQuery.data],
  );

  const testMutation = useMutation({
    mutationFn: (providerId: string) => testProvider(providerId),
    onSuccess: (result, providerId) => {
      setDraftProviders((providers) => providers.map((provider) => (
        provider.id === providerId
          ? {
              ...provider,
              last_test_status: result.status,
              last_test_latency_ms: result.latency_ms,
              last_test_http_code: result.http_code,
              last_test_error: result.error,
            }
          : provider
      )));
      if (result.status === 'ok') toast.success(result.detail || 'Conexión comprobada.');
      else toast.error(result.detail || 'La conexión no pudo comprobarse.');
    },
    onError: (error) => toast.error(toApiError(error).detail),
    onSettled: () => setTestingProvider(null),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const operations: Promise<unknown>[] = [];
      if (providersChanged) operations.push(saveProviders(draftProviders));
      if (featuresChanged) operations.push(saveFeatures(draftFeatures));
      await Promise.all(operations);
    },
    onSuccess: () => {
      setHasUnsavedChanges(false);
      setSaveDialogOpen(false);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-ai-settings'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-ai-config-hash'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-ai-audit'] }),
      ]);
      toast.success('Configuración de IA guardada.');
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const restoreMutation = useMutation({
    mutationFn: restoreDefaults,
    onSuccess: () => {
      setHasUnsavedChanges(false);
      setRestoreDialogOpen(false);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-ai-settings'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-ai-config-hash'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-ai-audit'] }),
      ]);
      toast.success('Configuración restaurada a valores predeterminados.');
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const clearCacheMutation = useMutation({
    mutationFn: clearCache,
    onSuccess: () => toast.success('Caché de configuración invalidada.'),
    onError: (error) => toast.error(toApiError(error).detail),
  });

  function updateProvider(providerId: string, changes: Partial<AIProvider>) {
    setDraftProviders((providers) => providers.map((provider) => (
      provider.id === providerId ? { ...provider, ...changes } : provider
    )));
    setHasUnsavedChanges(true);
  }

  function updateFeature(featureId: string, changes: Partial<FeatureRouting>) {
    setDraftFeatures((features) => features.map((feature) => (
      feature.feature === featureId ? { ...feature, ...changes } : feature
    )));
    setHasUnsavedChanges(true);
  }

  function requestSave() {
    if (!providersChanged && !featuresChanged) {
      toast('No hay cambios por guardar.');
      return;
    }
    setSaveDialogOpen(true);
  }

  if (settingsQuery.isError) {
    const apiError = toApiError(settingsQuery.error);
    return (
      <div className="space-y-6">
        <PageHeader title="Configuración de IA" subtitle="Control administrativo de proveedores y ruteo." />
        <QueryError
          error={settingsQuery.error}
          onRetry={() => void settingsQuery.refetch()}
          title={apiError.status === 403 ? 'No tienes acceso a esta configuración' : 'No fue posible cargar la configuración'}
          description={apiError.detail}
        />
      </div>
    );
  }

  if (settingsQuery.data && (!Array.isArray(settingsQuery.data.providers) || !Array.isArray(settingsQuery.data.features))) {
    return (
      <div className="space-y-6">
        <PageHeader title="Configuración de IA" subtitle="Control administrativo de proveedores y ruteo." />
        <Card className="border-amber-200 p-5 dark:border-amber-500/30">
          <p className="font-semibold text-amber-800 dark:text-amber-200">La configuración recibida no tiene el formato esperado.</p>
          <p className="mt-1 text-sm text-muted">Actualiza la página. Si el problema continúa, revisa la versión del backend antes de editar proveedores.</p>
          <Button className="mt-4" size="sm" variant="outline" onClick={() => void settingsQuery.refetch()}>Volver a consultar</Button>
        </Card>
      </div>
    );
  }

  const textProviders = draftProviders.filter((provider) => provider.tipo !== 'imagen');
  const imageProviders = draftProviders.filter((provider) => provider.tipo === 'imagen');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración de IA"
        eyebrow="Operación de inteligencia artificial"
        subtitle="Conecta credenciales, define modelos y decide qué proveedor atiende cada capacidad de la plataforma."
        breadcrumbs={[{ label: 'Inicio', to: '/app' }, { label: 'Configuración de IA' }]}
        primaryAction={
          <Button loading={saveMutation.isPending} loadingLabel="Guardando…" disabled={!hasUnsavedChanges || saveMutation.isPending} onClick={requestSave}>
            Guardar cambios
          </Button>
        }
      />

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <Button size="sm" variant="outline" loading={restoreMutation.isPending} onClick={() => setRestoreDialogOpen(true)}>
          Restaurar valores
        </Button>
        <Button size="sm" variant="outline" loading={clearCacheMutation.isPending} onClick={() => clearCacheMutation.mutate()}>
          Limpiar caché
        </Button>
        {hasUnsavedChanges && <Badge tone="warning">Cambios sin guardar</Badge>}
      </Card>

      <ConfigConsistencyCard
        isLoading={configHashQuery.isLoading}
        error={configHashQuery.error}
        data={configHashQuery.data}
        onRetry={() => void configHashQuery.refetch()}
      />

      {settingsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-72" />)}</div>
      ) : settingsQuery.data ? (
        <>
          <Card className="flex items-start gap-3 p-5">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-500" />
            <div>
              <p className="font-semibold">Estado general de IA</p>
              <p className="mt-1 text-sm text-muted">
                {draftProviders.filter((provider) => provider.active && provider.auth_configured).length} de {draftProviders.length} proveedores activos y configurados · {settingsQuery.data.usage.total_calls} llamadas registradas · costo estimado: ${settingsQuery.data.usage.total_cost.toFixed(4)}.
              </p>
            </div>
          </Card>

          <AICredentialsPanel config={settingsQuery.data.global_config} />

          <ProviderSection
            title="Proveedores de texto"
            icon={MessageSquare}
            providers={textProviders}
            testingProvider={testingProvider}
            isTesting={testMutation.isPending}
            onUpdate={updateProvider}
            onTest={(providerId) => {
              setTestingProvider(providerId);
              testMutation.mutate(providerId);
            }}
          />
          <ProviderSection
            title="Proveedores de imágenes"
            icon={ImageIcon}
            providers={imageProviders}
            testingProvider={testingProvider}
            isTesting={testMutation.isPending}
            onUpdate={updateProvider}
            onTest={(providerId) => {
              setTestingProvider(providerId);
              testMutation.mutate(providerId);
            }}
          />

          <section>
            <div className="mb-3 flex items-center gap-2">
              <Sliders className="h-5 w-5 text-amber-500" />
              <div>
                <h2 className="font-display text-lg font-bold">Ruteo por funcionalidad</h2>
                <p className="text-sm text-muted">Define proveedor principal y fallback para cada capacidad.</p>
              </div>
            </div>
            <div className="grid gap-3">
              {draftFeatures.map((feature) => (
                <FeatureRoutingEditor
                  key={feature.feature}
                  feature={feature}
                  providers={draftProviders}
                  onUpdate={updateFeature}
                />
              ))}
            </div>
          </section>

          <UsageAndAudit usage={settingsQuery.data.usage} audit={auditQuery.data?.logs ?? []} isAuditLoading={auditQuery.isLoading} />
        </>
      ) : null}

      <ConfirmDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        onConfirm={() => saveMutation.mutate()}
        title="Guardar configuración de IA"
        description="Los cambios se aplicarán al ruteo persistido de la plataforma y se invalidará la caché de configuración."
        confirmLabel="Guardar configuración"
        loading={saveMutation.isPending}
      />
      <ConfirmDialog
        open={restoreDialogOpen}
        onClose={() => setRestoreDialogOpen(false)}
        onConfirm={() => restoreMutation.mutate()}
        title="Restaurar valores predeterminados"
        description="Esta acción reemplazará los proveedores y ruteos personalizados por los valores predeterminados de la plataforma."
        confirmLabel="Restaurar"
        tone="danger"
        loading={restoreMutation.isPending}
      />
    </div>
  );
}

function ProviderSection({
  title,
  icon: Icon,
  providers,
  testingProvider,
  isTesting,
  onUpdate,
  onTest,
}: {
  title: string;
  icon: typeof Cpu;
  providers: AIProvider[];
  testingProvider: string | null;
  isTesting: boolean;
  onUpdate: (providerId: string, changes: Partial<AIProvider>) => void;
  onTest: (providerId: string) => void;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-5 w-5 text-brand-500" />
        <h2 className="font-display text-lg font-bold">{title}</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {providers.map((provider) => (
          <ProviderEditor
            key={provider.id}
            provider={provider}
            isTesting={isTesting && testingProvider === provider.id}
            testsDisabled={isTesting}
            onUpdate={onUpdate}
            onTest={onTest}
          />
        ))}
      </div>
    </section>
  );
}

function ProviderEditor({
  provider,
  isTesting,
  testsDisabled,
  onUpdate,
  onTest,
}: {
  provider: AIProvider;
  isTesting: boolean;
  testsDisabled: boolean;
  onUpdate: (providerId: string, changes: Partial<AIProvider>) => void;
  onTest: (providerId: string) => void;
}) {
  const Icon = PROVIDER_ICONS[provider.id] ?? Cpu;
  const isTemplate = provider.id === 'template';

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-200">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-sm">{provider.label}</p>
            <p className="text-xs text-muted">{provider.id}</p>
          </div>
        </div>
        {providerStatus(provider)}
      </div>

      <div className="mt-4 space-y-3">
        <Field label="Modelo">
          <Input
            value={provider.model ?? ''}
            onChange={(event) => onUpdate(provider.id, { model: event.currentTarget.value || null })}
            placeholder="Modelo configurado"
            disabled={isTemplate}
          />
        </Field>
        <Field label="Prioridad" hint={isTemplate ? 'El fallback por plantilla permanece al final.' : 'Un número menor se intenta primero.'}>
          <Input
            type="number"
            min={1}
            value={provider.priority}
            onChange={(event) => onUpdate(provider.id, { priority: Math.max(1, Number(event.currentTarget.value) || 1) })}
            disabled={isTemplate}
          />
        </Field>
      </div>

      <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-surface-2/60 p-3 text-sm">
        <span>
          <span className="block font-semibold">Proveedor activo</span>
          <span className="block text-xs text-muted">{isTemplate ? 'Fallback obligatorio de seguridad.' : 'Disponible para el ruteo de IA.'}</span>
        </span>
        <input
          type="checkbox"
          className="h-4 w-4 accent-brand-600 focus-ring"
          checked={provider.active}
          onChange={(event) => onUpdate(provider.id, { active: event.currentTarget.checked })}
          disabled={isTemplate}
          aria-label={`Activar ${provider.label}`}
        />
      </label>

      {!isTemplate && (
        <details className="mt-3 rounded-lg border border-border bg-surface-2/40 px-3 py-2">
          <summary className="cursor-pointer text-sm font-semibold text-fg">Ajustes avanzados</summary>
          <div className="mt-3 space-y-3 border-t border-border pt-3">
            {provider.id !== 'cloudflare_image' && (
              <Field label="URL base" hint="Cámbiala solo si usas un gateway o despliegue compatible.">
                <Input
                  type="url"
                  value={provider.base_url ?? ''}
                  onChange={(event) => onUpdate(provider.id, { base_url: event.currentTarget.value || null })}
                  placeholder="https://api.proveedor.com/v1"
                />
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Timeout (s)">
                <Input
                  type="number"
                  min={5}
                  max={300}
                  value={provider.timeout_seconds}
                  onChange={(event) => onUpdate(provider.id, { timeout_seconds: Math.min(300, Math.max(5, Number(event.currentTarget.value) || 5)) })}
                />
              </Field>
              <Field label="Reintentos">
                <Input
                  type="number"
                  min={0}
                  max={5}
                  value={provider.max_retries}
                  onChange={(event) => onUpdate(provider.id, { max_retries: Math.min(5, Math.max(0, Number(event.currentTarget.value) || 0)) })}
                />
              </Field>
            </div>
          </div>
        </details>
      )}

      {provider.last_test_error && (
        <p className="mt-3 rounded-lg bg-rose-50 p-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">{provider.last_test_error}</p>
      )}
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted">
        <span>{provider.last_test_latency_ms != null ? `${provider.last_test_latency_ms} ms` : 'Sin latencia registrada'}</span>
        <span>{provider.last_test_http_code ? `HTTP ${provider.last_test_http_code}` : ''}</span>
      </div>
      <Button size="sm" variant="outline" className="mt-3 w-full" loading={isTesting} disabled={testsDisabled} onClick={() => onTest(provider.id)}>
        Probar conexión
      </Button>
    </Card>
  );
}

function FeatureRoutingEditor({
  feature,
  providers,
  onUpdate,
}: {
  feature: FeatureRouting;
  providers: AIProvider[];
  onUpdate: (featureId: string, changes: Partial<FeatureRouting>) => void;
}) {
  const providerIds = providers.map((provider) => provider.id);
  const primaryOptions = providerIds.includes(feature.primary_provider) ? providerIds : [feature.primary_provider, ...providerIds];
  const fallbackOptions = feature.fallback_provider && !providerIds.includes(feature.fallback_provider)
    ? [feature.fallback_provider, ...providerIds]
    : providerIds;

  return (
    <Card className="grid gap-4 p-4 lg:grid-cols-[minmax(180px,1fr)_minmax(160px,0.85fr)_auto_minmax(160px,0.85fr)_auto] lg:items-end">
      <div>
        <p className="font-semibold text-sm">{feature.label}</p>
        <p className="mt-1 text-xs text-muted">{feature.feature}</p>
      </div>
      <Field label="Principal">
        <Select value={feature.primary_provider} onChange={(event) => onUpdate(feature.feature, { primary_provider: event.currentTarget.value })}>
          {primaryOptions.map((providerId) => <option key={providerId} value={providerId}>{providerId}</option>)}
        </Select>
      </Field>
      <ChevronRight className="hidden h-5 w-5 self-center text-muted lg:block" aria-hidden="true" />
      <Field label="Fallback">
        <Select value={feature.fallback_provider ?? ''} onChange={(event) => onUpdate(feature.feature, { fallback_provider: event.currentTarget.value || null })}>
          <option value="">Sin fallback</option>
          {fallbackOptions.filter((providerId) => providerId !== feature.primary_provider).map((providerId) => <option key={providerId} value={providerId}>{providerId}</option>)}
        </Select>
      </Field>
      <label className="flex h-11 items-center gap-2 text-sm font-medium text-fg">
        <input
          type="checkbox"
          className="h-4 w-4 accent-brand-600 focus-ring"
          checked={feature.active}
          onChange={(event) => onUpdate(feature.feature, { active: event.currentTarget.checked })}
        />
        Activo
      </label>
    </Card>
  );
}

function ConfigConsistencyCard({
  isLoading,
  error,
  data,
  onRetry,
}: {
  isLoading: boolean;
  error: unknown;
  data: Awaited<ReturnType<typeof getConfigHash>> | undefined;
  onRetry: () => void;
}) {
  if (isLoading) return <Skeleton className="h-24" />;
  if (error) {
    return (
      <Card className="border-amber-200 p-4 dark:border-amber-500/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">No se pudo verificar la consistencia backend-worker</p>
            <p className="mt-1 text-sm text-muted">{toApiError(error).detail}</p>
          </div>
          <Button size="sm" variant="outline" onClick={onRetry}>Reintentar</Button>
        </div>
      </Card>
    );
  }
  if (!data) return null;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {data.consistent ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" /> : <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />}
          <div>
            <p className="font-semibold">Consistencia backend-worker</p>
            <p className="mt-1 text-sm text-muted">
              Backend: <code className="rounded bg-surface-2 px-1.5 py-0.5">{data.backend_hash}</code> · Worker: <code className="rounded bg-surface-2 px-1.5 py-0.5">{data.worker_hash ?? 'sin respuesta'}</code>
            </p>
            {data.worker_error && <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{data.worker_error}</p>}
          </div>
        </div>
        <Badge tone={data.consistent ? 'success' : 'warning'}>{data.consistent ? 'Consistente' : 'Revisar worker'}</Badge>
      </div>
    </Card>
  );
}

function UsageAndAudit({
  usage,
  audit,
  isAuditLoading,
}: {
  usage: { total_calls: number; total_tokens_input: number; total_tokens_output: number; total_cost: number; by_provider: { provider: string; calls: number; cost: number }[] };
  audit: { action: string; entity: string; result: string; created_at: string | null }[];
  isAuditLoading: boolean;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-emerald-500" />
          <h2 className="font-display text-lg font-bold">Uso registrado</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric value={`${usage.total_calls}`} label="Llamadas" />
          <Metric value={(usage.total_tokens_input + usage.total_tokens_output).toLocaleString()} label="Tokens" />
          <Metric value={`$${usage.total_cost.toFixed(4)}`} label="Costo estimado" />
        </div>
        {usage.by_provider.length > 0 && (
          <div className="mt-4 space-y-2">
            {usage.by_provider.map((provider) => (
              <div key={provider.provider} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm">
                <span className="font-medium">{provider.provider}</span>
                <span className="text-muted">{provider.calls} llamadas · ${provider.cost.toFixed(4)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-brand-500" />
          <h2 className="font-display text-lg font-bold">Auditoría reciente</h2>
        </div>
        {isAuditLoading ? <Skeleton className="h-24" /> : audit.length === 0 ? (
          <p className="text-sm text-muted">Aún no hay eventos de configuración registrados.</p>
        ) : (
          <ul className="divide-y divide-border">
            {audit.map((entry, index) => (
              <li key={`${entry.action}-${entry.entity}-${index}`} className="py-2.5 text-sm">
                <div className="flex items-center justify-between gap-3"><span className="font-medium">{entry.action}</span><Badge tone={entry.result === 'ok' ? 'success' : 'warning'}>{entry.result}</Badge></div>
                <p className="mt-0.5 text-xs text-muted">{entry.entity} · {formatDate(entry.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-4 text-center">
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}
