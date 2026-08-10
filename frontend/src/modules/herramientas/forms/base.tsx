import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookCheck, ListChecks, Sparkles } from 'lucide-react';
import { Input, Field, Textarea, Button, Select, Badge, Skeleton } from '@/components/ui';
import { useMaterias } from '@/modules/materias/MateriaSelect';
import { listDbaCombinado } from '@/modules/materias/dbaApi';
import type { DBAUnifiedItem } from '@/types/api';
import { cn } from '@/lib/cn';
import { TagInput } from './widgets';

export interface ToolFormProps {
  loading: boolean;
  onSubmit: (payload: Record<string, unknown>) => void;
}

export interface BaseState {
  titulo: string;
  tema: string;
  grado: string;
  area: string;
  materia_id: string;
  instrucciones_adicionales: string;
  usar_dba: boolean;
  usar_rubrica: boolean;
  criterios_rubrica: string[];
  dba_ids: string[];
  dba_personalizado_ids: string[];
}

const EMPTY: BaseState = {
  titulo: '',
  tema: '',
  grado: '',
  area: '',
  materia_id: '',
  instrucciones_adicionales: '',
  usar_dba: false,
  usar_rubrica: false,
  criterios_rubrica: [],
  dba_ids: [],
  dba_personalizado_ids: [],
};

export function useBaseForm(initial?: Partial<BaseState>) {
  const [base, setBase] = useState<BaseState>({ ...EMPTY, ...initial });
  const set = <K extends keyof BaseState>(k: K, v: BaseState[K]) => setBase((p) => ({ ...p, [k]: v }));
  const selectedDbaCount = base.dba_ids.length + base.dba_personalizado_ids.length;
  const requiredFieldsValid = base.titulo.trim().length > 0 && base.tema.trim().length > 0;
  const alignmentValid = !base.usar_dba || selectedDbaCount > 0;
  const valid = requiredFieldsValid && alignmentValid;
  const payload = () => ({
    titulo: base.titulo.trim(),
    tema: base.tema.trim(),
    materia_id: base.materia_id || undefined,
    grado: base.grado.trim() || undefined,
    area: base.area.trim() || undefined,
    instrucciones_adicionales: base.instrucciones_adicionales.trim() || undefined,
    usar_dba: base.usar_dba,
    usar_rubrica: base.usar_rubrica,
    criterios_rubrica: base.usar_rubrica ? base.criterios_rubrica : [],
    dba_ids: base.dba_ids,
    dba_personalizado_ids: base.dba_personalizado_ids,
  });
  return { base, set, valid, requiredFieldsValid, alignmentValid, selectedDbaCount, payload };
}

export function BaseFields({ base, set, tituloPlaceholder }: { base: BaseState; set: ReturnType<typeof useBaseForm>['set']; tituloPlaceholder?: string }) {
  const { data: materias = [], isLoading } = useMaterias();
  return (
    <div className="space-y-4">
      <Field label="Materia" hint="Al elegirla completamos automáticamente el grado y el área. También mostraremos sus aprendizajes esperados.">
        <Select
          value={base.materia_id}
          onChange={(e) => {
            const materiaId = e.target.value;
            const selected = materias.find((materia) => materia.id === materiaId);
            set('materia_id', materiaId);
            set('dba_ids', []);
            set('dba_personalizado_ids', []);
            if (!materiaId) set('usar_dba', false);
            if (selected?.grado) set('grado', selected.grado);
            if (selected?.area) set('area', selected.area);
          }}
          disabled={isLoading}
        >
          <option value="">Selecciona una materia</option>
          {materias.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}{m.grado ? ` - ${m.grado}` : ''}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Título" required>
        <Input value={base.titulo} onChange={(e) => set('titulo', e.target.value)} placeholder={tituloPlaceholder ?? 'Mi material'} required />
      </Field>
      <Field label="Tema" required>
        <Input value={base.tema} onChange={(e) => set('tema', e.target.value)} placeholder="El ciclo del agua" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Grado"><Input value={base.grado} onChange={(e) => set('grado', e.target.value)} placeholder="4°" /></Field>
        <Field label="Área"><Input value={base.area} onChange={(e) => set('area', e.target.value)} placeholder="Ciencias Naturales" /></Field>
      </div>
    </div>
  );
}

