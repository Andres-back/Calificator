import { CircleHelp } from 'lucide-react';
import { reviewPriorityPresentation } from '../review-triage/reviewPriorityPresentation';

/** Optional general help; specific review warnings stay with their answer. */
export function ReviewHelp() {
  return <details className="min-w-0 rounded-xl border border-border px-3 text-sm [overflow-wrap:anywhere]">
    <summary className="focus-ring flex min-h-11 cursor-pointer items-center gap-2 py-2 font-semibold text-muted"><CircleHelp aria-hidden="true" className="h-4 w-4 shrink-0" />¿Cómo funciona esta revisión?</summary>
    <div className="space-y-3 border-t border-border py-3 text-xs leading-6 text-muted">
      <p>La IA propone una nota sugerida. Tú decides la nota final; confirmar, ajustar o publicar siguen siendo acciones diferentes.</p>
      <div aria-label="Colores de prioridad de revisión" className="space-y-2">
        <p>Los colores indican qué conviene comprobar: no garantizan que la respuesta o la calificación sean correctas.</p>
        <div className="flex flex-wrap gap-2">{Object.entries(reviewPriorityPresentation).map(([level, { label, Icon, classes }]) => <span key={level} className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 ${classes}`}><Icon aria-hidden="true" className="h-4 w-4 shrink-0" />{label}</span>)}</div>
      </div>
      <p>Historial conserva el material consultado, las valoraciones y el proceso de cada pregunta. Los avisos concretos que necesitan tu decisión permanecen junto a la respuesta.</p>
      <p>La vista cercana por pregunta corresponde a la foto preparada. Puedes abrir la hoja completa y consultar la foto original cuando esté disponible.</p>
    </div>
  </details>;
}
