import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, EyeOff, FileSearch } from 'lucide-react';
import { Badge } from '@/components/ui';
import type { GradeBreakdownData } from '@/types/api';
import { GradeFormula } from './GradeFormula';

const stateLabel: Record<string, string> = {
  correcta: 'Correcta', parcial: 'Parcial', incorrecta: 'Incorrecta',
  sin_respuesta: 'Sin respuesta', ilegible: 'Ilegible', no_evaluable: 'No evaluable',
  revision_pendiente: 'Revisión pendiente',
};

export function GradeBreakdown({ breakdown, student = false, onEdit, editingComponentId, renderEditor }: {
  breakdown: GradeBreakdownData;
  student?: boolean;
  onEdit?: (componentId: string) => void;
  editingComponentId?: string | null;
  renderEditor?: (component: GradeBreakdownData['componentes'][number]) => ReactNode;
}) {
  return (
    <section aria-labelledby="grade-breakdown-title" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="grade-breakdown-title" className="text-lg font-extrabold text-fg">Nota explicada respuesta por respuesta</h2>
          <p className="text-sm text-muted">Cada puntaje muestra la evidencia y la razón que lo respalda.</p>
        </div>
        <Badge tone={breakdown.requiere_revision ? 'warning' : 'success'}>
          {breakdown.requiere_revision ? 'Requiere revisión' : 'Desglose completo'}
        </Badge>
      </div>
      <GradeFormula formula={breakdown.formula} adjustmentDetail={breakdown.ajuste_global_detalle} />
      <div className="space-y-3">
        {breakdown.componentes.map((component) => (
          <article key={component.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700 dark:text-brand-200">
                  {component.tipo === 'pregunta' ? `Pregunta ${component.numero ?? component.orden + 1}` : component.tipo === 'rubrica' ? 'Criterio de rúbrica' : 'Valoración docente'}
                </p>
                <h3 className="mt-1 font-bold leading-6 text-fg">{component.titulo}</h3>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={component.requiere_revision ? 'warning' : component.estado === 'correcta' ? 'success' : 'neutral'}>
                  {stateLabel[component.estado] ?? component.estado}
                </Badge>
                <strong className="whitespace-nowrap text-base">{component.puntos_obtenidos == null ? '—' : Number(component.puntos_obtenidos).toFixed(2)} / {Number(component.puntos_maximos).toFixed(2)}</strong>
              </div>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg bg-surface-2 p-3">
                <p className="text-xs font-semibold text-muted">Respuesta del estudiante</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-fg">{component.respuesta_estudiante || 'No se detectó una respuesta.'}</p>
              </div>
              <div className="rounded-lg bg-surface-2 p-3">
                <p className="flex items-center gap-1 text-xs font-semibold text-muted">
                  {component.referencia_oculta ? <EyeOff className="h-3.5 w-3.5" /> : <FileSearch className="h-3.5 w-3.5" />}
                  Respuesta de referencia
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-fg">
                  {component.referencia_oculta ? 'Se mostrará cuando el docente libere las respuestas.' : component.respuesta_referencia || 'No aplica o no fue configurada.'}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-border p-3 text-sm leading-6">
              {component.requiere_revision ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />}
              <p><strong>Por qué:</strong> {component.explicacion || 'No hay una explicación verificable; debe revisarla el docente.'}</p>
            </div>
            {component.evidencia_paginas.length > 0 && (
              <p className="mt-2 text-xs text-muted">Evidencia: {component.evidencia_paginas.map((page) => `hoja ${page}`).join(', ')}.</p>
            )}
            {onEdit && editingComponentId !== component.id && (
              <button type="button" onClick={() => onEdit(component.id)} className="focus-ring mt-3 min-h-11 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-200 dark:hover:bg-brand-500/10">
                Ajustar puntaje y explicación
              </button>
            )}
            {editingComponentId === component.id && renderEditor ? (
              <div className="mt-4" data-testid={`grade-editor-${component.id}`}>
                {renderEditor(component)}
              </div>
            ) : null}
            {!student && component.valoraciones && component.valoraciones.length > 1 && (
              <details className="mt-3 text-xs text-muted">
                <summary className="cursor-pointer font-semibold">Ver valoraciones independientes ({component.valoraciones.length})</summary>
                <div className="mt-2 space-y-2">
                  {component.valoraciones.map((valuation, index) => (
                    <p key={index} className="rounded-lg bg-surface-2 p-2">Evaluador {String(valuation.evaluador ?? index + 1)}: {String(valuation.puntaje ?? '—')} puntos. {String(valuation.explicacion ?? '')}</p>
                  ))}
                </div>
              </details>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
