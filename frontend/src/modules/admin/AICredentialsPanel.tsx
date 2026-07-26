import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Database, Eye, EyeOff, KeyRound, LockKeyhole, Save, ServerCog, Trash2 } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, Field, Input } from '@/components/ui';
import { queryClient } from '@/lib/queryClient';
import { toApiError } from '@/lib/api';
import {
  updateGlobalAIConfig,
  type GlobalAIConfig,
  type GlobalAIConfigUpdate,
} from './api';

type CredentialId = 'openai' | 'groq' | 'open_code' | 'cloudflare';

const CREDENTIALS: Array<{
  id: CredentialId;
  label: string;
  description: string;
  placeholder: string;
  configured: keyof Pick<GlobalAIConfig, 'has_openai_key' | 'has_groq_key' | 'has_open_code_key' | 'has_cloudflare'>;
  payloadKey: keyof Pick<GlobalAIConfigUpdate, 'openai_key' | 'groq_key' | 'open_code_key' | 'cloudflare_token'>;
}> = [
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'Visión, imágenes y embeddings.',
    placeholder: 'sk-...',
    configured: 'has_openai_key',
    payloadKey: 'openai_key',
  },
  {
    id: 'groq',
    label: 'Groq',
    description: 'Texto y visión de alta velocidad.',
    placeholder: 'gsk_...',
    configured: 'has_groq_key',
    payloadKey: 'groq_key',
  },
  {
    id: 'open_code',
    label: 'OpenCode',
    description: 'Generación de contenido y fallback de texto.',
    placeholder: 'Clave del proveedor',
    configured: 'has_open_code_key',
    payloadKey: 'open_code_key',
  },
  {
    id: 'cloudflare',
    label: 'Cloudflare Workers AI',
    description: 'Generación económica de imágenes.',
    placeholder: 'Token de API',
    configured: 'has_cloudflare',
    payloadKey: 'cloudflare_token',
  },
];

const EMPTY_SECRETS: Record<CredentialId, string> = {
  openai: '',
  groq: '',
  open_code: '',
  cloudflare: '',
};

function sourceLabel(source: string | undefined) {
  if (source === 'database') return 'Guardada en plataforma';
  if (source === 'environment') return 'Variable de entorno';
  if (source === 'mixed') return 'Configuración mixta';
  return 'Sin configurar';
}

function sourceIcon(source: string | undefined) {
  return source === 'environment' ? ServerCog : Database;
}

