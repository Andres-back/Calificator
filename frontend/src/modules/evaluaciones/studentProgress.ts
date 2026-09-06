import type { Evaluacion } from '@/types/api';

export function getStudentEvaluationAction(evaluation: Evaluacion): string {
  if (evaluation.entrega_realizada) return 'Ver entrega';
  return evaluation.material_origen_id ? 'Ver actividad' : 'Ver evaluación';
}

export function getStudentEvaluationStatus(evaluation: Evaluacion): {
  label: string;
  tone: 'success' | 'warning' | 'neutral' | 'brand';
} {
  if (evaluation.mi_nota_confirmada != null) {
    return {
      label: `Calificada: ${Number(evaluation.mi_nota_confirmada).toFixed(1)} / ${Number(evaluation.nota_maxima).toFixed(1)}`,
      tone: 'success',
    };
  }
  if (evaluation.mi_entrega_estado === 'requiere_reintento') {
    return { label: 'Pendiente de revisión docente', tone: 'warning' };
  }
  if (
    evaluation.mi_calificacion_estado === 'procesando'
    || evaluation.mi_entrega_estado === 'procesando'
    || (evaluation.mi_entrega_estado === 'recibida' && evaluation.modalidad !== 'mixta')
  ) {
    return { label: 'Calificando', tone: 'brand' };
  }
  if (evaluation.entrega_realizada) return { label: 'Entregada', tone: 'brand' };
  if (evaluation.estado === 'cerrada' || evaluation.recepcion_habilitada === false) {
    return { label: 'Recepción cerrada', tone: 'neutral' };
  }
  return { label: 'Disponible', tone: 'success' };
}