export function PedagogicalApproachSelector({
  base,
  set,
}: {
  base: BaseState;
  set: ReturnType<typeof useBaseForm>['set'];
}) {
  const { data: items, isLoading, isError } = useQuery({
    queryKey: ['materia-dba', base.materia_id],
    queryFn: () => listDbaCombinado(base.materia_id),
    enabled: Boolean(base.materia_id),
    retry: false,
  });

  function toggle(item: DBAUnifiedItem) {
    const field = item.fuente === 'personalizado' ? 'dba_personalizado_ids' : 'dba_ids';
    const current = base[field];
    set(field, current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]);
  }

  const selectedCount = base.dba_ids.length + base.dba_personalizado_ids.length;
  const approachLabel = base.usar_dba && base.usar_rubrica
    ? 'DBA + rúbrica'
    : base.usar_dba
      ? 'DBA'
      : base.usar_rubrica
        ? 'Rúbrica'
        : 'Generación libre';

  return (
    <FormSection
      title="Enfoque pedagógico"
      hint="Opcional. Puedes generar libremente, alinear con DBA, usar criterios de rúbrica o combinar ambos."
    >
      <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2">
        <span className="text-sm text-muted">Enfoque actual</span>
        <Badge tone={base.usar_dba || base.usar_rubrica ? 'brand' : 'neutral'}>{approachLabel}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className={cn(
          'flex cursor-pointer gap-3 rounded-xl border-2 bg-surface p-4 transition-colors',
          base.usar_dba ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-500/10' : 'border-border hover:border-brand-300',
          !base.materia_id && 'cursor-not-allowed opacity-60',
        )}>
          <input
            type="checkbox"
            checked={base.usar_dba}
            disabled={!base.materia_id}
            onChange={(event) => {
              set('usar_dba', event.target.checked);
              if (!event.target.checked) {
                set('dba_ids', []);
                set('dba_personalizado_ids', []);
              }
            }}
            className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600"
          />
          <span>
            <span className="flex items-center gap-2 font-semibold"><BookCheck className="h-5 w-5 text-brand-600" /> Alinear con DBA</span>
            <span className="mt-1 block text-xs leading-5 text-muted">Usa aprendizajes oficiales o personalizados de la materia.</span>
          </span>
        </label>

        <label className={cn(
          'flex cursor-pointer gap-3 rounded-xl border-2 bg-surface p-4 transition-colors',
          base.usar_rubrica ? 'border-violet-500 bg-violet-50/60 dark:bg-violet-500/10' : 'border-border hover:border-violet-300',
        )}>
          <input
            type="checkbox"
            checked={base.usar_rubrica}
            onChange={(event) => {
              set('usar_rubrica', event.target.checked);
              if (!event.target.checked) set('criterios_rubrica', []);
            }}
            className="mt-0.5 h-5 w-5 shrink-0 accent-violet-600"
          />
          <span>
            <span className="flex items-center gap-2 font-semibold"><ListChecks className="h-5 w-5 text-violet-600" /> Usar criterios de rúbrica</span>
            <span className="mt-1 block text-xs leading-5 text-muted">Orienta la actividad con criterios observables de calidad.</span>
          </span>
        </label>
      </div>

      {!base.materia_id && (
        <p className="mt-3 text-xs text-muted">Selecciona una materia solo si deseas usar DBA. La generación libre y la rúbrica no la requieren.</p>
      )}

      {base.usar_dba && (
        <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
          <p className="mb-3 text-sm font-bold">Aprendizajes esperados</p>
          {isLoading ? (
            <Skeleton className="h-24" />
          ) : isError ? (
            <p className="text-sm text-danger">No se pudieron cargar los DBA. Puedes desactivar esta opción y generar libremente.</p>
          ) : !items?.length ? (
            <p className="text-sm text-muted">Esta materia no tiene DBA disponibles. Desactiva esta opción o crea un DBA personalizado.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-brand-700 dark:text-brand-200" aria-live="polite">
                {selectedCount === 0
                  ? 'Selecciona al menos un aprendizaje para usar este enfoque.'
                  : `${selectedCount} aprendizaje${selectedCount === 1 ? '' : 's'} seleccionado${selectedCount === 1 ? '' : 's'}.`}
              </p>
              <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                {items.map((item) => {
                  const selected = item.fuente === 'personalizado'
                    ? base.dba_personalizado_ids.includes(item.id)
                    : base.dba_ids.includes(item.id);
                  return (
                    <label key={`${item.fuente}-${item.id}`} className="flex cursor-pointer gap-3 rounded-lg border border-border bg-surface p-3">
                      <input type="checkbox" checked={selected} onChange={() => toggle(item)} className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600" />
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                          {item.codigo || 'DBA personalizado'}
                          <Badge tone={item.fuente === 'personalizado' ? 'violet' : 'brand'}>
                            {item.fuente === 'personalizado' ? 'Personalizado' : 'Oficial MEN'}
                          </Badge>
                        </span>
                        <span className="mt-1 block text-xs text-muted">{item.descripcion}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {base.usar_rubrica && (
        <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/40 p-4 dark:border-violet-500/30 dark:bg-violet-500/10">
          <p className="text-sm font-bold">Criterios de rúbrica</p>
          <p className="mb-3 mt-1 text-xs text-muted">Opcional. Escribe un criterio y pulsa Enter. Si lo dejas vacío, la IA propondrá criterios apropiados.</p>
          <TagInput
            value={base.criterios_rubrica}
            onChange={(value) => set('criterios_rubrica', value)}
            placeholder="Claridad, aplicación del concepto…"
          />
        </div>
      )}
    </FormSection>
  );
}

export function ExtraInstructions({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="Instrucciones adicionales (opcional)">
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder="Ejemplo: lenguaje sencillo y ejemplos cercanos al contexto del grupo…" />
    </Field>
  );
}

/** Sección visual dentro del formulario. */
export function FormSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2/40 p-4">
      <p className="font-display font-bold text-sm">{title}</p>
      {hint && <p className="mb-3 mt-0.5 text-xs text-muted">{hint}</p>}
      {!hint && <div className="mb-3" />}
      {children}
    </div>
  );
}

export function GenerateButton({
  loading,
  disabled,
  onClick,
  label = 'Revisar antes de generar',
  disabledHint = 'Completa los campos obligatorios. Si activaste DBA, selecciona al menos uno.',
}: {
  loading: boolean;
  disabled?: boolean;
  onClick: () => void;
  label?: string;
  disabledHint?: string;
}) {
  return (
    <div>
      <Button type="button" size="lg" loading={loading} disabled={disabled} onClick={onClick} className="w-full">
        <Sparkles className="h-5 w-5" /> {label}
      </Button>
      {disabled && !loading ? (
        <p className="mt-2 text-center text-sm text-muted" role="status">
          {disabledHint}
        </p>
      ) : null}
    </div>
  );
}
