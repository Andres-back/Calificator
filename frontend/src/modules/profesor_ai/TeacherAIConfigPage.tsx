import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Bot, KeyRound, PlugZap, ShieldCheck, SlidersHorizontal, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, Button, Card, Field, Input, QueryError, QueryLoading, Select } from '@/components/ui';
import { queryClient } from '@/lib/queryClient';
import { toApiError } from '@/lib/api';
import { queryKeys } from '@/config/queryKeys';
import {
  deleteTeacherCredential,
  getTeacherAIConfig,
  saveTeacherAIConfig,
  saveTeacherCredential,
  testTeacherProvider,
  type TeacherAIConfig,
  type TeacherAIMode,
  type TeacherAIPreference,
} from './api';

const MODE_COPY: Record<TeacherAIMode, { title: string; description: string }> = {
  institutional: {
    title: 'Usar IA de la institución',
    description: 'No necesitas claves. XCalificator usa la configuración segura del administrador.',
  },
  automatic: {
    title: 'Usar mi API automáticamente',
    description: 'Conecta una clave y XCalificator elige un modelo compatible para cada tarea.',
  },
  advanced: {
    title: 'Personalizar por función',
    description: 'Elige proveedor y modelo para contenido, visión, imágenes y demás capacidades.',
  },
};

function compatibleModels(config: TeacherAIConfig, provider: string, capability: string) {
  return config.models.filter((model) => (
    model.provider_id === provider && model.active && model.capabilities.includes(capability)
  ));
}

