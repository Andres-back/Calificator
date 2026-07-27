import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  FileText,
  ListChecks,
  CheckCircle,
  XCircle,
  Type,
  HelpCircle,
  BookOpen,
  CheckSquare,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Badge, Skeleton, Modal, Field } from '@/components/ui';
import { BotonGrande } from '@/components/ui/BotonGrande';
import { listDbaCombinado } from '@/modules/materias/dbaApi';
import { PasosGuia } from './PasosGuia';
import type { DBAUnifiedItem, EvaluacionModalidad } from '@/types/api';
import type { EvaluacionGenerarRequest } from '../api';

/* ── Constantes ── */
const STORAGE_KEY = 'xcal-wizard-progress';

type TipoPregunta = 'opcion_multiple' | 'abierta' | 'verdadero_falso' | 'completar';

const TIPOS_DISPONIBLES: { value: TipoPregunta; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'opcion_multiple', label: 'Opción múltiple', icon: <ListChecks className="h-6 w-6" />, desc: 'Varias opciones, una respuesta correcta' },
  { value: 'verdadero_falso', label: 'Verdadero / Falso', icon: <div className="flex gap-1"><CheckCircle className="h-6 w-6 text-emerald-500" /><XCircle className="h-6 w-6 text-rose-500" /></div>, desc: 'Afirmaciones para juzgar como verdaderas o falsas' },
  { value: 'abierta', label: 'Abierta', icon: <FileText className="h-6 w-6" />, desc: 'Respuesta libre y desarrollada por el estudiante' },
  { value: 'completar', label: 'Completar', icon: <Type className="h-6 w-6" />, desc: 'Completar espacios en blanco en una frase' },
];

const POLITICA_OPCIONES = [
  { value: 'un_intento', label: 'Intento único' },
  { value: 'multiples_intentos', label: 'Múltiples intentos' },
  { value: '', label: 'Sin definir (por defecto)' },
];

/* ── Estado inicial ── */
interface WizardForm {
  materia_id: string;
  nombre: string;
  descripcion: string;
  modalidad: EvaluacionModalidad;
  nota_maxima: number;
  cantidad_preguntas: number;
  tipos_pregunta: TipoPregunta[];
  dba_ids: string[];
  dba_personalizado_ids: string[];
  metas: string[];
  criterios: string[];
  instrucciones_adicionales: string;
  politica_intento: 'un_intento' | 'multiples_intentos' | null;
  intentos_permitidos: number;
  tiempo_limite_minutos: number;
  tema: string;
}

function emptyWizardForm(materiaId = ''): WizardForm {
  return {
    materia_id: materiaId,
    nombre: '',
    descripcion: '',
    modalidad: 'online',
    nota_maxima: 5,
    cantidad_preguntas: 10,
    tipos_pregunta: ['opcion_multiple', 'abierta'],
    dba_ids: [],
    dba_personalizado_ids: [],
    metas: [],
    criterios: [],
    instrucciones_adicionales: '',
    politica_intento: null,
    intentos_permitidos: 1,
    tiempo_limite_minutos: 0,
    tema: '',
  };
}

function saveToLocalStorage(form: WizardForm, step: number, materiaNombre: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, step, materiaNombre, savedAt: Date.now() }));
  } catch { /* quota exceeded, ignore */ }
}

