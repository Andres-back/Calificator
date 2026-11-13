import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Ref } from 'react';
import { EducationalIcon, type EducationalIconName } from '@/components/ui';

export type ReviewSection = 'resumen' | 'revision' | 'evidencia' | 'retroalimentacion' | 'historial' | 'reclamos';

const sections = [
  { id: 'revision', label: 'Respuestas y puntajes', description: 'Revisa qué respondió y cuánto obtuvo.', panel: 'grade-review-panel', icon: 'review-answers' },
  { id: 'evidencia', label: 'Evidencia', description: 'Consulta las hojas y archivos de la entrega.', panel: 'grade-evidence-panel', icon: 'grade-evidence' },
  { id: 'retroalimentacion', label: 'Retroalimentación', description: 'Lee, edita o comparte las recomendaciones.', panel: 'grade-feedback-panel', icon: 'review-feedback' },
  { id: 'historial', label: 'Historial', description: 'Consulta los cambios y revisiones anteriores.', panel: 'grade-history-panel', icon: 'review-history' },
] as const satisfies ReadonlyArray<{ id: string; label: string; description: string; panel: string; icon: EducationalIconName }>;

export function ReviewNavigation({ active, onChange, headingRef }: {
  active: ReviewSection; onChange: (section: ReviewSection) => void;
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  const selected = sections.find(section => section.id === active);
  if (active !== 'resumen') return <header className="space-y-2 border-b border-border pb-3">
    <button type="button" onClick={() => onChange('resumen')} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-fg">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a opciones
    </button>
    <h2 ref={headingRef} tabIndex={-1} className="text-xl font-bold leading-tight text-fg sm:text-2xl">{active === 'revision' ? 'Revisión por pregunta' : selected?.label ?? 'Reclamos'}</h2>
  </header>;
  return <nav aria-label="Secciones de la calificación" className="space-y-3">
    <h2 ref={headingRef} tabIndex={-1} className="text-lg font-bold text-fg">¿Qué quieres revisar?</h2>
    <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
    {sections.map(({ id, label, description, panel, icon }) => <button key={id} type="button"
      aria-label={label} aria-controls={panel} aria-expanded={false} data-review-option={id}
      onClick={() => onChange(id)}
      className="focus-ring flex min-h-28 min-w-0 flex-col items-start gap-2 rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:border-brand-400 hover:bg-surface-2 sm:p-4">
      <span className="flex w-full items-center justify-between gap-2">
        <EducationalIcon name={icon} className="h-11 w-11 sm:h-12 sm:w-12" />
        <ArrowRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
      </span>
      <span className="font-bold leading-snug text-fg">{label}</span>
      <span className="text-sm leading-snug text-muted">{description}</span>
    </button>)}
    </div>
  </nav>;
}
