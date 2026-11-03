import type { FeedbackAccess, FeedbackPreview } from '../../src/modules/feedback_sharing/api';
import type { FeedbackResult } from '../../src/modules/feedback_sharing/publicApi';

/** Synthetic fixtures only. Never import these into the application bundle. */
export const spec141FeedbackText = 'Aciertos: Identificaste la idea principal.\nQué mejorar: Explica el motivo del cambio.\nSiguiente paso: Añade una razón y un ejemplo del texto.';
export const spec141Result: FeedbackResult = {
  estudiante: 'Alex Ramírez', evaluacion: 'Lectura de prueba', materia: 'Lenguaje de prueba',
  nota: '3.75', nota_maxima: '5', explicacion: 'Resultado sintético revisado.',
  retroalimentacion: spec141FeedbackText, respuestas: [], claves_liberadas: false, alcance: 'summary',
};
export const spec141Preview: FeedbackPreview = {
  calificacion_id: 'grade-141', elegible: true, fingerprint: 'f'.repeat(64), resultado: spec141Result,
  mensaje_editable: { source_fingerprint: 'f'.repeat(64), feedback_text: spec141FeedbackText, detail_available: false },
};
export const spec141Access: FeedbackAccess = {
  id: 'access-141', calificacion_id: spec141Preview.calificacion_id, estudiante: spec141Result.estudiante,
  estado: 'active', version: 1, fingerprint: 'f'.repeat(64), copy_available: true, expires_at: '2099-01-01T00:00:00Z',
};
