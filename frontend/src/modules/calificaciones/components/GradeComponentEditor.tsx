import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button, Field, Input, Select, Textarea } from '@/components/ui';
import type { GradeComponentData, GradeComponentChange, GradeFormulaData } from '@/types/api';
import { formatScoreInput } from './gradeCalculationPresentation';

export type ReviewedState = 'correcta' | 'parcial' | 'incorrecta' | 'sin_respuesta';
const REVIEWED_STATES: ReviewedState[] = ['correcta', 'parcial', 'incorrecta', 'sin_respuesta'];

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

export function GradeComponentEditor({ component, formula, saving, saveError, onCancel, onSave, onSaveAndNext, onSaveAndNextQuestion, onReload, onDirtyChange, onDraftExplanation }: {
  component: GradeComponentData;
  formula: GradeFormulaData;
  saving?: boolean;
  saveError?: string;
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

  const numeric = Number(points);
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
  const previewPoints = Number(formula.puntos_obtenidos) - originalPoints
    + (Number.isFinite(numeric) ? numeric : originalPoints);
  const previewRaw = possible > 0 ? (previewPoints / possible) * maxGrade + adjustment : 0;
  const previewGrade = Math.min(maxGrade, Math.max(0, previewRaw));
  const pointsValid = points.trim() !== '' && Number.isFinite(numeric)
    && numeric >= 0
    && numeric <= Number(component.puntos_maximos);
  const valid = pointsValid
    && isReviewed(state)
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

  const changeState = (next: string) => {
    let nextPoints = points;
    if (next === 'correcta') nextPoints = formatScoreInput(component.puntos_maximos);
    if (next === 'incorrecta' || next === 'sin_respuesta') nextPoints = '0';
    setState(next);
    setPoints(nextPoints);
    if (!reasonTyped && isReviewed(next)) setReason(DEFAULT_REASONS[next]);
    if (!explanationTyped) void requestDraft(next, nextPoints);
  };

  return (
    <div className="space-y-4 rounded-xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
      <p className="font-bold">Editar {component.tipo === 'pregunta' ? `pregunta ${component.numero ?? component.orden + 1}` : component.titulo}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`Puntos (máximo ${formatScoreInput(component.puntos_maximos)})`} required>
          <Input type="number" inputMode="decimal" min={0} max={Number(component.puntos_maximos)} step="any" value={points} onChange={(event) => setPoints(event.target.value)} />
        </Field>
        <Field label="Estado" required>
          <Select value={state} onChange={(event) => changeState(event.target.value)}>
            {!isReviewed(state) && <option value={state}>Selecciona un estado tras revisar</option>}
            <option value="correcta">Correcta</option>
            <option value="parcial">Parcial</option>
            <option value="incorrecta">Incorrecta</option>
            <option value="sin_respuesta">Sin respuesta</option>
          </Select>
        </Field>
      </div>
      <div className="rounded-lg border border-brand-200 bg-surface px-3 py-2 text-sm dark:border-brand-500/30">
        <span className="font-semibold">Vista previa:</span> {previewPoints.toFixed(2)} / {possible.toFixed(2)} puntos → <strong>{previewGrade.toFixed(formula.decimales)}</strong> / {maxGrade.toFixed(formula.decimales)}.
        <span className="ml-1 text-muted">Al guardar se actualiza la nota y el cambio queda en el historial.</span>
      </div>
      <Field label="Explicación para el estudiante" hint={onDraftExplanation ? 'La IA la redacta al elegir el estado. Revísala y cámbiala si hace falta.' : undefined} required>
        <Textarea
          value={studentExplanation}
          onChange={(event) => { setStudentExplanation(event.target.value); setExplanationTyped(true); }}
          rows={4}
          disabled={drafting}
          aria-busy={drafting}
        />
      </Field>
      {onDraftExplanation && (
        <div className="-mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted" aria-live="polite">
            {drafting ? 'Redactando la explicación…' : draftError}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => void requestDraft(state, points)}
            disabled={drafting || saving || !isReviewed(state) || !pointsValid}
            loading={drafting}
            icon={<Sparkles className="h-4 w-4" />}
            loadingLabel="Redactando…"
          >
            {studentExplanation.trim() ? 'Volver a redactar con IA' : 'Redactar con IA'}
          </Button>
        </div>
      )}
      <Field label="Motivo interno del cambio (opcional)" hint="Queda en el historial docente y no se muestra al estudiante. Si lo dejas vacío, se guarda según el estado elegido.">
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
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" className="whitespace-nowrap" onClick={onCancel} disabled={saving}>Cancelar</Button>
        <Button type="button" variant="outline" onClick={() => valid && onSave(change())} disabled={!valid || saving} loading={saving}>Guardar y recalcular</Button>
        {onSaveAndNextQuestion && <Button type="button" variant="outline" onClick={() => valid && onSaveAndNextQuestion(change())} disabled={!valid || saving}>Guardar y siguiente pregunta</Button>}
        {onSaveAndNext && (
          <Button type="button" onClick={() => valid && onSaveAndNext(change())} disabled={!valid || saving} loading={saving}>
            Guardar y siguiente alumno
          </Button>
        )}
      </div>
      {onSaveAndNext && <p className="text-right text-xs text-muted">Guarda este ajuste y avanza; no confirma ni publica la nota.</p>}
    </div>
  );
}
