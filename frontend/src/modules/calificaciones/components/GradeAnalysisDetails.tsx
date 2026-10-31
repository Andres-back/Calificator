import { useId } from 'react';
import type { GradeBreakdownData } from '@/types/api';

/** Read-only presentation of the recorded teacher DTO, mounted in History only.
 * Identity comes from component IDs/keys, never an assumed unique print number. */
export function GradeAnalysisDetails({ breakdown }: { breakdown: GradeBreakdownData }) {
  const titleId = useId();
  return <section aria-labelledby={titleId} className="min-w-0 space-y-3 [overflow-wrap:anywhere]">
    <h3 id={titleId} className="text-sm font-bold">Detalle del análisis por pregunta</h3>
    {breakdown.componentes.length ? breakdown.componentes.map(component => {
      const label = component.tipo === 'pregunta' ? `Pregunta ${component.numero ?? component.orden + 1}` : component.tipo === 'rubrica' ? 'Criterio de rúbrica' : 'Valoración docente';
      const summary = `${label} · ${component.titulo}`;
      return <details key={component.id} data-analysis-component-id={component.id} data-analysis-component-key={component.clave}
        aria-label={summary} className="min-w-0 rounded-xl border border-border bg-surface px-3">
        <summary className="focus-ring min-h-11 cursor-pointer content-center py-3 text-sm font-semibold">{summary}</summary>
        <div className="space-y-3 border-t border-border py-3 text-sm leading-6">
          <p className="text-xs text-muted">Proceso: evidencia extraída → valoración {component.origen === 'objetivo' ? 'objetiva' : component.origen === 'docente' ? 'docente' : 'asistida por IA'} → {component.valoraciones && component.valoraciones.length > 1 ? 'comparación registrada' : 'comprobación disponible'}.</p>
          <div className="space-y-2">
            <h4 className="font-semibold">Valoraciones registradas</h4>
            {component.valoraciones?.length ? component.valoraciones.map((valuation, index) => <p key={index} className="rounded-lg bg-surface-2 p-3 whitespace-pre-wrap">Valoración {String(valuation.evaluador ?? index + 1)}: {String(valuation.puntaje ?? '—')} puntos.{valuation.explicacion != null && String(valuation.explicacion) ? ` ${String(valuation.explicacion)}` : ''}</p>) : <p className="text-xs text-muted">No se registraron valoraciones individuales.</p>}
          </div>
          <div className="space-y-2">
            {component.fuentes?.length ? <>
              <h4 className="font-semibold">Material de apoyo consultado ({component.fuentes.length})</h4>
              {component.fuentes.map((source, index) => <div key={`${source.source_id ?? 'fuente'}-${source.chunk_id ?? index}`} className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="font-semibold">{source.titulo || 'Fuente autorizada'}</p>
                <p className="text-xs text-muted">Versión: {source.version || 'sin versión registrada'}</p>
                {source.fragmento ? <p className="mt-1 whitespace-pre-wrap">{source.fragmento}</p> : null}
              </div>)}
            </> : <p className="text-xs text-muted">No se registró material de apoyo para esta respuesta.</p>}
          </div>
        </div>
      </details>;
    }) : <p className="text-sm text-muted">No hay detalles por pregunta registrados.</p>}
  </section>;
}
