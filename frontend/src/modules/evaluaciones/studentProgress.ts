import type { Evaluacion } from '@/types/api';

export function getStudentEvaluationAction(evaluation: Evaluacion): string {
  if (evaluation.entrega_realizada) return 'Ver entrega';
  if (evaluation.mi_entrega_estado === 'requiere_reintento') {
    return evaluation.modalidad === 'fisica' ? 'Volver a subir' : 'Volver a intentar';
  }
  if (evaluation.recepcion_habilitada === false || evaluation.estado === 'cerrada') {
    return 'Ver actividad';
  }
  if (evaluation.modalidad === 'fisica') return 'Subir foto o PDF';
  if (evaluation.modalidad === 'mixta') return 'Resolver y adjuntar';
  return 'Resolver en línea';
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
  if (evaluation.entrega_realizada) return { label: 'Entregada', tone: 'brand' };
  if (evaluation.mi_entrega_estado === 'requiere_reintento') {
    return { label: 'Debes volver a intentar', tone: 'warning' };
  }
  if (evaluation.estado === 'cerrada' || evaluation.recepcion_habilitada === false) {
    return { label: 'Recepción cerrada', tone: 'neutral' };
  }
  return { label: 'Disponible', tone: 'success' };
}
