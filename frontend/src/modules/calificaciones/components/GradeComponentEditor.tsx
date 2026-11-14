import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { CheckCircle2, CircleDashed, CircleSlash, Sparkles, XCircle, type LucideIcon } from 'lucide-react';
import { Button, Field, Input, Textarea } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { GradeComponentData, GradeComponentChange, GradeFormulaData } from '@/types/api';
import { formatScoreInput } from './gradeCalculationPresentation';

export type ReviewedState = 'correcta' | 'parcial' | 'incorrecta' | 'sin_respuesta';
const REVIEWED_STATES: ReviewedState[] = ['correcta', 'parcial', 'incorrecta', 'sin_respuesta'];

/** Spec 186: el estado se elige con botones grandes, con color e icono. */
const STATE_OPTIONS: Record<ReviewedState, { label: string; icon: LucideIcon; selected: string }> = {
  correcta: { label: 'Correcta', icon: CheckCircle2, selected: 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-100' },
  parcial: { label: 'Parcial', icon: CircleDashed, selected: 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-500/15 dark:text-amber-100' },
  incorrecta: { label: 'Incorrecta', icon: XCircle, selected: 'border-rose-500 bg-rose-50 text-rose-900 dark:bg-rose-500/15 dark:text-rose-100' },
  sin_respuesta: { label: 'Sin respuesta', icon: CircleSlash, selected: 'border-slate-500 bg-slate-100 text-slate-900 dark:bg-slate-500/20 dark:text-slate-100' },
};

/** Spec 181: motivo interno que se propone según el estado elegido. */
const DEFAULT_REASONS: Record<ReviewedState, string> = {
  correcta: 'Se determinó que la respuesta es correcta.',
  parcial: 'Se determinó que la respuesta es parcialmente correcta.',
  incorrecta: 'Se determinó que la respuesta es incorrecta.',
  sin_respuesta: 'Se determinó que no hay respuesta.',
};
const ADJUSTED_REASON = 'Se ajustó el puntaje tras revisar la evidencia.';

function isReviewed(state: string): state is ReviewedState {
  return (REVIEWED_STATES as string[]).includes(state);
}

/** Puntos de una respuesta parcial: la mitad, con dos decimales como máximo. */
function halfPoints(max: number) {
  return formatScoreInput(Math.round((max / 2) * 100) / 100);
}

export function GradeComponentEditor({ component, formula, saving, saveError, nextQuestionAction, onCancel, onSave, onSaveAndNext, onSaveAndNextQuestion, onReload, onDirtyChange, onDraftExplanation }: {
  component: GradeComponentData;
  formula: GradeFormulaData;
  saving?: boolean;
  saveError?: string;
  /** Spec 186: texto de la acción principal hacia lo que sigue («Guardar e ir a la pregunta 2»); sin él, pasa al siguiente alumno. */
  nextQuestionAction?: string;
  onCancel: () => void;
  onSave: (change: GradeComponentChange) => void;
  onSaveAndNext?: (change: GradeComponentChange) => void;
  onSaveAndNextQuestion?: (change: GradeComponentChange) => void;
  onReload?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  /** La IA redacta la explicación para el estado y los puntos elegidos; no guarda nada. */
  onDraftExplanation?: (input: { estado: ReviewedState; puntos_obtenidos: number }) => Promise<string>;
}) {
  const [points, setPoints] = useState(formatScoreInput(component.puntos_obtenidos));
  const [state, setState] = useState(component.estado);
  const [reason, setReason] = useState('');
  const [reasonTyped, setReasonTyped] = useState(false);
  const [studentExplanation, setStudentExplanation] = useState(component.explicacion ?? '');
  const [explanationTyped, setExplanationTyped] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState('');
  const draftRequest = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const stateRefs = useRef<Partial<Record<ReviewedState, HTMLButtonElement | null>>>({});

  useEffect(() => {
    setPoints(formatScoreInput(component.puntos_obtenidos));
    setState(component.estado);
    setReason('');
    setReasonTyped(false);
    setStudentExplanation(component.explicacion ?? '');
    setExplanationTyped(false);
    setDrafting(false);
    setDraftError('');
    draftRequest.current += 1;
  }, [component]);

  // Spec 186: al abrir, el editor queda a la vista y el foco en la primera decisión.
  useEffect(() => {
    rootRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
    const first = isReviewed(component.estado) ? component.estado : 'correcta';
    stateRefs.current[first]?.focus({ preventScroll: true });
  }, [component.id, component.estado]);

  const numeric = Number(points);
  const maxPoints = Number(component.puntos_maximos);
  const originalPoints = Number(component.puntos_obtenidos ?? 0);
  const pointsChanged = formatScoreInput(points) !== formatScoreInput(component.puntos_obtenidos);
  const stateChanged = state !== component.estado;
  const dirty = pointsChanged
    || stateChanged
    || (reasonTyped && reason.trim().length > 0)
    || studentExplanation !== (component.explicacion ?? '');

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  const possible = Number(formula.puntos_posibles);
  const maxGrade = Number(formula.nota_maxima);
  const adjustment = Number(formula.ajuste_global);
  const gradeFor = (earned: number) => {
    const raw = possible > 0 ? (earned / possible) * maxGrade + adjustment : 0;
    return Math.min(maxGrade, Math.max(0, raw));
  };
  const previewPoints = Number(formula.puntos_obtenidos) - originalPoints
    + (Number.isFinite(numeric) ? numeric : originalPoints);
  const currentGrade = gradeFor(Number(formula.puntos_obtenidos));
  const previewGrade = gradeFor(previewPoints);
  const gradeDelta = Number((previewGrade - currentGrade).toFixed(formula.decimales));
  const pointsValid = points.trim() !== '' && Number.isFinite(numeric)
    && numeric >= 0
    && numeric <= maxPoints;
  // Spec 186: una respuesta parcial no puede tener cero ni el puntaje completo.
  const partialMismatch = state === 'parcial' && pointsValid && (numeric <= 0 || numeric >= maxPoints);
  const valid = pointsValid
    && isReviewed(state)
    && !partialMismatch
    && studentExplanation.trim().length >= 3
    && !drafting;
  // El historial siempre recibe un motivo: el escrito o el propuesto por el estado.
  const effectiveReason = reason.trim()
    || (isReviewed(state) && (stateChanged || !pointsChanged) ? DEFAULT_REASONS[state] : ADJUSTED_REASON);
  const change = (): GradeComponentChange => ({
    componente_id: component.id,
    puntos_obtenidos: numeric,
    estado: state,
    motivo_interno: effectiveReason,
    explicacion_estudiante: studentExplanation.trim(),
  });

  const requestDraft = async (nextState: string, nextPoints: string) => {
    if (!onDraftExplanation || !isReviewed(nextState)) return;
    const value = Number(nextPoints);
    if (nextPoints.trim() === '' || !Number.isFinite(value)) return;
    const request = ++draftRequest.current;
    setDrafting(true);
    setDraftError('');
    try {
      const text = await onDraftExplanation({ estado: nextState, puntos_obtenidos: value });
      if (request !== draftRequest.current) return;
      setStudentExplanation(text);
      setExplanationTyped(false);
    } catch {
      if (request !== draftRequest.current) return;
      setDraftError('No pudimos redactar la explicación esta vez. Escríbela tú o vuelve a intentarlo.');
    } finally {
      if (request === draftRequest.current) setDrafting(false);
    }
  };

  const changeState = (next: ReviewedState) => {
    if (next === state) return;
    let nextPoints = points;
    if (next === 'correcta') nextPoints = formatScoreInput(component.puntos_maximos);
    if (next === 'incorrecta' || next === 'sin_respuesta') nextPoints = '0';
    if (next === 'parcial' && (!Number.isFinite(numeric) || numeric <= 0 || numeric >= maxPoints)) nextPoints = halfPoints(maxPoints);
    setState(next);
    setPoints(nextPoints);
    if (!reasonTyped) setReason(DEFAULT_REASONS[next]);
    if (!explanationTyped) void requestDraft(next, nextPoints);
  };

  // Flechas entre las opciones, como un grupo de radio nativo.
  const moveState = (event: KeyboardEvent<HTMLButtonElement>, current: ReviewedState) => {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = REVIEWED_STATES[(REVIEWED_STATES.indexOf(current) + step + REVIEWED_STATES.length) % REVIEWED_STATES.length];
    changeState(next);
    stateRefs.current[next]?.focus();
  };

  const title = component.tipo === 'pregunta' ? `pregunta ${component.numero ?? component.orden + 1}` : component.titulo;
  const primaryNext = nextQuestionAction && onSaveAndNextQuestion
    ? { label: nextQuestionAction, run: onSaveAndNextQuestion }
    : onSaveAndNext ? { label: 'Guardar y siguiente alumno', run: onSaveAndNext } : null;

  return (
    <div ref={rootRef} data-testid="grade-component-editor" className="scroll-mt-4 space-y-5 rounded-2xl border border-brand-200 bg-brand-50/40 p-4 shadow-sm dark:border-brand-500/30 dark:bg-brand-500/10 sm:p-5">
      <p className="text-lg font-bold">Editar {title}</p>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-fg">1. ¿Cómo quedó la respuesta?</legend>
        <div role="radiogroup" aria-label="Estado" className="grid grid-cols-2 gap-2">
          {REVIEWED_STATES.map((option) => {
            const { label, icon: Icon, selected } = STATE_OPTIONS[option];
            const checked = state === option;
            return (
              <button
                key={option}
                ref={(node) => { stateRefs.current[option] = node; }}
                type="button"
                role="radio"
                aria-checked={checked}
                tabIndex={checked || (!isReviewed(state) && option === 'correcta') ? 0 : -1}
                onClick={() => changeState(option)}
                onKeyDown={(event) => moveState(event, option)}
                className={cn(
                  'focus-ring flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 px-3 text-sm font-semibold transition-colors',
                  checked ? selected : 'border-border bg-surface text-fg hover:border-brand-300',
                )}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />{label}
              </button>
            );
          })}
        </div>
        {!isReviewed(state) && <p className="text-sm text-muted">Elige una opción después de mirar la hoja.</p>}
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,12rem)_1fr] sm:items-end">
        <Field label={`2. Puntos (máximo ${formatScoreInput(component.puntos_maximos)})`} required>
          <Input type="number" inputMode="decimal" min={0} max={maxPoints} step="any" value={points} onChange={(event) => setPoints(event.target.value)} />
        </Field>
        <div data-testid="grade-preview" className="rounded-xl border border-brand-200 bg-surface px-3 py-2 text-sm dark:border-brand-500/30">
          <p>
            <span className="font-semibold">Nota del estudiante:</span>{' '}
            {currentGrade.toFixed(formula.decimales)} → <strong className={cn(gradeDelta > 0 && 'text-emerald-700 dark:text-emerald-300', gradeDelta < 0 && 'text-rose-700 dark:text-rose-300')}>{previewGrade.toFixed(formula.decimales)}</strong> de {maxGrade.toFixed(formula.decimales)}
          </p>
          <p className="text-xs text-muted">{previewPoints.toFixed(2)} de {possible.toFixed(2)} puntos. Al guardar, el cambio queda en el historial.</p>
        </div>
      </div>
      {partialMismatch && <p role="alert" className="-mt-2 text-sm font-semibold text-amber-800 dark:text-amber-200">Una respuesta parcial debe tener más de 0 y menos de {formatScoreInput(component.puntos_maximos)} puntos.</p>}
      {pointsValid || points.trim() === '' ? null : <p role="alert" className="-mt-2 text-sm font-semibold text-rose-700 dark:text-rose-300">Escribe un puntaje entre 0 y {formatScoreInput(component.puntos_maximos)}.</p>}

      <div className="space-y-2">
        <Field label="3. Explicación para el estudiante" hint={onDraftExplanation ? 'La IA la redacta al elegir el estado. Revísala y cámbiala si hace falta.' : undefined} required>
          <Textarea
            value={studentExplanation}
            onChange={(event) => { setStudentExplanation(event.target.value); setExplanationTyped(true); }}
            rows={4}
            disabled={drafting}
            aria-busy={drafting}
          />
        </Field>
        {onDraftExplanation && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 flex-1 basis-48 text-sm text-muted" aria-live="polite">
              {drafting ? 'Redactando la explicación…' : draftError}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="whitespace-nowrap"
              onClick={() => void requestDraft(state, points)}
              disabled={drafting || saving || !isReviewed(state) || !pointsValid}
              loading={drafting}
              loadingLabel="Redactando…"
              icon={<Sparkles className="h-4 w-4" />}
            >
              {studentExplanation.trim() ? 'Redactar de nuevo con IA' : 'Redactar con IA'}
            </Button>
          </div>
        )}
      </div>

      <Field label="Motivo interno del cambio (opcional)" hint="Solo lo ve el docente, en el historial. Si lo dejas vacío, se guarda según el estado elegido.">
        <Textarea
          value={reason}
          placeholder={effectiveReason}
          onChange={(event) => { setReason(event.target.value); setReasonTyped(true); }}
          rows={2}
        />
      </Field>

      {saveError && (
        <div role="alert" className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
          <span>{saveError} Tu borrador sigue aquí.</span>
          {onReload && (
            <Button type="button" variant="outline" onClick={onReload} disabled={saving}>
              Recargar versión vigente
            </Button>
          )}
        </div>
      )}

      {/* Spec 186: las acciones quedan a la vista al bajar por el editor; tres opciones, la principal a la derecha. */}
      <div data-testid="grade-editor-actions" className="sticky bottom-0 -mx-4 -mb-4 flex flex-wrap items-center gap-2 rounded-b-2xl border-t border-brand-200 bg-surface/95 px-4 py-3 backdrop-blur dark:border-brand-500/30 sm:-mx-5 sm:-mb-5 sm:px-5">
        <Button type="button" variant="ghost" className="whitespace-nowrap" onClick={onCancel} disabled={saving}>Cancelar</Button>
        <Button type="button" variant="outline" className="ml-auto whitespace-nowrap" onClick={() => valid && onSave(change())} disabled={!valid || saving} loading={saving && !primaryNext}>Guardar</Button>
        {primaryNext && (
          <Button type="button" className="h-auto min-h-11 flex-1 basis-56 py-2" onClick={() => valid && primaryNext.run(change())} disabled={!valid || saving} loading={saving}>
            {primaryNext.label}
          </Button>
        )}
        {onSaveAndNext && primaryNext?.run === onSaveAndNext && <p className="w-full text-right text-xs text-muted">Guarda este ajuste y avanza; no confirma ni publica la nota.</p>}
      </div>
    </div>
  );
}
