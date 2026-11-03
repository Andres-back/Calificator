import type { FeedbackAccess, FeedbackPreview } from '../../src/modules/feedback_sharing/api';
import type { FeedbackResult } from '../../src/modules/feedback_sharing/publicApi';
import type { EvidenceEditContext } from '../../src/modules/calificaciones/api';
import { grade, student } from '../fixtures/explainableGrading';

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

export const spec141EvidenceHref = '/app/calificaciones?materia=m1&evaluacion=e1&calificacion=c1&estudiante=s1';
export const spec141EvidenceGrade = {
  ...grade, estado: 'publicada', nota_confirmada: 5, revisado_por_docente: true,
  estudiante_nombre: student.nombre, evaluacion_nombre: 'Evaluación sintética', materia_nombre: 'Matemáticas',
  entrega_tipo: 'foto', entrega_archivo_url: '/api/calificaciones/c1/evidencia',
  entrega_evidencia_paginas: 2, entrega_evidencia_tipo: 'foto', timeline: [], guia_revision: [],
};
export const spec141EvidenceContext: EvidenceEditContext = {
  version_esperada: spec141EvidenceGrade.updated_at,
  fingerprint: 'a'.repeat(64),
  paginas: [
    { referencia: 'first-sheet', numero: 1, rotacion: 0, preview_url: '/api/calificaciones/c1/evidencia/paginas/1' },
    { referencia: 'second-sheet', numero: 2, rotacion: 90, preview_url: '/api/calificaciones/c1/evidencia/paginas/2' },
  ],
  limites: { max_pages: 10, max_file_bytes: 1024, max_total_bytes: 4096 },
};
