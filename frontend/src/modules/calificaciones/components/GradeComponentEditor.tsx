import { useEffect, useState } from 'react';
import { Button, Field, Input, Select, Textarea } from '@/components/ui';
import type { GradeComponentData, GradeComponentChange, GradeFormulaData } from '@/types/api';

export function GradeComponentEditor({ component, formula, saving, saveError, onCancel, onSave, onSaveAndNext, onSaveAndNextQuestion, onReload, onDirtyChange }: {
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
}) {
  const [points, setPoints] = useState(String(component.puntos_obtenidos ?? ''));
  const [state, setState] = useState(component.estado);
  const [reason, setReason] = useState('');
  const [studentExplanation, setStudentExplanation] = useState(component.explicacion ?? '');

  useEffect(() => {
    setPoints(String(component.puntos_obtenidos ?? ''));
    setState(component.estado);
    setReason('');
    setStudentExplanation(component.explicacion ?? '');
  }, [component]);

  const numeric = Number(points);
  const originalPoints = Number(component.puntos_obtenidos ?? 0);
  const dirty = points !== String(component.puntos_obtenidos ?? '')
    || state !== component.estado
    || reason.trim().length > 0
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
  const valid = points.trim() !== '' && Number.isFinite(numeric)
    && ['correcta', 'parcial', 'incorrecta', 'sin_respuesta'].includes(state)
    && numeric >= 0
    && numeric <= Number(component.puntos_maximos)
    && reason.trim().length >= 3
    && studentExplanation.trim().length >= 3;
  const change = (): GradeComponentChange => ({
    componente_id: component.id,
    puntos_obtenidos: numeric,
    estado: state,
    motivo_interno: reason.trim(),
    explicacion_estudiante: studentExplanation.trim(),
  });

  return (
    <div className="space-y-4 rounded-xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
      <p className="font-bold">Editar {component.tipo === 'pregunta' ? `pregunta ${component.numero ?? component.orden + 1}` : component.titulo}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`Puntos (máximo ${Number(component.puntos_maximos).toFixed(2)})`} required>
          <Input type="number" min={0} max={Number(component.puntos_maximos)} step="0.01" value={points} onChange={(event) => setPoints(event.target.value)} />
        </Field>
        <Field label="Estado" required>
          <Select value={state} onChange={(event) => setState(event.target.value)}>
            {!['correcta', 'parcial', 'incorrecta', 'sin_respuesta'].includes(state) && <option value={state}>Selecciona un estado tras revisar</option>}
            <option value="correcta">Correcta</option>
            <option value="parcial">Parcial</option>
            <option value="incorrecta">Incorrecta</option>
            <option value="sin_respuesta">Sin respuesta</option>
          </Select>
        </Field>
      </div>
      <div className="rounded-lg border border-brand-200 bg-surface px-3 py-2 text-sm dark:border-brand-500/30">
        <span className="font-semibold">Vista previa:</span> {previewPoints.toFixed(2)} / {possible.toFixed(2)} puntos → <strong>{previewGrade.toFixed(formula.decimales)}</strong> / {maxGrade.toFixed(formula.decimales)}.
        <span className="ml-1 text-muted">La nota oficial se recalcula y versiona al guardar.</span>
      </div>
      <Field label="Motivo interno del cambio" hint="Queda en el historial docente y no se muestra al estudiante." required>
        <Textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={2} />
      </Field>
      <Field label="Explicación para el estudiante" required>
        <Textarea value={studentExplanation} onChange={(event) => setStudentExplanation(event.target.value)} rows={3} />
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
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>Cancelar</Button>
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
