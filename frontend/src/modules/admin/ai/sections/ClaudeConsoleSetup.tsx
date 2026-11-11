import { useRef, useState } from 'react';
import { Button, Card, Field, Input } from '@/components/ui';
import { toApiError } from '@/lib/api';
import {
  prepareCompatibleConnection, probeCompatibleModel, publishAIControlCenter,
  type AIModel, type AIProvider, type AIToolControl, type FeatureRouting,
} from '../../api';

export interface ClaudeConsoleSetupProps {
  providers: AIProvider[];
  models: AIModel[];
  features: FeatureRouting[];
  tools: AIToolControl[];
  expectedVersion: number;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onSaved: () => void;
}

const CLAUDE_BASE_URL = 'https://api.anthropic.com/v1';
const CLAUDE_MODEL = 'claude-sonnet-5-5';
const GRADING_FEATURE = 'calificacion.valoracion';

export function ClaudeConsoleSetup({
  providers, models, features, tools, expectedVersion, disabled = false, onBusyChange, onSaved,
}: ClaudeConsoleSetupProps) {
  const [secret, setSecret] = useState('');
  const [preparedProvider, setPreparedProvider] = useState<AIProvider | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [conflictVersion, setConflictVersion] = useState<number | null>(null);
  const submitting = useRef(false);
  const needsRefresh = conflictVersion === expectedVersion;

  async function save() {
    if (disabled || submitting.current || needsRefresh || (!secret.trim() && !preparedProvider)) return;
    if (features.filter((feature) => feature.feature === GRADING_FEATURE).length !== 1) {
      setMessage('No se encontró una ruta única de valoración. Recarga la configuración antes de guardar.');
      return;
    }
    submitting.current = true;
    setBusy(true);
    onBusyChange?.(true);
    setMessage('');
    const enteredSecret = secret.trim();
    try {
      let connection = preparedProvider;
      if (enteredSecret) {
        connection = await prepareCompatibleConnection({
          label: 'Claude Console', base_url: CLAUDE_BASE_URL, api_key: enteredSecret,
        });
        setSecret('');
        setPreparedProvider(connection);
      }
      if (!connection) return;
      const model: AIModel = {
        provider_id: connection.id,
        model_id: CLAUDE_MODEL,
        label: 'Claude Sonnet 5.5',
        capabilities: ['text', 'vision'],
        recommended: false,
        active: true,
        runtime_profile: {
          protocol: 'messages', auth_style: 'auto', thinking: null,
          reasoning_effort: null, send_temperature: false,
        },
      };
      const checked = await probeCompatibleModel(connection, model);
      if (checked.status !== 'ok') {
        const detail = checked.detail || 'No se pudo comprobar Sonnet. Revisa el acceso de la clave e intenta nuevamente.';
        setMessage(enteredSecret && detail.includes(enteredSecret)
          ? 'No se pudo comprobar Sonnet. Revisa el acceso de la clave e intenta nuevamente.'
          : detail);
        return;
      }
      if (!checked.provider || !checked.model?.verification_id
        || checked.provider.id !== connection.id || checked.provider.base_url !== CLAUDE_BASE_URL
        || checked.model.provider_id !== connection.id || checked.model.model_id !== CLAUDE_MODEL
        || checked.model.runtime_profile?.protocol !== 'messages'
        || !checked.model.capabilities.includes('vision')) {
        setMessage('La prueba no devolvió una configuración completa de Sonnet con imágenes. Intenta nuevamente.');
        return;
      }
      const checkedProvider = checked.provider;
      const checkedModel = checked.model;
      setPreparedProvider(checkedProvider);
      const nextProviders = providers.some((provider) => provider.id === checkedProvider.id)
        ? providers.map((provider) => provider.id === checkedProvider.id ? checkedProvider : provider)
        : [...providers, checkedProvider];
      const isCheckedModel = (item: AIModel) => item.provider_id === checkedModel.provider_id && item.model_id === checkedModel.model_id;
      const nextModels = models.some(isCheckedModel)
        ? models.map((item) => isCheckedModel(item) ? checkedModel : item)
        : [...models, checkedModel];
      const nextFeatures = features.map((feature) => feature.feature === GRADING_FEATURE
        ? { ...feature, primary_provider: checkedProvider.id, primary_model: CLAUDE_MODEL }
        : feature);
      const published = await publishAIControlCenter(nextProviders, nextModels, nextFeatures, tools, expectedVersion);
      if (published.status !== 'ok') {
        setMessage('No se confirmó el guardado de la configuración. Recarga la página y comprueba la selección.');
        return;
      }
      setPreparedProvider(null);
      setMessage('Sonnet 5.5 quedó guardado como calificador principal con lectura de imágenes.');
      onSaved();
    } catch (error) {
      const { status, detail } = toApiError(error);
      if (status === 409) {
        setConflictVersion(expectedVersion);
        setMessage('La configuración cambió en otra sesión. Recarga la página antes de guardar de nuevo.');
      } else if (status === 401) {
        setMessage('Tu sesión expiró. Inicia sesión nuevamente para guardar la configuración.');
      } else if (status === 403) {
        setMessage('No se pudo autorizar el guardado. Recarga la página y comprueba tu permiso para gestionar la IA.');
      } else if (status === 422) {
        setMessage(enteredSecret && detail.includes(enteredSecret)
          ? 'Revisa la configuración de Claude Console antes de guardar de nuevo.'
          : detail);
      } else {
        setMessage('No se pudo completar la configuración. Comprueba tu conexión y vuelve a intentarlo.');
      }
    } finally {
      submitting.current = false;
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-bold">Claude Console · Sonnet 5.5</h2>
        <p className="mt-1 text-sm text-muted">Introduce tu clave para usar Sonnet 5.5 como calificador principal, con texto e imágenes.</p>
        <p className="mt-1 break-all text-xs text-muted">API oficial: {CLAUDE_BASE_URL}</p>
      </div>
      <fieldset disabled={disabled || busy} className="min-w-0 space-y-3">
        <Field label="Clave de Claude Console">
          <Input type="password" autoComplete="new-password" value={secret}
            onChange={(event) => setSecret(event.currentTarget.value)}
            placeholder={preparedProvider ? 'Clave preparada; puedes reintentar' : 'Introduce tu clave de API'} />
        </Field>
        <p className="text-xs text-muted">Se realiza una prueba breve con una imagen ficticia que consume una pequeña cantidad de tu saldo.</p>
        <Button className="h-auto min-h-11 whitespace-normal py-2 text-left"
          disabled={disabled || busy || needsRefresh || (!secret.trim() && !preparedProvider)}
          loading={busy} loadingLabel="Comprobando y guardando Sonnet…" onClick={() => void save()}>
          Guardar clave y usar Sonnet 5.5
        </Button>
      </fieldset>
      {disabled && <p className="text-sm text-muted">Guarda o descarta tus cambios pendientes antes de configurar Claude Console.</p>}
      {preparedProvider && !busy && <p className="text-xs text-muted">La clave ya está preparada. Puedes reintentar sin escribirla de nuevo, o introducir otra clave.</p>}
      {message && <p role="status" className="break-words rounded-lg bg-surface-2 p-3 text-sm">{message}</p>}
    </Card>
  );
}
