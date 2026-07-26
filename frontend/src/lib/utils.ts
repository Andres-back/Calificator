/** Formatea un valor de confianza (0-1 o 0-100) a un label legible. */
export function confidenceLabel(value: number | null): string {
  if (value == null) return 'Sin confianza reportada';
  const normalized = value > 1 ? value : value * 100;
  return `${normalized.toFixed(0)}%`;
}
