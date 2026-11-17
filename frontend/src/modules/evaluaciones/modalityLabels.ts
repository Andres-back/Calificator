import type { EvaluacionModalidad } from '@/types/api';

/** Spec 189: un solo nombre para cada modalidad en toda la app. */
export const MODALITY_LABELS: Record<EvaluacionModalidad, string> = {
  fisica: 'En papel',
  online: 'En línea',
  mixta: 'Mixta',
};

export function modalityLabel(value: string | null | undefined): string {
  return MODALITY_LABELS[(value ?? 'online') as EvaluacionModalidad] ?? 'En línea';
}
