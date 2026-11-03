import { ArrowLeft, ArrowRight, ClipboardList, History, Image, MessageSquareText } from 'lucide-react';
import type { Ref } from 'react';

export type ReviewSection = 'resumen' | 'revision' | 'evidencia' | 'retroalimentacion' | 'historial' | 'reclamos';

const sections = [
  { id: 'revision', label: 'Respuestas y puntajes', description: 'Revisa qué respondió y cuánto obtuvo.', panel: 'grade-review-panel', icon: ClipboardList, color: 'bg-brand-500/10 text-brand-700 dark:text-brand-200' },
  { id: 'evidencia', label: 'Evidencia', description: 'Consulta las hojas y archivos de la entrega.', panel: 'grade-evidence-panel', icon: Image, color: 'bg-sky-500/10 text-sky-700 dark:text-sky-200' },
  { id: 'retroalimentacion', label: 'Retroalimentación', description: 'Lee, edita o comparte las recomendaciones.', panel: 'grade-feedback-panel', icon: MessageSquareText, color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200' },
  { id: 'historial', label: 'Historial', description: 'Consulta los cambios y revisiones anteriores.', panel: 'grade-history-panel', icon: History, color: 'bg-violet-500/10 text-violet-700 dark:text-violet-200' },
] as const;

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
    {sections.map(({ id, label, description, panel, icon: Icon, color }) => <button key={id} type="button"
      aria-label={label} aria-controls={panel} aria-expanded={false} data-review-option={id}
      onClick={() => onChange(id)}
      className="focus-ring flex min-h-28 min-w-0 flex-col items-start gap-2 rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:border-brand-400 hover:bg-surface-2 sm:p-4">
      <span className="flex w-full items-center justify-between gap-2">
        <span className={`rounded-lg p-2 ${color}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
      </span>
      <span className="font-bold leading-snug text-fg">{label}</span>
      <span className="text-sm leading-snug text-muted">{description}</span>
    </button>)}
    </div>
  </nav>;
}
