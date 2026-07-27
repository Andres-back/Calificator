import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

const STEP_LABELS = ['Materia', 'DBA', 'Configurar', 'Material', 'Revisar', 'Confirmar'];

export function PasosGuia({
  currentStep,
  totalSteps = 6,
}: {
  currentStep: number;
  totalSteps?: number;
}) {
  return (
    <div className="space-y-3">
      <p className="text-center text-base font-semibold text-fg">Paso {currentStep} de {totalSteps}</p>
      <div
        className="flex h-2 w-full overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-label={`Paso ${currentStep} de ${totalSteps}`}
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
      >
        <div
          className="h-full rounded-full bg-brand-600 transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>
      <nav aria-label="Progreso del wizard" className="flex items-center justify-between gap-1">
        {STEP_LABELS.slice(0, totalSteps).map((label, index) => {
          const stepNum = index + 1;
          const completed = stepNum < currentStep;
          const current = stepNum === currentStep;
          return (
            <div key={label} className="flex min-w-0 flex-col items-center gap-1">
              <span
                className={cn(
                  'grid h-8 w-8 place-items-center rounded-full text-xs font-bold transition-colors motion-reduce:transition-none',
                  completed && 'bg-emerald-500 text-white',
                  current && 'bg-brand-600 text-white ring-2 ring-brand-300 ring-offset-2 ring-offset-surface',
                  stepNum > currentStep && 'bg-border text-muted',
                )}
                aria-current={current ? 'step' : undefined}
                aria-label={`${label}: ${completed ? 'completado' : current ? 'actual' : 'pendiente'}`}
              >
                {completed ? <Check className="h-4 w-4" aria-hidden="true" /> : stepNum}
              </span>
              <span className={cn(
                'hidden max-w-20 truncate text-[11px] font-medium sm:block',
                completed && 'text-emerald-600',
                current && 'text-brand-700',
                stepNum > currentStep && 'text-muted',
              )}>
                {label}
              </span>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
