import type { Evaluacion } from '@/types/api';
import { validateQuestion, type EditableQuestion } from './generationWizardModel';

/**
 * Spec 156: what a digitalized draft still needs before publishing.
 * Presentation only: the server keeps applying every publication rule.
 */
export function showsPublishChecklist(evaluation: Evaluacion | null | undefined): boolean {
  return Boolean(evaluation && evaluation.tipo_origen === 'externa_digitalizada' && evaluation.estado === 'borrador');
}

/** Digitalization warnings that name a sheet, such as "La lectura de la hoja 1 quedó incompleta". */
export function sheetWarnings(evaluation: Evaluacion | null | undefined): string[] {
  const warnings = evaluation?.blueprint?.reglas_feedback?.advertencias ?? [];
  return [...new Set(warnings.filter(warning => typeof warning === 'string' && /\bhoja\s+\d+/i.test(warning)))];
}

/** Positions of the questions the editor still rejects, for example one without its correct answer. */
export function pendingQuestionIndexes(questions: EditableQuestion[]): number[] {
  return questions.flatMap((question, index) => (validateQuestion(question, index) ? [index] : []));
}
