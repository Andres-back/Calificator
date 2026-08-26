import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ImageIcon, MessageSquare } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, QueryError, Skeleton } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { toApiError } from '@/lib/api';
import { getAISettings, getConfigHash, getAIAudit } from './api';
import { AICredentialsPanel } from './AICredentialsPanel';
import { useAISettingsDraft } from './ai/hooks/useAISettingsDraft';
import { useAIMutations } from './ai/hooks/useAIMutations';
import { OverviewSection } from './ai/sections/OverviewSection';
import { ProvidersSection } from './ai/sections/ProvidersSection';
import { FeatureRoutingSection } from './ai/sections/FeatureRoutingSection';
import { ConfigConsistencyCard } from './ai/sections/ConsistencySection';
import { UsageAndAudit } from './ai/sections/AuditSection';

export function AdminAIConfigPage() {
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
    updateFeature,
    setDraftProviders,
    setHasUnsavedChanges,
  } = useAISettingsDraft(settingsQuery.data);

  const {
    testMutation,
    saveMutation,
    restoreMutation,
    clearCacheMutation,
  } = useAIMutations(
    draftProviders,
    draftModels,
    draftFeatures,
    providersChanged || modelsChanged || featuresChanged,
    settingsQuery.data?.version ?? 1,
    setDraftProviders,
    setHasUnsavedChanges,
    setTestingProvider,
  );

  function requestSave() {
    if (!providersChanged && !modelsChanged && !featuresChanged) {
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
          Restaurar versión anterior
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
          <OverviewSection
            activeConfiguredCount={draftProviders.filter((provider) => provider.active && provider.auth_configured).length}
            totalProviders={draftProviders.length}
            usage={settingsQuery.data.usage}
          />

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

          <FeatureRoutingSection
            features={draftFeatures}
            providers={draftProviders}
            models={draftModels}
            onUpdate={updateFeature}
            onModelUpdate={updateModel}
            testingProvider={testingProvider}
            isTesting={testMutation.isPending}
            onTest={(providerId, model, capability) => {
              setTestingProvider(providerId);
              testMutation.mutate({ providerId, model, capability });
            }}
          />

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
        title="Restaurar versión anterior"
        description="Esta acción recuperará la última configuración publicada válida. Los trabajos ya iniciados conservarán su versión."
        confirmLabel="Restaurar"
        tone="danger"
        loading={restoreMutation.isPending}
      />
    </div>
  );
}
