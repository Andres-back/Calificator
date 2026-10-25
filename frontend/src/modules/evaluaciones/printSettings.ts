import type { EvaluationPrintSettings } from '@/types/api';

export function defaultPrintSettings(): EvaluationPrintSettings {
  return { schema_version: 1, distribucion: 'compacta', blanco_negro: true, respuestas: {}, materiales: {} };
}
