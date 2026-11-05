import type { EvaluacionEstado } from '@/types/api';

/** Etiqueta visible de cada estado de evaluación; el tono se toma de `statusTone` (Badge). */
export const ESTADO_LABEL: Record<EvaluacionEstado, string> = {
  borrador: 'Borrador',
  publicada: 'Publicada',
  en_calificacion: 'En calificación',
  pendiente_revision: 'Por revisar',
  cerrada: 'Cerrada',
};
