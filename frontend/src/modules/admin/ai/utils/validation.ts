export function formatDate(value: string | null) {
  if (!value) return 'Sin registros';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}
