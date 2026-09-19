import type { GradeBreakdownData, GradeComponentData } from '@/types/api';
import { XALI_STORY_STATES, type XaliVisualState } from '@/components/xali/xaliStates';

export type FeedbackSceneKind = 'welcome' | 'strength' | 'improvement' | 'next_step';

export type FeedbackScene = {
  id: string;
  kind: FeedbackSceneKind;
  title: string;
  message: string;
  componentId?: string;
  detailLabel?: string;
  mascotState: XaliVisualState;
};

function numeric(value: string | number | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function ratio(component: GradeComponentData): number {
  const possible = numeric(component.puntos_maximos);
  return possible > 0 ? numeric(component.puntos_obtenidos) / possible : 0;
}

function studentExplanation(component: GradeComponentData): string {
  return component.explicacion_estudiante?.trim() || component.explicacion.trim();
}

export function buildFeedbackStory(breakdown: GradeBreakdownData): FeedbackScene[] {
  if (breakdown.requiere_revision || (breakdown.bloqueos?.length ?? 0) > 0 || breakdown.componentes.length === 0) return [];

  const evaluable = breakdown.componentes.filter((component) => !component.requiere_revision && component.estado !== 'ilegible' && component.estado !== 'no_evaluable');
  if (evaluable.length === 0) return [];

  const strength = [...evaluable]
    .filter((component) => component.estado === 'correcta' || ratio(component) >= 0.8)
    .sort((a, b) => ratio(b) - ratio(a))[0];
  const improvement = [...evaluable]
    .filter((component) => component.orientacion_mejora?.trim() && component.estado !== 'correcta')
    .sort((a, b) => ratio(a) - ratio(b))[0];

  const scenes: FeedbackScene[] = [{
    id: 'welcome', kind: 'welcome', title: 'Tu trabajo ya tiene una historia',
    message: 'Vamos a reconocer lo que lograste y elegir un siguiente paso que sí puedas aplicar.',
    mascotState: XALI_STORY_STATES.welcome,
  }];

  if (strength) scenes.push({
    id: `strength-${strength.id}`, kind: 'strength', title: 'Esto lo hiciste bien',
    message: studentExplanation(strength), componentId: strength.id,
    detailLabel: `Ver por qué en ${strength.titulo}`,
    mascotState: XALI_STORY_STATES.strength,
  });

  if (improvement) scenes.push({
    id: `improvement-${improvement.id}`, kind: 'improvement', title: 'Tu oportunidad principal',
    message: studentExplanation(improvement), componentId: improvement.id,
    detailLabel: `Ver la explicación de ${improvement.titulo}`,
    mascotState: XALI_STORY_STATES.improvement,
  });

  if (improvement?.orientacion_mejora?.trim()) scenes.push({
    id: `next-${improvement.id}`, kind: 'next_step', title: 'Prueba este siguiente paso',
    message: improvement.orientacion_mejora.trim(), componentId: improvement.id,
    detailLabel: `Abrir el detalle de ${improvement.titulo}`,
    mascotState: XALI_STORY_STATES.next_step,
  });

  return scenes.slice(0, 4);
}