function loadFromLocalStorage(): { form: WizardForm; step: number; materiaNombre: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.form || typeof data.step !== 'number') return null;
    const elapsed = Date.now() - (data.savedAt || 0);
    if (elapsed > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function clearSavedProgress() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

/* ── Step content components ── */

function StepMateria({
  form,
  materias,
  onChange,
}: {
  form: WizardForm;
  materias: { id: string; nombre: string }[] | undefined;
  onChange: (patch: Partial<WizardForm>) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted">Selecciona la materia para la que deseas crear la evaluación.</p>
      </div>

      <Field label="Materia" required>
        <select
          value={form.materia_id}
          onChange={(e) => onChange({ materia_id: e.target.value })}
          className="focus-ring min-h-[48px] w-full rounded-xl border-2 border-border bg-surface px-4 text-lg text-fg transition-colors hover:border-brand-300 focus:border-brand-500"
          required
        >
          <option value="">— Selecciona una materia —</option>
          {materias?.map((m) => (
            <option key={m.id} value={m.id} className="text-base">{m.nombre}</option>
          ))}
        </select>
      </Field>

      <Field label="Nombre de la evaluación" required hint="Ej. Evaluación bimestral de ciencias">
        <input
          type="text"
          value={form.nombre}
          onChange={(e) => onChange({ nombre: e.target.value })}
          placeholder="Ej. Evaluación bimestral - Unidad 3"
          className="focus-ring min-h-[48px] w-full rounded-xl border-2 border-border bg-surface px-4 text-lg text-fg placeholder:text-muted/60 transition-colors hover:border-brand-300 focus:border-brand-500"
          minLength={2}
          required
        />
      </Field>

      <Field label="Descripción (opcional)" hint="Propósito y alcance de la evaluación">
        <textarea
          value={form.descripcion}
          onChange={(e) => onChange({ descripcion: e.target.value })}
          placeholder="Ej. Esta evaluación cubre los temas vistos en la unidad 3..."
          className="focus-ring min-h-[48px] w-full rounded-xl border-2 border-border bg-surface px-4 py-3 text-lg text-fg placeholder:text-muted/60 transition-colors hover:border-brand-300 focus:border-brand-500"
          rows={2}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Modalidad" required>
          <select
            value={form.modalidad}
            onChange={(e) => onChange({ modalidad: e.target.value as EvaluacionModalidad })}
            className="focus-ring min-h-[48px] w-full rounded-xl border-2 border-border bg-surface px-4 text-lg text-fg transition-colors hover:border-brand-300 focus:border-brand-500"
          >
            <option value="online">Online</option>
            <option value="fisica">Física</option>
            <option value="mixta">Mixta</option>
          </select>
        </Field>
        <Field label="Nota máxima" required>
          <input
            type="number"
            min={0.1}
            step="0.1"
            value={form.nota_maxima}
            onChange={(e) => onChange({ nota_maxima: Math.max(0.1, Number(e.target.value)) })}
            className="focus-ring min-h-[48px] w-full rounded-xl border-2 border-border bg-surface px-4 text-lg text-fg transition-colors hover:border-brand-300 focus:border-brand-500"
          />
        </Field>
      </div>
    </div>
  );
}

function StepDBA({
  items,
  loading,
  error,
  selectedOfficial,
  selectedCustom,
  onToggle,
}: {
  items: DBAUnifiedItem[] | undefined;
  loading: boolean;
  error: boolean;
  selectedOfficial: string[];
  selectedCustom: string[];
  onToggle: (item: DBAUnifiedItem) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-500/30 dark:bg-amber-500/10">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
        <p className="mt-3 text-base font-semibold text-amber-800 dark:text-amber-200">Error al cargar DBA</p>
        <p className="mt-1 text-sm text-amber-600 dark:text-amber-300">Puedes continuar sin seleccionar DBA, pero la IA tendrá menos contexto.</p>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="rounded-xl border-2 border-border bg-surface p-6 text-center">
        <BookOpen className="mx-auto h-10 w-10 text-muted" />
        <p className="mt-3 text-base font-semibold text-fg">No hay DBA disponibles</p>
        <p className="mt-1 text-sm text-muted">Puedes continuar sin seleccionar DBA.</p>
      </div>
    );
  }

  const hasCustom = items.some((item) => item.fuente === 'personalizado');

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Selecciona los DBA (Derechos Básicos de Aprendizaje) que evaluará esta prueba.
        La IA los usará como base para generar preguntas alineadas al currículo.
      </p>
      <p className="text-xs font-semibold text-brand-600">
        {selectedOfficial.length + selectedCustom.length} seleccionados
      </p>
      <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border-2 border-border bg-surface p-3">
        {items.map((item) => {
          const isSelected = item.fuente === 'personalizado'
            ? selectedCustom.includes(item.id)
            : selectedOfficial.includes(item.id);
          return (
            <button
              key={`${item.fuente}-${item.id}`}
              type="button"
              onClick={() => onToggle(item)}
              className={[
                'flex w-full gap-4 rounded-xl border-2 p-4 text-left transition-all',
                isSelected
                  ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-500/10'
                  : 'border-border bg-surface hover:border-brand-300 hover:bg-surface-2',
              ].join(' ')}
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center">
                <CheckSquare
                  className={cn(
                    'h-6 w-6',
                    isSelected ? 'text-brand-600' : 'text-border',
                  )}
                  fill={isSelected ? 'currentColor' : 'none'}
                />
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2 text-base font-semibold text-fg">
                  {item.codigo || 'DBA personalizado'}
                  <Badge tone={item.fuente === 'personalizado' ? 'violet' : 'brand'}>
                    {item.fuente === 'personalizado' ? 'Personalizado' : 'MEN'}
                  </Badge>
                </span>
                <span className="mt-1 block text-sm text-muted">{item.area} · Grado {item.grado}</span>
                <span className="mt-1 block text-sm text-fg">{item.descripcion}</span>
              </span>
            </button>
          );
        })}
      </div>
      {!hasCustom && (
        <p className="text-xs text-muted">⬆ Esta materia no tiene DBA personalizados.</p>
      )}
    </div>
  );
}

