import type { Evaluacion } from '@/types/api';
import { formatGradeScore } from '@/modules/calificaciones/gradePresentation';

export function getStudentEvaluationAction(evaluation: Evaluacion): string {
  if (evaluation.entrega_realizada) return 'Ver entrega';
  return evaluation.material_origen_id ? 'Ver actividad' : 'Ver evaluación';
}

export function getStudentEvaluationStatus(evaluation: Evaluacion): {
  label: string;
  tone: 'success' | 'warning' | 'neutral' | 'brand';
} {
  if (evaluation.mi_nota_confirmada != null) {
    const maximum = Number(evaluation.mi_nota_maxima ?? evaluation.nota_maxima);
    // Spec 189: verde solo si aprueba (60 % de la nota máxima); si no, ámbar.
    const passes = maximum > 0 && Number(evaluation.mi_nota_confirmada) >= maximum * 0.6;
    return {
      label: `Tu nota: ${formatGradeScore(evaluation.mi_nota_confirmada, evaluation.mi_nota_maxima ?? evaluation.nota_maxima)} / ${formatGradeScore(evaluation.mi_nota_maxima ?? evaluation.nota_maxima)}`,
      tone: passes ? 'success' : 'warning',
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
