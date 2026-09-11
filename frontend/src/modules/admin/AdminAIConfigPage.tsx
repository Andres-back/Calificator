import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { BarChart3, BrainCircuit, ImageIcon, KeyRound, MessageSquare, Server, Wrench } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, QueryError, Skeleton } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { toApiError } from '@/lib/api';
import { getAISettings, getConfigHash, getAIAudit, getAIControlCenter, getAIControlCenterUsage, validateAIControlCenter, type AIToolControl } from './api';
import { AICredentialsPanel } from './AICredentialsPanel';
import { useAISettingsDraft } from './ai/hooks/useAISettingsDraft';
import { useAIMutations } from './ai/hooks/useAIMutations';
import { OverviewSection } from './ai/sections/OverviewSection';
import { ProvidersSection } from './ai/sections/ProvidersSection';
import { FunctionsSection } from './ai/sections/FunctionsSection';
import { ToolsSection } from './ai/sections/ToolsSection';
import { ConfigConsistencyCard } from './ai/sections/ConsistencySection';
import { ControlCenterUsageExplorer, UsageAndAudit } from './ai/sections/AuditSection';

const PERFORMANCE_FEATURE_ALIASES: Record<string, string[]> = {
  presentaciones: ['presentaciones', 'presentacion'],
  calificacion_foto: ['calificacion_foto', 'grading'],
};

