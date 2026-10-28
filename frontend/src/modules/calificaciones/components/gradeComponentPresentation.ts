import type { GradeComponentData } from '@/types/api';

type ComponentState = Pick<GradeComponentData, 'estado' | 'requiere_revision' | 'puntos_obtenidos'>;
type Presentation = {
  tone: 'success' | 'warning' | 'error';
  label: string;
  icon: 'check' | 'warning' | 'x';
  navigationClass: string;
  cardClass: string;
  iconClass: string;
};

const styles = {
  success: {
    navigationClass: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-200',
    cardClass: 'border-l-emerald-500 dark:border-l-emerald-400',
    iconClass: 'text-emerald-700 dark:text-emerald-300',
  },
  warning: {
    navigationClass: 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-200',
    cardClass: 'border-l-amber-500 dark:border-l-amber-400',
    iconClass: 'text-amber-700 dark:text-amber-300',
  },
  error: {
    navigationClass: 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-200',
    cardClass: 'border-l-rose-500 dark:border-l-rose-400',
    iconClass: 'text-rose-700 dark:text-rose-300',
  },
} as const;

const warningLabels: Record<string, string> = {
  parcial: 'Parcial',
  sin_respuesta: 'Sin respuesta',
  ilegible: 'Ilegible',
  no_evaluable: 'No evaluable',
  revision_pendiente: 'Por revisar',
};

/** Presentation only: the current component, never a new scoring decision. */
export function gradeComponentPresentation(component: ComponentState): Presentation {
  const points = component.puntos_obtenidos;
  const missingScore = points == null || String(points).trim() === '' || !Number.isFinite(Number(points));
  if (!component.requiere_revision && !missingScore && (component.estado === 'correcta' || component.estado === 'incorrecta')) {
    const correct = component.estado === 'correcta';
    const tone = correct ? 'success' : 'error';
    return { tone, label: correct ? 'Correcta' : 'Incorrecta', icon: correct ? 'check' : 'x', ...styles[tone] };
  }
  return {
    tone: 'warning',
    label: component.requiere_revision || missingScore ? 'Por revisar' : warningLabels[component.estado] ?? 'Por revisar',
    icon: 'warning',
    ...styles.warning,
  };
}