export function AICredentialsPanel({ config }: { config: GlobalAIConfig }) {
  const [secrets, setSecrets] = useState(EMPTY_SECRETS);
  const [visible, setVisible] = useState<Record<CredentialId, boolean>>({ openai: false, groq: false, open_code: false, cloudflare: false });
  const [accountId, setAccountId] = useState(config.cloudflare_account_id ?? '');
  const [accountTouched, setAccountTouched] = useState(false);
  const [clearTarget, setClearTarget] = useState<CredentialId | null>(null);

  useEffect(() => {
    if (!accountTouched) setAccountId(config.cloudflare_account_id ?? '');
  }, [accountTouched, config.cloudflare_account_id]);

  const hasSecretChanges = useMemo(() => Object.values(secrets).some((value) => value.trim().length > 0), [secrets]);
  const hasChanges = hasSecretChanges || accountTouched;

  const saveMutation = useMutation({
    mutationFn: (payload: GlobalAIConfigUpdate) => updateGlobalAIConfig(payload),
    onSuccess: () => {
      setSecrets(EMPTY_SECRETS);
      setAccountTouched(false);
      void queryClient.invalidateQueries({ queryKey: ['admin-ai-settings'] });
      toast.success('Credenciales guardadas y listas para usarse.');
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const clearMutation = useMutation({
    mutationFn: (target: CredentialId) => {
      const payload: GlobalAIConfigUpdate = target === 'cloudflare'
        ? { clear_cloudflare_token: true, clear_cloudflare_account_id: true }
        : { [`clear_${target}_key`]: true } as GlobalAIConfigUpdate;
      return updateGlobalAIConfig(payload);
    },
    onSuccess: () => {
      setClearTarget(null);
      setAccountTouched(false);
      void queryClient.invalidateQueries({ queryKey: ['admin-ai-settings'] });
      toast.success('Credencial retirada de la plataforma.');
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  function save() {
    const payload: GlobalAIConfigUpdate = {};
    for (const item of CREDENTIALS) {
      const value = secrets[item.id].trim();
      if (value) payload[item.payloadKey] = value;
    }
    if (accountTouched) payload.cloudflare_account_id = accountId.trim() || null;
    if (secrets.cloudflare.trim() && !accountId.trim()) {
      toast.error('Agrega el Account ID de Cloudflare antes de guardar su token.');
      return;
    }
    saveMutation.mutate(payload);
  }

  const targetMeta = CREDENTIALS.find((item) => item.id === clearTarget);

  return (
    <section aria-labelledby="ai-credentials-title">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <LockKeyhole className="h-5 w-5 text-emerald-500" />
            <h2 id="ai-credentials-title" className="font-display text-lg font-bold">Credenciales de proveedores</h2>
          </div>
          <p className="mt-1 text-sm text-muted">Las claves se cifran en el servidor, nunca vuelven al navegador y sustituyen a las variables de entorno cuando se guardan aquí.</p>
        </div>
        <Button onClick={save} loading={saveMutation.isPending} disabled={!hasChanges || saveMutation.isPending}>
          <Save className="h-4 w-4" /> Guardar credenciales
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {CREDENTIALS.map((item) => {
          const configured = Boolean(config[item.configured]);
          const source = config.credential_sources?.[item.id];
          const SourceIcon = sourceIcon(source);
          const canClearStored = source === 'database' || source === 'mixed';
          return (
            <Card key={item.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"><KeyRound className="h-5 w-5" /></span>
                  <div>
                    <p className="font-semibold">{item.label}</p>
                    <p className="mt-0.5 text-xs text-muted">{item.description}</p>
                  </div>
                </div>
                <Badge tone={configured ? 'success' : 'warning'}>{configured ? 'Configurada' : 'Pendiente'}</Badge>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">
                <SourceIcon className="h-4 w-4" />
                <span>{sourceLabel(source)}</span>
              </div>

              {item.id === 'cloudflare' && (
                <Field label="Account ID">
                  <Input
                    value={accountId}
                    onChange={(event) => { setAccountId(event.currentTarget.value); setAccountTouched(true); }}
                    placeholder="Identificador de la cuenta"
                    autoComplete="off"
                  />
                </Field>
              )}

              <div className="mt-3">
                <Field label={configured ? 'Reemplazar clave' : 'Clave API'} hint="Déjalo vacío para conservar la credencial actual.">
                  <div className="relative">
                    <Input
                      type={visible[item.id] ? 'text' : 'password'}
                      value={secrets[item.id]}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setSecrets((current) => ({ ...current, [item.id]: value }));
                      }}
                      placeholder={item.placeholder}
                      autoComplete="new-password"
                      spellCheck={false}
                      className="pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setVisible((current) => ({ ...current, [item.id]: !current[item.id] }))}
                      className="focus-ring absolute right-0 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-fg"
                      aria-label={visible[item.id] ? `Ocultar clave de ${item.label}` : `Mostrar clave de ${item.label}`}
                    >
                      {visible[item.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>
              </div>

              {canClearStored && (
                <Button size="sm" variant="ghost" className="mt-3 text-rose-600 dark:text-rose-300" onClick={() => setClearTarget(item.id)}>
                  <Trash2 className="h-4 w-4" /> Retirar credencial guardada
                </Button>
              )}
              {source === 'environment' && <p className="mt-3 text-xs text-muted">Esta credencial se administra en el entorno del servidor y no puede retirarse desde el navegador.</p>}
            </Card>
          );
        })}
      </div>

      <ConfirmDialog
        open={Boolean(clearTarget)}
        onClose={() => setClearTarget(null)}
        onConfirm={() => clearTarget && clearMutation.mutate(clearTarget)}
        title={`Retirar credencial de ${targetMeta?.label ?? 'proveedor'}`}
        description="El proveedor dejará de estar disponible si no existe una credencial de respaldo en las variables de entorno. Ningún contenido existente será eliminado."
        confirmLabel="Retirar credencial"
        tone="danger"
        loading={clearMutation.isPending}
      />
    </section>
  );
}