export function AdminAIConfigPage() {
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'functions' | 'tools' | 'providers' | 'usage'>('functions');
  const [draftTools, setDraftTools] = useState<AIToolControl[]>([]);
  const [toolsDirty, setToolsDirty] = useState(false);
  const [validating, setValidating] = useState(false);
  const [usagePeriod, setUsagePeriod] = useState(30);
  const [validationWarnings, setValidationWarnings] = useState<Array<{ field: string; message: string }>>([]);

  const settingsQuery = useQuery({
    queryKey: ['admin-ai-settings'],
    queryFn: getAISettings,
    retry: false,
  });
  const controlCenterQuery = useQuery({
    queryKey: ['admin-ai-control-center'],
    queryFn: getAIControlCenter,
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
  const detailedUsageQuery = useQuery({
    queryKey: ['admin-ai-control-center-usage', usagePeriod],
    queryFn: () => getAIControlCenterUsage({ days: usagePeriod }),
    enabled: activeSection === 'usage',
    retry: false,
  });

  const {
    draftProviders,
    draftModels,
    draftFeatures,
    hasUnsavedChanges,
    providersChanged,
    modelsChanged,
    featuresChanged,
    updateProvider,
    updateModel,
    upsertFeature,
    removeFeature,
    setDraftProviders,
    setHasUnsavedChanges,
  } = useAISettingsDraft(settingsQuery.data);

  useEffect(() => {
    if (controlCenterQuery.data && !toolsDirty) {
      setDraftTools(controlCenterQuery.data.tools.map((tool) => ({ ...tool, aliases: [...tool.aliases] })));
    }
  }, [controlCenterQuery.data, toolsDirty]);

  const toolsChanged = useMemo(
    () => toolsDirty && JSON.stringify(draftTools.map(({ tool_id, generation_enabled, pause_reason }) => ({ tool_id, generation_enabled, pause_reason: pause_reason || null })))
      !== JSON.stringify((controlCenterQuery.data?.tools ?? []).map(({ tool_id, generation_enabled, pause_reason }) => ({ tool_id, generation_enabled, pause_reason: pause_reason || null }))),
    [controlCenterQuery.data?.tools, draftTools, toolsDirty],
  );
  const expectedVersion = controlCenterQuery.data?.version ?? settingsQuery.data?.version ?? 1;
  const changeSummary = [
    providersChanged ? 'proveedores' : null,
    modelsChanged ? 'catálogo de modelos' : null,
    featuresChanged ? 'rutas por función' : null,
    toolsChanged ? 'disponibilidad de herramientas' : null,
  ].filter(Boolean).join(', ');
  const impactDetails = useMemo(() => {
    const details: string[] = [];
    const previousFeatures = settingsQuery.data?.features ?? [];
    const featureIds = new Set([...previousFeatures.map((item) => item.feature), ...draftFeatures.map((item) => item.feature)]);
    for (const featureId of featureIds) {
      const previous = previousFeatures.find((item) => item.feature === featureId);
      const route = draftFeatures.find((item) => item.feature === featureId);
      const before = previous ? `${previous.primary_provider}/${previous.primary_model || 'modelo predeterminado'} · API docente ${previous.rollout_enabled ? 'sí' : 'no'}` : 'herencia general';
      const after = route ? `${route.primary_provider}/${route.primary_model || 'modelo predeterminado'} · API docente ${route.rollout_enabled ? 'sí' : 'no'}` : 'herencia general';
      if (before !== after) {
        details.push(`${route?.label || previous?.label || featureId}: ${before} → ${after}`);
      }
    }
    for (const tool of draftTools) {
      const previous = controlCenterQuery.data?.tools.find((item) => item.tool_id === tool.tool_id);
      if (previous && previous.generation_enabled !== tool.generation_enabled) {
        details.push(`${tool.label}: ${previous.generation_enabled ? 'activa' : 'pausada'} → ${tool.generation_enabled ? 'activa' : 'pausada'}`);
      }
    }
    const visible = details.slice(0, 4);
    return `${visible.join('; ')}${details.length > visible.length ? `; y ${details.length - visible.length} cambio(s) más` : ''}`;
  }, [controlCenterQuery.data?.tools, draftFeatures, draftTools, settingsQuery.data?.features]);

  const {
    testMutation,
    saveMutation,
    restoreMutation,
    clearCacheMutation,
  } = useAIMutations(
    draftProviders,
    draftModels,
    draftFeatures,
    draftTools,
    providersChanged || modelsChanged || featuresChanged || toolsChanged,
    expectedVersion,
    setDraftProviders,
    setHasUnsavedChanges,
    setTestingProvider,
    () => setToolsDirty(false),
  );

  async function requestSave() {
    if (!providersChanged && !modelsChanged && !featuresChanged && !toolsChanged) {
      toast('No hay cambios por guardar.');
      return;
    }
    setValidating(true);
    try {
      const result = await validateAIControlCenter(draftProviders, draftModels, draftFeatures, draftTools, expectedVersion);
      if (!result.valid) {
        toast.error(result.errors[0]?.message ?? 'La configuración contiene errores.');
        return;
      }
      setValidationWarnings(result.warnings);
      setSaveDialogOpen(true);
    } catch (error) {
      toast.error(toApiError(error).detail);
    } finally {
      setValidating(false);
    }
  }

  const inefficientRoutes = draftFeatures.filter((feature) => {
    const selected = draftModels.find((model) => (
      model.provider_id === feature.primary_provider && model.model_id === feature.primary_model
    ));
    const aliases = PERFORMANCE_FEATURE_ALIASES[feature.feature] ?? [feature.feature];
    return selected?.performance?.some((metric) => aliases.includes(metric.feature) && metric.inefficient);
  });

  useEffect(() => {
    if (saveMutation.isSuccess) setSaveDialogOpen(false);
  }, [saveMutation.isSuccess]);

  useEffect(() => {
    if (restoreMutation.isSuccess) setRestoreDialogOpen(false);
  }, [restoreMutation.isSuccess]);

  if (settingsQuery.isError || controlCenterQuery.isError) {
    const failingError = settingsQuery.error ?? controlCenterQuery.error;
    const apiError = toApiError(failingError);
    return (
      <div className="space-y-6">
        <PageHeader title="Configuración de IA" subtitle="Control administrativo de proveedores y ruteo." />
        <QueryError
          error={failingError}
          onRetry={() => { void settingsQuery.refetch(); void controlCenterQuery.refetch(); }}
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
          <Button loading={saveMutation.isPending || validating} loadingLabel={validating ? 'Validando…' : 'Guardando…'} disabled={(!hasUnsavedChanges && !toolsChanged) || saveMutation.isPending || validating} onClick={() => void requestSave()}>
            Guardar cambios
          </Button>
        }
      />

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <Button size="sm" variant="outline" loading={restoreMutation.isPending} onClick={() => setRestoreDialogOpen(true)}>
          Restaurar versión anterior
        </Button>
        <Button size="sm" variant="outline" loading={clearCacheMutation.isPending} onClick={() => clearCacheMutation.mutate()}>
          Limpiar caché
        </Button>
        {(hasUnsavedChanges || toolsChanged) && <Badge tone="warning">Cambios sin guardar</Badge>}
      </Card>

      <nav className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-surface p-2 lg:grid-cols-4" aria-label="Secciones de configuración de IA">
        {([
          ['functions', 'Funciones', BrainCircuit],
          ['tools', 'Herramientas', Wrench],
          ['providers', 'Proveedores y claves', Server],
          ['usage', 'Uso y auditoría', BarChart3],
        ] as const).map(([id, label, Icon]) => (
          <Button key={id} type="button" variant={activeSection === id ? 'primary' : 'ghost'} className="min-h-12 justify-start" onClick={() => setActiveSection(id)} aria-current={activeSection === id ? 'page' : undefined}>
            <Icon className="h-4 w-4" aria-hidden="true" />{label}
          </Button>
        ))}
      </nav>

      {settingsQuery.isLoading || controlCenterQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-72" />)}</div>
      ) : settingsQuery.data ? (
        <>
          {activeSection === 'functions' && <FunctionsSection functions={controlCenterQuery.data?.functions ?? []} features={draftFeatures} providers={draftProviders} models={draftModels} onUpsert={upsertFeature} />}

          {activeSection === 'tools' && <ToolsSection
            tools={draftTools}
            providers={draftProviders}
            models={draftModels}
            features={draftFeatures}
            onToolChange={(toolId, changes) => { setDraftTools((tools) => tools.map((tool) => tool.tool_id === toolId ? { ...tool, ...changes } : tool)); setToolsDirty(true); setHasUnsavedChanges(true); }}
            onRouteUpsert={upsertFeature}
            onRouteRemove={removeFeature}
          />}

          {activeSection === 'providers' && <div className="space-y-6">
          <AICredentialsPanel config={settingsQuery.data.global_config} />
          <ProvidersSection
            title="Proveedores de texto"
            icon={MessageSquare}
            providers={textProviders}
            testingProvider={testingProvider}
            isTesting={testMutation.isPending}
            onUpdate={updateProvider}
            onTest={(providerId) => {
              setTestingProvider(providerId);
              testMutation.mutate({ providerId });
            }}
          />
          <ProvidersSection
            title="Proveedores de imágenes"
            icon={ImageIcon}
            providers={imageProviders}
            testingProvider={testingProvider}
            isTesting={testMutation.isPending}
            onUpdate={updateProvider}
            onTest={(providerId) => {
              setTestingProvider(providerId);
              testMutation.mutate({ providerId });
            }}
          />
          <details className="rounded-xl border border-border bg-surface p-4"><summary className="cursor-pointer font-semibold"><KeyRound className="mr-2 inline h-4 w-4" />Catálogo avanzado de modelos</summary><div className="mt-4 grid gap-2 md:grid-cols-2">{draftModels.map((model) => <label key={`${model.provider_id}:${model.model_id}`} className="flex min-h-12 items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2 text-sm"><span><strong className="block">{model.label}</strong><span className="text-xs text-muted">{model.provider_id} · {model.capabilities.join(', ')}</span></span><input type="checkbox" checked={model.active} onChange={(event) => updateModel(model.provider_id, model.model_id, { active: event.currentTarget.checked })} className="h-4 w-4 accent-brand-600" /></label>)}</div></details>
          </div>}

          {activeSection === 'usage' && <div className="space-y-6">
            <OverviewSection activeConfiguredCount={draftProviders.filter((provider) => provider.active && provider.auth_configured).length} totalProviders={draftProviders.length} usage={settingsQuery.data.usage} />
            <Card className="p-5"><h2 className="font-display text-lg font-bold">Parámetros operativos</h2><p className="mt-1 text-sm text-muted">Se consultan aquí, pero se modifican en el despliegue para evitar cambios accidentales.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-surface-2 p-4"><span className="text-xs font-bold uppercase tracking-wide text-muted">Concurrencia por proveedor</span><p className="mt-1 text-xl font-extrabold">{controlCenterQuery.data?.deployment.provider_max_concurrency ?? 'No informado'}</p></div><div className="rounded-xl bg-surface-2 p-4"><span className="text-xs font-bold uppercase tracking-wide text-muted">Alerta de trabajo lento</span><p className="mt-1 text-xl font-extrabold">{controlCenterQuery.data?.deployment.slow_warning_seconds ? `${controlCenterQuery.data.deployment.slow_warning_seconds} s` : 'No informada'}</p></div></div></Card>
            <ControlCenterUsageExplorer data={detailedUsageQuery.data} loading={detailedUsageQuery.isLoading} period={usagePeriod} onPeriodChange={setUsagePeriod} />
            <ConfigConsistencyCard isLoading={configHashQuery.isLoading} error={configHashQuery.error} data={configHashQuery.data} onRetry={() => void configHashQuery.refetch()} />
            <UsageAndAudit usage={settingsQuery.data.usage} audit={auditQuery.data?.logs ?? []} isAuditLoading={auditQuery.isLoading} />
          </div>}
        </>
      ) : null}

      <ConfirmDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        onConfirm={() => saveMutation.mutate()}
        title="Guardar configuración de IA"
        description={`Se publicarán cambios en: ${changeSummary || 'configuración de IA'}.${impactDetails ? ` Antes y después: ${impactDetails}.` : ''} Solo afectarán trabajos nuevos; los trabajos en curso conservarán su configuración.${inefficientRoutes.length > 0 ? ` ${inefficientRoutes.length} ruta(s) tienen rendimiento inferior al mejor observado.` : ''}${validationWarnings.length > 0 ? ` La validación dejó ${validationWarnings.length} advertencia(s) no bloqueantes.` : ''}`}
        confirmLabel="Guardar configuración"
        loading={saveMutation.isPending}
      />
      <ConfirmDialog
        open={restoreDialogOpen}
        onClose={() => setRestoreDialogOpen(false)}
        onConfirm={() => restoreMutation.mutate()}
        title="Restaurar versión anterior"
        description="Esta acción recuperará la última configuración publicada válida. Los trabajos ya iniciados conservarán su versión."
        confirmLabel="Restaurar"
        tone="danger"
        loading={restoreMutation.isPending}
      />
    </div>
  );
}
