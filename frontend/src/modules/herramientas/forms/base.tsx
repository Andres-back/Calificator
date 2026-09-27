import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookCheck, Library, ListChecks, Sparkles } from 'lucide-react';
import { Input, Field, Textarea, Button, Select, Badge, Skeleton } from '@/components/ui';
import { useMaterias } from '@/modules/materias/MateriaSelect';
import { listDbaCombinado } from '@/modules/materias/dbaApi';
import type { DBAUnifiedItem } from '@/types/api';
import { cn } from '@/lib/cn';
import { TagInput } from './widgets';
import { LearningCriteriaSelector } from '@/modules/evaluaciones/components/LearningCriteriaSelector';

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
  criterios_aprendizaje_version_id: string;
  enfoque_pedagogico: 'libre' | 'criterios_aprobados' | 'estandares' | 'rubrica_rapida';
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
  criterios_aprendizaje_version_id: '',
  enfoque_pedagogico: 'libre',
};

export function useBaseForm(initial?: Partial<BaseState>) {
  const [base, setBase] = useState<BaseState>({ ...EMPTY, ...initial });
  const set = <K extends keyof BaseState>(k: K, v: BaseState[K]) => setBase((p) => ({ ...p, [k]: v }));
  const selectedDbaCount = base.dba_ids.length + base.dba_personalizado_ids.length;
  const requiredFieldsValid = base.titulo.trim().length > 0 && base.tema.trim().length > 0;
  const alignmentValid = base.enfoque_pedagogico === 'estandares'
    ? selectedDbaCount > 0
    : base.enfoque_pedagogico === 'criterios_aprobados'
      ? Boolean(base.criterios_aprendizaje_version_id)
      : true;
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
    ...(base.criterios_aprendizaje_version_id
      ? { criterios_aprendizaje_version_id: base.criterios_aprendizaje_version_id }
      : {}),
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
            set('criterios_aprendizaje_version_id', '');
            set('usar_dba', false);
            set('usar_rubrica', false);
            set('criterios_rubrica', []);
            set('enfoque_pedagogico', 'libre');
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
  const approachLabel = {
    libre: 'Generación libre',
    criterios_aprobados: 'Criterios aprobados',
    estandares: 'Estándares oficiales',
    rubrica_rapida: 'Criterios rápidos',
  }[base.enfoque_pedagogico];

  const selectApproach = (approach: BaseState['enfoque_pedagogico']) => {
    set('enfoque_pedagogico', approach);
    set('usar_dba', approach === 'estandares');
    set('usar_rubrica', approach === 'rubrica_rapida');
    if (approach !== 'estandares') {
      set('dba_ids', []);
      set('dba_personalizado_ids', []);
    }
    if (approach !== 'criterios_aprobados') set('criterios_aprendizaje_version_id', '');
    if (approach !== 'rubrica_rapida' && approach !== 'criterios_aprobados') {
      set('criterios_rubrica', []);
    }
  };

  const approaches: Array<{
    id: BaseState['enfoque_pedagogico'];
    title: string;
    description: string;
    icon: typeof Sparkles;
    requiresSubject?: boolean;
  }> = [
    { id: 'libre', title: 'Generación libre', description: 'La IA propone el enfoque según el tema.', icon: Sparkles },
    { id: 'criterios_aprobados', title: 'Criterios aprobados', description: 'Reutiliza una versión que ya revisaste.', icon: BookCheck, requiresSubject: true },
    { id: 'estandares', title: 'Estándares oficiales', description: 'Usa referencias curriculares de la materia.', icon: Library, requiresSubject: true },
    { id: 'rubrica_rapida', title: 'Escribir criterios rápidos', description: 'Escribe indicaciones breves solo para este recurso.', icon: ListChecks },
  ];

  return (
    <FormSection
      title="Enfoque pedagógico"
      hint="Opcional. Puedes usar criterios aprobados, estándares oficiales, una rúbrica rápida o generar libremente."
    >
      <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2">
        <span className="text-sm text-muted">Enfoque actual</span>
        <Badge tone={base.enfoque_pedagogico === 'libre' ? 'neutral' : 'brand'}>{approachLabel}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {approaches.map((approach) => {
          const Icon = approach.icon;
          const disabled = Boolean(approach.requiresSubject && !base.materia_id);
          const selected = base.enfoque_pedagogico === approach.id;
          return (
            <button
              key={approach.id}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => selectApproach(approach.id)}
              className={cn(
                'focus-ring flex min-h-24 w-full gap-3 rounded-xl border-2 bg-surface p-4 text-left transition-colors',
                selected ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-500/10' : 'border-border hover:border-brand-300',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              <span>
                <span className="block font-semibold">{approach.title}</span>
                <span className="mt-1 block text-xs leading-5 text-muted">{approach.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      {base.enfoque_pedagogico === 'criterios_aprobados' && <div className="mt-4">
        <LearningCriteriaSelector
          materiaId={base.materia_id}
          value={base.criterios_aprendizaje_version_id}
          onChange={(versionId, criteria) => {
            set('criterios_aprendizaje_version_id', versionId);
            set('usar_rubrica', Boolean(versionId));
            set('criterios_rubrica', versionId ? criteria.map((item) => item.nombre) : []);
          }}
        />
      </div>}

      {!base.materia_id && (
        <p className="mt-3 text-xs text-muted">Selecciona una materia para usar criterios guardados o estándares oficiales. La generación libre no los requiere.</p>
      )}

      {base.enfoque_pedagogico === 'estandares' && (
        <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
          <p className="mb-3 text-sm font-bold">Estándares oficiales y referencias históricas</p>
          {isLoading ? (
            <Skeleton className="h-24" />
          ) : isError ? (
            <p className="text-sm text-danger">No se pudieron cargar los estándares. Puedes desactivar esta opción y generar libremente.</p>
          ) : !items?.length ? (
            <p className="text-sm text-muted">Esta materia no tiene estándares disponibles. Puedes continuar sin ellos.</p>
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
                          {item.codigo || 'Referencia docente'}
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

      {base.enfoque_pedagogico === 'rubrica_rapida' && (
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
  disabledHint = 'Completa los campos obligatorios y termina de elegir el enfoque pedagógico.',
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
