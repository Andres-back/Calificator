/** Textos legibles para lo que la IA devuelve como dato crudo en los recursos. */

/** Quita «A.», «A)», «a -»… solo cuando es la misma letra que la vista antepone; así no se ve «A) A. …». */
export const optionText = (value: unknown, index: number) => {
  const text = String(value ?? '').trim();
  const match = /^([A-Ha-h])\s*[).:-]\s*/.exec(text);
  if (!match || match[1].toUpperCase() !== String.fromCharCode(65 + index)) return text;
  return text.slice(match[0].length).trim() || text;
};

const comparable = (value: unknown) =>
  String(value ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').replace(/[.;:,]+$/, '');

/**
 * Posición de la opción correcta, o -1 si no se puede saber.
 * La IA escribe la clave de muchas formas: «B», «B)», «b.», «Opción B», «B) El Sol» o el texto de la opción.
 */
export const correctOptionIndex = (options: unknown[], answer: unknown): number => {
  const raw = String(answer ?? '').trim();
  if (!raw || options.length === 0) return -1;
  const byLetter = /^(?:(?:la\s+)?opci[oó]n\s+)?([A-Ha-h])\s*[).:-]?$/i.exec(raw) ?? /^([A-Ha-h])\s*[).:-]\s+\S/.exec(raw);
  if (byLetter) {
    const index = byLetter[1].toUpperCase().charCodeAt(0) - 65;
    if (index < options.length) return index;
  }
  const wanted = comparable(raw);
  return options.findIndex((option, index) => comparable(option) === wanted || comparable(optionText(option, index)) === wanted);
};

const TYPE_LABELS: Record<string, string> = {
  opcion_multiple: 'Opción múltiple',
  seleccion_multiple: 'Opción múltiple',
  abierta: 'Respuesta abierta',
  verdadero_falso: 'Verdadero o falso',
  completar: 'Completar',
  procedimiento: 'Procedimiento',
  aplicacion: 'Aplicación',
  analisis: 'Análisis',
  comprension: 'Comprensión',
  desarrollo_corto: 'Desarrollo corto',
  dibujar: 'Dibujar',
  relacionar: 'Relacionar',
  literal: 'Literal',
  inferencial: 'Inferencial',
  critica: 'Crítica',
  vocabulario: 'Vocabulario',
};

const plainKey = (value: string) =>
  value.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s/-]+/g, '_');

/** Etiqueta legible para tipos como «opcion_multiple» o «aplicacion». */
export const typeLabel = (value: unknown) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const known = TYPE_LABELS[plainKey(raw)];
  if (known) return known;
  const text = raw.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const pointsLabel = (value: unknown) => (Number(value) === 1 ? '1 punto' : `${String(value)} puntos`);

const DIFFICULTY_LABELS: Record<string, string> = {
  baja: 'Dificultad baja',
  media: 'Dificultad media',
  alta: 'Dificultad alta',
};

export const difficultyLabel = (value: unknown) =>
  DIFFICULTY_LABELS[plainKey(String(value ?? ''))] ?? String(value ?? '');
