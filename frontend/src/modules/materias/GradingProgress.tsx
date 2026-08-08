import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

const STEPS = [
  { number: 1, label: 'Evaluación', description: 'Qué vas a calificar' },
  { number: 2, label: 'Estudiante', description: 'De quién es la evidencia' },
  { number: 3, label: 'Evidencia', description: 'Foto/PDF y análisis IA' },
  { number: 4, label: 'Decisión docente', description: 'Revisar y confirmar' },
] as const;

export function GradingProgress({ currentStep }: { currentStep: 1 | 2 | 3 | 4 }) {
  return (
    <nav aria-label="Progreso de la calificación" className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((step) => {
          const completed = step.number < currentStep;
          const active = step.number === currentStep;
          return (
            <li
              key={step.number}
              aria-current={active ? 'step' : undefined}
              className={cn(
                'flex min-w-0 items-start gap-3 rounded-lg border p-3',
                active
                  ? 'border-brand-400 bg-brand-50 dark:border-brand-500/50 dark:bg-brand-500/10'
                  : completed
                    ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                    : 'border-transparent bg-surface-2/60',
              )}
            >
              <span
                className={cn(
                  'grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-extrabold',
                  active
                    ? 'bg-brand-700 text-white'
                    : completed
                      ? 'bg-emerald-700 text-white'
                      : 'bg-surface text-muted',
                )}
              >
                {completed ? <Check className="h-5 w-5" aria-hidden="true" /> : step.number}
              </span>
              <span className="min-w-0">
                <span className="block font-bold">{step.label}</span>
                <span className="mt-0.5 block text-xs leading-4 text-muted">
                  {step.description}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
