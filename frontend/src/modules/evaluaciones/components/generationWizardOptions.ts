import { Blend, Check, FileText, ListChecks, Monitor, Printer, Type } from 'lucide-react';
import type { QuestionType } from './generationWizardModel';

export const TYPE_COPY: Record<QuestionType, { label: string; description: string; icon: typeof ListChecks }> = {
  opcion_multiple: { label: 'Opción múltiple', description: 'Opciones y una respuesta correcta', icon: ListChecks },
  verdadero_falso: { label: 'Verdadero o falso', description: 'Afirmaciones para analizar', icon: Check },
  abierta: { label: 'Respuesta abierta', description: 'El estudiante desarrolla su respuesta', icon: FileText },
  completar: { label: 'Completar', description: 'Frases con espacios por resolver', icon: Type },
};

export const MODALITY_OPTIONS = [
  { value: 'fisica', label: 'En papel', description: 'Imprime y califica por foto.', icon: Printer },
  { value: 'online', label: 'En línea', description: 'Responden desde la aplicación.', icon: Monitor },
  { value: 'mixta', label: 'Mixta', description: 'Combina preguntas en papel y en línea.', icon: Blend },
] as const;