function StepCantidad({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">¿Cuántas preguntas debe tener la evaluación?</p>

      <div className="flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={() => onChange(Math.max(3, value - 1))}
          disabled={value <= 3}
          className="focus-ring grid h-14 w-14 place-items-center rounded-2xl border-2 border-border bg-surface text-2xl font-bold text-fg transition-all hover:border-brand-400 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-brand-500/10"
          aria-label="Reducir cantidad de preguntas"
        >
          −
        </button>

        <div className="flex min-w-[100px] flex-col items-center">
          <span className="text-6xl font-bold text-brand-700 tabular-nums">{value}</span>
          <span className="text-sm text-muted">preguntas</span>
        </div>

        <button
          type="button"
          onClick={() => onChange(Math.min(30, value + 1))}
          disabled={value >= 30}
          className="focus-ring grid h-14 w-14 place-items-center rounded-2xl border-2 border-border bg-surface text-2xl font-bold text-fg transition-all hover:border-brand-400 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-brand-500/10"
          aria-label="Aumentar cantidad de preguntas"
        >
          +
        </button>
      </div>

      {/* Slider de rango visual */}
      <div className="mx-auto max-w-md">
        <input
          type="range"
          min={3}
          max={30}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-brand-600"
          aria-label="Cantidad de preguntas (deslizador)"
        />
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span>3</span>
          <span>10</span>
          <span>20</span>
          <span>30</span>
        </div>
      </div>
    </div>
  );
}

