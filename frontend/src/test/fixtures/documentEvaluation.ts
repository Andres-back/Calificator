import type { Evaluacion } from '@/types/api';

export const documentId = (number: number) => `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`;

export function documentEvaluation(): Evaluacion {
  return { id: 'document-evaluation', materia_id: 'subject', nombre: 'Semillas y crecimiento',
    modalidad: 'fisica', estado: 'borrador', nota_maxima: 5, descripcion: '', contenido_version_id: 'version-1',
    preguntas: [
      { contenido_id: documentId(1), numero: 7, tipo: 'abierta', enunciado: 'Explica cómo germina.', puntaje: 2 },
      { contenido_id: documentId(2), numero: 2, tipo: 'abierta', enunciado: 'Explica qué necesita.', puntaje: 3 },
    ], respuestas_esperadas: [{ numero: 7, respuesta: 'Con agua y temperatura adecuada.' }, { numero: 2, respuesta: 'Agua y nutrientes.' }],
    criterios: [], dba_ids: [], dba_personalizado_ids: [], metas_profesor: [],
    estructura_documento: { schema_version: 1, nodos: [
      { id: documentId(10), padre_id: null, orden: 0, tipo: 'seccion', titulo: 'Observamos' },
      { id: documentId(11), padre_id: documentId(10), orden: 0, tipo: 'texto', proposito: 'lectura', texto: 'Una semilla comienza a crecer.\nLa cuidamos cada día.' },
      { id: documentId(12), padre_id: documentId(10), orden: 1, tipo: 'pregunta', pregunta_id: documentId(1), etiqueta_original: '1' },
      { id: documentId(20), padre_id: null, orden: 1, tipo: 'seccion', titulo: 'Reflexionamos' },
      { id: documentId(21), padre_id: documentId(20), orden: 0, tipo: 'pregunta', pregunta_id: documentId(2), etiqueta_original: '1' },
    ], revision: { detectados: [], conservados: [], avisos: [], estado: 'completa', confirmado: true } },
  } as unknown as Evaluacion;
}
