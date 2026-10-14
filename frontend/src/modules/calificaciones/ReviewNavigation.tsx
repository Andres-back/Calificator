import { cn } from '@/lib/cn';

export type ReviewSection = 'resumen' | 'revision' | 'evidencia' | 'retroalimentacion' | 'historial' | 'reclamos';

const sections = [
  { id: 'revision', label: 'Respuestas y puntajes', panel: 'grade-review-panel' },
  { id: 'evidencia', label: 'Evidencia', panel: 'grade-evidence-panel' },
  { id: 'retroalimentacion', label: 'Retroalimentación', panel: 'grade-feedback-panel' },
  { id: 'historial', label: 'Historial', panel: 'grade-history-panel' },
] as const;

export function ReviewNavigation({ active, onChange }: { active: ReviewSection; onChange: (section: ReviewSection) => void }) {
  return <nav aria-label="Secciones de la calificación" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
    {sections.map(({ id, label, panel }) => <button key={id} type="button"
      aria-controls={panel} aria-expanded={active === id}
      onClick={() => onChange(id)}
      className={cn('focus-ring min-h-11 min-w-0 rounded-lg border px-2 py-2 text-sm font-semibold',
        active === id ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-500/20 dark:text-brand-100' : 'border-border bg-surface text-fg hover:bg-surface-2')}>
      {label}
    </button>)}
  </nav>;
}