export function TeacherAIConfigPage() {
  const configQuery = useQuery({
    queryKey: queryKeys.teacherAI.config(),
    queryFn: getTeacherAIConfig,
    retry: false,
  });
  const [mode, setMode] = useState<TeacherAIMode>('institutional');
  const [allowFallback, setAllowFallback] = useState(true);
  const [preferences, setPreferences] = useState<TeacherAIPreference[]>([]);
  const [keys, setKeys] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!configQuery.data) return;
    setMode(configQuery.data.mode);
    setAllowFallback(configQuery.data.allow_institutional_fallback);
    setPreferences(configQuery.data.preferences);
  }, [configQuery.data]);

  const configuredProviders = useMemo(
    () => new Set(configQuery.data?.credentials.filter((item) => item.configured).map((item) => item.provider_id) ?? []),
    [configQuery.data?.credentials],
  );

  const saveConfigMutation = useMutation({
    mutationFn: () => saveTeacherAIConfig({
      expected_version: configQuery.data?.version ?? 0,
      mode,
      allow_institutional_fallback: allowFallback,
      active: true,
      preferences,
    }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.teacherAI.config(), data);
      toast.success('Preferencias de IA guardadas.');
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(apiError.status === 409 ? 'La configuración cambió. Recargando datos…' : apiError.detail);
      if (apiError.status === 409) void configQuery.refetch();
    },
  });

  const credentialMutation = useMutation({
    mutationFn: ({ provider, apiKey }: { provider: string; apiKey: string }) => saveTeacherCredential(provider, apiKey),
    onSuccess: (_, variables) => {
      setKeys((current) => ({ ...current, [variables.provider]: '' }));
      void queryClient.invalidateQueries({ queryKey: queryKeys.teacherAI.all });
      toast.success('Clave cifrada y guardada.');
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTeacherCredential,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.teacherAI.all });
      toast.success('Clave personal eliminada.');
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const testMutation = useMutation({
    mutationFn: ({ provider, apiKey }: { provider: string; apiKey?: string }) => testTeacherProvider(provider, apiKey ? { api_key: apiKey } : {}),
    onSuccess: (result) => result.status === 'ok'
      ? toast.success(result.detail || 'Conexión comprobada.')
      : toast.error(result.detail || 'No fue posible conectar.'),
    onError: (error) => toast.error(toApiError(error).detail),
  });

  function updatePreference(feature: string, changes: Partial<TeacherAIPreference>) {
    setPreferences((current) => {
      const existing = current.find((item) => item.feature === feature);
      if (existing) return current.map((item) => item.feature === feature ? { ...item, ...changes } : item);
      return [...current, { feature, provider: null, model: null, active: true, ...changes }];
    });
  }

  if (configQuery.isLoading) return <QueryLoading label="Cargando preferencias de IA…" />;
  if (configQuery.isError || !configQuery.data) {
    return <QueryError error={configQuery.error} title="No fue posible cargar tu configuración" onRetry={() => void configQuery.refetch()} />;
  }
  const config = configQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Preferencias del docente"
        title="Mi configuración de IA"
        subtitle="Puedes seguir usando la IA institucional o conectar una API propia. Tus claves son privadas y nunca se muestran de nuevo."
        breadcrumbs={[{ label: 'Inicio', to: '/app' }, { label: 'Mi configuración de IA' }]}
        primaryAction={<Button loading={saveConfigMutation.isPending} onClick={() => saveConfigMutation.mutate()}>Guardar preferencias</Button>}
      />

      <section aria-labelledby="ai-mode-title">
        <div className="mb-3">
          <h2 id="ai-mode-title" className="font-display text-xl font-bold">¿Cómo quieres usar la IA?</h2>
          <p className="text-sm text-muted">La opción institucional seguirá disponible mientras lo autorices.</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {(Object.keys(MODE_COPY) as TeacherAIMode[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`min-h-36 rounded-2xl border p-5 text-left transition ${mode === value ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20 dark:bg-brand-500/10' : 'border-border bg-surface hover:border-brand-300'}`}
              aria-pressed={mode === value}
            >
              <span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
                {value === 'institutional' ? <ShieldCheck className="h-5 w-5" /> : value === 'automatic' ? <Bot className="h-5 w-5" /> : <SlidersHorizontal className="h-5 w-5" />}
              </span>
              <span className="block font-semibold">{MODE_COPY[value].title}</span>
              <span className="mt-1 block text-sm leading-5 text-muted">{MODE_COPY[value].description}</span>
            </button>
          ))}
        </div>
      </section>

      {mode !== 'institutional' && (
        <section className="space-y-3" aria-labelledby="credentials-title">
          <div>
            <h2 id="credentials-title" className="font-display text-xl font-bold">Mis conexiones</h2>
            <p className="text-sm text-muted">Solo puedes conectar proveedores previamente autorizados por el administrador.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {config.providers.map((provider) => {
              const metadata = config.credentials.find((item) => item.provider_id === provider.id);
              const apiKey = keys[provider.id] ?? '';
              const configured = configuredProviders.has(provider.id);
              return (
                <Card key={provider.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200"><KeyRound className="h-5 w-5" /></span>
                      <div><p className="font-semibold">{provider.label}</p><p className="text-xs text-muted">{provider.id}</p></div>
                    </div>
                    <Badge tone={configured ? 'success' : 'neutral'}>{configured ? `Configurada ····${metadata?.last_four ?? ''}` : 'Sin clave'}</Badge>
                  </div>
                  <Field label={configured ? 'Sustituir clave' : 'Clave API'} hint="Se cifra antes de guardarse. Nunca se devuelve al navegador.">
                    <Input
                      type="password"
                      autoComplete="new-password"
                      value={apiKey}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setKeys((current) => ({ ...current, [provider.id]: value }));
                      }}
                      placeholder={configured ? 'Escribe solo si deseas sustituirla' : 'Pega aquí tu clave API'}
                    />
                  </Field>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" disabled={!apiKey.trim()} loading={credentialMutation.isPending} onClick={() => credentialMutation.mutate({ provider: provider.id, apiKey })}>Guardar clave</Button>
                    <Button size="sm" variant="outline" loading={testMutation.isPending} disabled={!configured && !apiKey.trim()} onClick={() => testMutation.mutate({ provider: provider.id, apiKey: apiKey.trim() || undefined })}><PlugZap className="h-4 w-4" /> Probar</Button>
                    {configured && <Button size="sm" variant="ghost" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate(provider.id)}><Trash2 className="h-4 w-4" /> Eliminar</Button>}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {mode === 'advanced' && (
        <details open className="rounded-2xl border border-border bg-surface p-5">
          <summary className="cursor-pointer font-display text-xl font-bold">Configuración avanzada por función</summary>
          <p className="mt-1 text-sm text-muted">Solo se muestran combinaciones compatibles con la capacidad requerida.</p>
          <div className="mt-5 grid gap-4">
            {config.features.map((feature) => {
              const current = preferences.find((item) => item.feature === feature.feature);
              const capability = feature.capability ?? 'text';
              const providers = config.providers.filter((provider) => configuredProviders.has(provider.id) && compatibleModels(config, provider.id, capability).length > 0);
              const selectedProvider = current?.provider ?? '';
              const models = compatibleModels(config, selectedProvider, capability);
              return (
                <Card key={feature.feature} className="grid gap-3 p-4 md:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_minmax(220px,1.2fr)] md:items-end">
                  <div><p className="font-semibold text-sm">{feature.label}</p><p className="mt-1 text-xs text-muted">Capacidad: {capability}</p></div>
                  <Field label="Proveedor">
                    <Select value={selectedProvider} onChange={(event) => {
                      const provider = event.currentTarget.value || null;
                      const recommended = provider ? compatibleModels(config, provider, capability).find((model) => model.recommended) ?? compatibleModels(config, provider, capability)[0] : undefined;
                      updatePreference(feature.feature, { provider, model: recommended?.model_id ?? null, active: Boolean(provider) });
                    }}>
                      <option value="">Usar ruta institucional</option>
                      {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.label}</option>)}
                    </Select>
                  </Field>
                  <Field label="Modelo">
                    <Select disabled={!selectedProvider} value={current?.model ?? ''} onChange={(event) => updatePreference(feature.feature, { model: event.currentTarget.value || null })}>
                      <option value="">Selecciona un modelo</option>
                      {models.map((model) => <option key={model.model_id} value={model.model_id}>{model.label}{model.recommended ? ' · recomendado' : ''}</option>)}
                    </Select>
                  </Field>
                </Card>
              );
            })}
          </div>
        </details>
      )}

      {mode !== 'institutional' && (
        <Card className="space-y-4 border-amber-200 p-5 dark:border-amber-500/30">
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" className="mt-1 h-5 w-5 accent-brand-600 focus-ring" checked={allowFallback} onChange={(event) => setAllowFallback(event.currentTarget.checked)} />
            <span><span className="block font-semibold">Usar IA institucional si mi proveedor falla</span><span className="block text-sm text-muted">Con tu consentimiento, el trabajo continúa con la ruta segura de la institución. Si lo desactivas, el trabajo se marca para reintento sin perderse.</span></span>
          </label>
          <div className="rounded-xl bg-surface-2 p-4 text-sm leading-6 text-secondary">
            <strong>Antes de conectar:</strong> una suscripción de ChatGPT no incluye automáticamente crédito de OpenAI API. OpenCode usa su propia clave. Ollama solo puede utilizarse si el servidor de XCalificator tiene conectividad con esa instalación; por seguridad el docente no puede escribir URLs privadas.
          </div>
        </Card>
      )}
    </div>
  );
}