function StepTipoPregunta({
  selected,
  onChange,
}: {
  selected: TipoPregunta[];
  onChange: (tipos: TipoPregunta[]) => void;
}) {
  function toggle(tipo: TipoPregunta) {
    if (selected.includes(tipo)) {
      if (selected.length <= 1) return; // keep at least one
      onChange(selected.filter((t) => t !== tipo));
    } else {
      onChange([...selected, tipo]);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">¿Qué tipo de preguntas quieres generar? Puedes seleccionar varios.</p>

      <div className="grid gap-3 sm:grid-cols-2">
        {TIPOS_DISPONIBLES.map((tipo) => {
          const isSelected = selected.includes(tipo.value);
          return (
            <button
              key={tipo.value}
              type="button"
              onClick={() => toggle(tipo.value)}
              className={[
                'flex items-start gap-4 rounded-xl border-2 p-5 text-left transition-all',
                isSelected
                  ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200 dark:border-brand-400 dark:bg-brand-500/10 dark:ring-brand-500/30'
                  : 'border-border bg-surface hover:border-brand-300 hover:bg-surface-2',
              ].join(' ')}
            >
              <span className={cn(
                'grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl',
                isSelected ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200' : 'bg-surface-2 text-muted',
              )}>
                {tipo.icon}
              </span>
              <span>
                <span className={cn(
                  'block text-lg font-bold',
                  isSelected ? 'text-brand-800 dark:text-brand-200' : 'text-fg',
                )}>
                  {tipo.label}
                </span>
                <span className="mt-1 block text-sm text-muted">{tipo.desc}</span>
                {isSelected && (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
                    <CheckCircle className="h-3 w-3" /> Seleccionado
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepDetalles({
  form,
  onChange,
}: {
  form: WizardForm;
  onChange: (patch: Partial<WizardForm>) => void;
}) {
  const [metaInput, setMetaInput] = useState('');
  const [criterioInput, setCriterioInput] = useState('');

  function addMeta() {
    const v = metaInput.trim();
    if (!v) return;
    onChange({ metas: [...form.metas, v] });
    setMetaInput('');
  }

  function removeMeta(index: number) {
    onChange({ metas: form.metas.filter((_, i) => i !== index) });
  }

  function addCriterio() {
    const v = criterioInput.trim();
    if (!v) return;
    onChange({ criterios: [...form.criterios, v] });
    setCriterioInput('');
  }

  function removeCriterio(index: number) {
    onChange({ criterios: form.criterios.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">Completa los detalles adicionales para que la IA genere una evaluación más precisa.</p>

      {/* Metas del profesor */}
      <div className="rounded-xl border-2 border-border bg-surface p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
            <BookOpen className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-fg">Metas del profesor</p>
            <p className="text-sm text-muted">¿Qué quieres que los estudiantes logren con esta evaluación?</p>

            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={metaInput}
                onChange={(e) => setMetaInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMeta(); } }}
                placeholder="Ej. Identificar relaciones causa-efecto"
                className="focus-ring min-h-[44px] flex-1 rounded-xl border-2 border-border bg-surface px-4 text-base text-fg placeholder:text-muted/60 transition-colors hover:border-brand-300 focus:border-brand-500"
              />
              <button
                type="button"
                onClick={addMeta}
                disabled={!metaInput.trim()}
                className="focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-brand-300 bg-brand-50 px-4 text-base font-semibold text-brand-700 transition-colors hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200"
              >
                Agregar
              </button>
            </div>

            {form.metas.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {form.metas.map((meta, i) => (
                  <span key={i} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-sm font-medium text-fg">
                    {meta}
                    <button type="button" onClick={() => removeMeta(i)} className="text-muted hover:text-rose-600" aria-label={`Eliminar meta ${i + 1}`}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Criterios de evaluación */}
      <div className="rounded-xl border-2 border-border bg-surface p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
            <HelpCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-fg">Criterios de evaluación</p>
            <p className="text-sm text-muted">¿Cómo se calificará? Define los criterios para la corrección automática.</p>

            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={criterioInput}
                onChange={(e) => setCriterioInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCriterio(); } }}
                placeholder="Ej. Procedimiento claro, uso de vocabulario técnico"
                className="focus-ring min-h-[44px] flex-1 rounded-xl border-2 border-border bg-surface px-4 text-base text-fg placeholder:text-muted/60 transition-colors hover:border-brand-300 focus:border-brand-500"
              />
              <button
                type="button"
                onClick={addCriterio}
                disabled={!criterioInput.trim()}
                className="focus-ring inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 text-base font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
              >
                Agregar
              </button>
            </div>

            {form.criterios.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {form.criterios.map((c, i) => (
                  <span key={i} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-sm font-medium text-fg">
                    {c}
                    <button type="button" onClick={() => removeCriterio(i)} className="text-muted hover:text-rose-600" aria-label={`Eliminar criterio ${i + 1}`}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Instrucciones adicionales */}
      <div className="rounded-xl border-2 border-border bg-surface p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
            <FileText className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-fg">Instrucciones adicionales para la IA</p>
            <p className="text-sm text-muted">Indicaciones extras para la generación de preguntas (opcional).</p>
            <textarea
              value={form.instrucciones_adicionales}
              onChange={(e) => onChange({ instrucciones_adicionales: e.target.value })}
              placeholder="Ej. Incluir preguntas de análisis y aplicación, no solo de memorización..."
              className="focus-ring mt-3 min-h-[80px] w-full rounded-xl border-2 border-border bg-surface px-4 py-3 text-base text-fg placeholder:text-muted/60 transition-colors hover:border-brand-300 focus:border-brand-500"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Política de intentos y tiempo */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border-2 border-border bg-surface p-4">
          <p className="text-base font-bold text-fg">Política de intentos</p>
          <p className="text-sm text-muted">¿Cuántos intentos tiene el estudiante?</p>
          <select
            value={form.politica_intento ?? ''}
            onChange={(e) => onChange({ politica_intento: (e.target.value || null) as 'un_intento' | 'multiples_intentos' | null })}
            className="focus-ring mt-3 min-h-[44px] w-full rounded-xl border-2 border-border bg-surface px-4 text-base text-fg transition-colors hover:border-brand-300 focus:border-brand-500"
          >
            {POLITICA_OPCIONES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {form.politica_intento === 'multiples_intentos' && (
            <div className="mt-3">
              <p className="mb-1 text-sm font-medium text-fg">Intentos permitidos</p>
              <input
                type="number"
                min={2}
                max={10}
                value={form.intentos_permitidos}
                onChange={(e) => onChange({ intentos_permitidos: Math.max(2, Math.min(10, Number(e.target.value))) })}
                className="focus-ring min-h-[44px] w-full rounded-xl border-2 border-border bg-surface px-4 text-base text-fg transition-colors hover:border-brand-300 focus:border-brand-500"
              />
            </div>
          )}
        </div>

        <div className="rounded-xl border-2 border-border bg-surface p-4">
          <p className="text-base font-bold text-fg">Tiempo límite</p>
          <p className="text-sm text-muted">Minutos para completar la evaluación (opcional).</p>
          <div className="mt-3 flex items-center gap-3">
            <input
              type="number"
              min={0}
              max={300}
              value={form.tiempo_limite_minutos || ''}
              onChange={(e) => onChange({ tiempo_limite_minutos: Math.max(0, Number(e.target.value)) })}
              placeholder="0 = sin límite"
              className="focus-ring min-h-[44px] w-full rounded-xl border-2 border-border bg-surface px-4 text-base text-fg transition-colors hover:border-brand-300 focus:border-brand-500"
            />
            <span className="text-base text-muted">min</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepRevisar({
  form,
  materias,
}: {
  form: WizardForm;
  materias: { id: string; nombre: string }[] | undefined;
}) {
  const materiaNombre = materias?.find((m) => m.id === form.materia_id)?.nombre || form.materia_id;

  const tipoLabels: Record<string, string> = {
    opcion_multiple: 'Opción múltiple',
    abierta: 'Abierta',
    verdadero_falso: 'Verdadero / Falso',
    completar: 'Completar',
  };

  const items = useMemo(() => {
    const list: { label: string; value: string }[] = [];
    list.push({ label: 'Materia', value: materiaNombre });
    list.push({ label: 'Nombre de la evaluación', value: form.nombre });
    if (form.descripcion) list.push({ label: 'Descripción', value: form.descripcion });
    list.push({ label: 'Modalidad', value: form.modalidad === 'online' ? 'Online' : form.modalidad === 'fisica' ? 'Física' : 'Mixta' });
    list.push({ label: 'Nota máxima', value: String(form.nota_maxima) });
    list.push({ label: 'Cantidad de preguntas', value: String(form.cantidad_preguntas) });
    list.push({ label: 'Tipos de pregunta', value: form.tipos_pregunta.map((t) => tipoLabels[t] || t).join(', ') });
    const dbaCount = form.dba_ids.length + form.dba_personalizado_ids.length;
    list.push({ label: 'DBA seleccionados', value: `${dbaCount} DBA` });
    if (form.metas.length > 0) list.push({ label: 'Metas del profesor', value: form.metas.join(' — ') });
    if (form.criterios.length > 0) list.push({ label: 'Criterios de evaluación', value: form.criterios.join(' — ') });
    if (form.instrucciones_adicionales) list.push({ label: 'Instrucciones adicionales', value: form.instrucciones_adicionales });
    if (form.politica_intento) {
      list.push({ label: 'Política de intentos', value: form.politica_intento === 'un_intento' ? 'Intento único' : `Múltiples intentos (${form.intentos_permitidos})` });
    }
    if (form.tiempo_limite_minutos > 0) {
      list.push({ label: 'Tiempo límite', value: `${form.tiempo_limite_minutos} minutos` });
    }
    return list;
  }, [form, materiaNombre]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <p className="flex items-center gap-2 text-base font-bold text-emerald-800 dark:text-emerald-200">
          <Sparkles className="h-5 w-5" /> Revisa y confirma
        </p>
        <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-300">
          La IA generará un borrador alineado con los DBA, metas y criterios seleccionados.
          Podrás editarlo antes de publicarlo.
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl border-2 border-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{item.label}</p>
            <p className="mt-1 text-base font-medium text-fg">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/* ── Componente principal ── */
export function GenerationWizard({
  open,
  onClose,
  materias,
  onGenerate,
  aiPending,
}: {
  open: boolean;
  onClose: () => void;
  materias: { id: string; nombre: string }[] | undefined;
  onGenerate: (payload: EvaluacionGenerarRequest) => void;
  aiPending: boolean;
}) {
  const totalSteps = 6;

  // Estado del wizard
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WizardForm>(() => emptyWizardForm());
  const [showRestore, setShowRestore] = useState(false);

  // DBA query
  const { data: dbaItems, isLoading: loadingDBA, isError: dbaError } = useQuery({
    queryKey: ['materia-dba', form.materia_id],
    queryFn: () => listDbaCombinado(form.materia_id),
    enabled: open && !!form.materia_id,
    retry: false,
  });

  // Restaurar progreso guardado
  useEffect(() => {
    if (open) {
      const saved = loadFromLocalStorage();
      if (saved && saved.form.materia_id) {
        setForm(saved.form);
        setStep(saved.step);
        setShowRestore(true);
      } else {
        setForm(emptyWizardForm());
        setStep(1);
        setShowRestore(false);
      }
    }
  }, [open]);

  // Guardar progreso al cambiar de paso
  useEffect(() => {
    if (open && form.materia_id) {
      const materiaNombre = materias?.find((m) => m.id === form.materia_id)?.nombre || '';
      saveToLocalStorage(form, step, materiaNombre);
    }
  }, [open, form, step, materias]);

  function handleFormChange(patch: Partial<WizardForm>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function toggleDBA(item: DBAUnifiedItem) {
    setForm((prev) => ({
      ...prev,
      dba_ids:
        item.fuente === 'oficial'
          ? prev.dba_ids.includes(item.id)
            ? prev.dba_ids.filter((id) => id !== item.id)
            : [...prev.dba_ids, item.id]
          : prev.dba_ids,
      dba_personalizado_ids:
        item.fuente === 'personalizado'
          ? prev.dba_personalizado_ids.includes(item.id)
            ? prev.dba_personalizado_ids.filter((id) => id !== item.id)
            : [...prev.dba_personalizado_ids, item.id]
          : prev.dba_personalizado_ids,
    }));
  }

  function canGoNext(): boolean {
    switch (step) {
      case 1:
        return !!form.materia_id && form.nombre.trim().length >= 2;
      case 2:
        return true; // DBA optional
      case 3:
        return form.cantidad_preguntas >= 3 && form.cantidad_preguntas <= 30;
      case 4:
        return form.tipos_pregunta.length > 0;
      case 5:
        return true; // all optional
      case 6:
        return true;
      default:
        return false;
    }
  }

  function getValidationMessage(): string | null {
    switch (step) {
      case 1:
        if (!form.materia_id) return 'Selecciona una materia para continuar.';
        if (form.nombre.trim().length < 2) return 'Escribe un nombre de al menos 2 caracteres.';
        return null;
      case 3:
        if (form.cantidad_preguntas < 3 || form.cantidad_preguntas > 30) return 'La cantidad debe estar entre 3 y 30.';
        return null;
      case 4:
        if (form.tipos_pregunta.length === 0) return 'Selecciona al menos un tipo de pregunta.';
        return null;
      case 6: {
        const dbaCount = form.dba_ids.length + form.dba_personalizado_ids.length;
        if (dbaCount === 0) return 'No has seleccionado DBA. La IA tendrá menos contexto. ¿Quieres continuar de todas formas?';
        return null;
      }
      default:
        return null;
    }
  }

  function goNext() {
    if (!canGoNext()) return;
    if (step < totalSteps) setStep((s) => s + 1);
  }

  function goBack() {
    if (step > 1) setStep((s) => s - 1);
  }

  function buildPayload(): EvaluacionGenerarRequest | null {
    const dbaCount = form.dba_ids.length + form.dba_personalizado_ids.length;
    if (!form.materia_id) { toast.error('Selecciona una materia'); return null; }
    if (form.nombre.trim().length < 2) { toast.error('Escribe un nombre para la evaluación'); return null; }
    if (dbaCount === 0) {
      toast.error('Selecciona al menos un DBA para generar con IA');
      return null;
    }

    return {
      materia_id: form.materia_id,
      nombre: form.nombre.trim(),
      tema: form.tema.trim() || form.descripcion.trim() || form.nombre.trim(),
      descripcion: form.descripcion.trim() || undefined,
      modalidad: form.modalidad,
      nota_maxima: form.nota_maxima,
      cantidad_preguntas: form.cantidad_preguntas,
      tipos_pregunta: form.tipos_pregunta,
      dba_ids: form.dba_ids,
      dba_personalizado_ids: form.dba_personalizado_ids,
      metas_profesor: form.metas.map((m) => m.trim()).filter(Boolean),
      criterios_docente: form.criterios.map((c) => c.trim()).filter(Boolean),
      instrucciones_adicionales: form.instrucciones_adicionales.trim() || undefined,
      politica_intento: form.politica_intento,
      intentos_permitidos: form.politica_intento === 'multiples_intentos' ? form.intentos_permitidos : undefined,
      tiempo_limite_minutos: form.tiempo_limite_minutos > 0 ? form.tiempo_limite_minutos : undefined,
    };
  }

  function handleGenerate() {
    const payload = buildPayload();
    if (!payload) return;
    clearSavedProgress();
    onGenerate(payload);
  }

  function handleClose() {
    clearSavedProgress();
    onClose();
  }

  const isLastStep = step === totalSteps;
  const validationMsg = getValidationMessage();

  return (
    <Modal open={open} onClose={handleClose} title="" className="max-w-2xl" showCloseButton={false}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-lg font-bold text-fg">Generar con IA</p>
              <p className="text-sm text-muted">Evaluación alineada al currículo</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="focus-ring grid h-10 w-10 place-items-center rounded-xl border-2 border-border bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {/* Progress bar */}
        <PasosGuia currentStep={step} totalSteps={totalSteps} />

        {/* Restore notice */}
        {showRestore && (
          <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" /> Progreso restaurado
            </p>
            <p className="mt-1">Continuamos desde donde lo dejaste.</p>
          </div>
        )}

        {/* Step content with animation */}
        <div className="min-h-[280px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 1 && <StepMateria form={form} materias={materias} onChange={handleFormChange} />}
              {step === 2 && (
                <StepDBA
                  items={dbaItems}
                  loading={loadingDBA}
                  error={dbaError}
                  selectedOfficial={form.dba_ids}
                  selectedCustom={form.dba_personalizado_ids}
                  onToggle={toggleDBA}
                />
              )}
              {step === 3 && (
                <StepCantidad
                  value={form.cantidad_preguntas}
                  onChange={(v) => handleFormChange({ cantidad_preguntas: v })}
                />
              )}
              {step === 4 && (
                <StepTipoPregunta
                  selected={form.tipos_pregunta}
                  onChange={(tipos) => handleFormChange({ tipos_pregunta: tipos })}
                />
              )}
              {step === 5 && <StepDetalles form={form} onChange={handleFormChange} />}
              {step === 6 && <StepRevisar form={form} materias={materias} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Validation message */}
        {validationMsg && step < 6 && (
          <div className="flex items-start gap-2 rounded-xl border-2 border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{validationMsg}</span>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <BotonGrande
            variant="outline"
            icon={<ArrowLeft className="h-5 w-5" />}
            onClick={goBack}
            disabled={step === 1}
            className="sm:w-auto"
          >
            Atrás
          </BotonGrande>

          {isLastStep ? (
            <BotonGrande
              variant="primary"
              icon={<Sparkles className="h-5 w-5" />}
              onClick={handleGenerate}
              loading={aiPending}
              className="sm:w-auto"
            >
              {aiPending ? 'Generando...' : 'Generar evaluación'}
            </BotonGrande>
          ) : (
            <BotonGrande
              variant="primary"
              icon={<ArrowRight className="h-5 w-5" />}
              onClick={goNext}
              disabled={!canGoNext()}
              className="sm:w-auto"
            >
              Siguiente
            </BotonGrande>
          )}
        </div>
      </div>
    </Modal>
  );
}
