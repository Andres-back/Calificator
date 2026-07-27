import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

const STEP_LABELS = [
  'Materia',
  'DBA',
  'Preguntas',
  'Tipos',
  'Detalles',
  'Revisar',
];

export function PasosGuia({
  currentStep,
  totalSteps = 6,
}: {
  currentStep: number;
  totalSteps?: number;
}) {
  return (
    <div className="space-y-3">
      {/* Barra de progreso numérica */}
      <p className="text-center text-base font-semibold text-fg">
        Paso {currentStep} de {totalSteps}
      </p>

      {/* Barra de progreso visual */}
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-border" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={totalSteps}>
        <div
          className="h-full rounded-full bg-brand-600 transition-all duration-500 ease-out"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>

      {/* Breadcrumb de pasos */}
      <nav aria-label="Progreso del wizard" className="flex items-center justify-between gap-1">
        {STEP_LABELS.slice(0, totalSteps).map((label, index) => {
          const stepNum = index + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          const isPending = stepNum > currentStep;

          return (
            <div key={label} className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  'grid h-7 w-7 place-items-center rounded-full text-xs font-bold transition-colors',
                  isCompleted && 'bg-emerald-500 text-white',
                  isCurrent && 'bg-brand-600 text-white ring-2 ring-brand-300 ring-offset-2 ring-offset-surface',
                  isPending && 'bg-border text-muted',
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : stepNum}
              </span>
              <span
                className={cn(
                  'hidden text-[10px] font-medium leading-tight sm:block',
                  isCompleted && 'text-emerald-600',
                  isCurrent && 'text-brand-700',
                  isPending && 'text-muted',
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
