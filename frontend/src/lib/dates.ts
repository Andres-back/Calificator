/**
 * Utilidades centralizadas de fecha y hora.
 * Zona horaria principal: America/Bogota
 */
const LOCALE = 'es-CO';

/** Formatea una fecha ISO o timestamp a formato legible en español (ej. "25 mar 2026") */
export function formatDate(
  value: string | Date | number,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' },
): string {
  const date = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(LOCALE, options);
}

/** Formatea fecha con hora (ej. "25 mar 2026, 3:45 p. m.") */
export function formatDateTime(value: string | Date | number): string {
  const date = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(LOCALE, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** Formato solo hora (ej. "3:45 p. m.") */
export function formatTime(value: string | Date | number): string {
  const date = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString(LOCALE, { timeStyle: 'short' });
}

/** Fecha relativa: "hoy", "ayer", "hace 3 días", etc. */
export function formatRelative(value: string | Date | number): string {
  const date = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffDays < 0) return formatDate(value);
  if (diffDays === 0) return 'hoy';
  if (diffDays === 1) return 'ayer';
  if (diffDays < 7) return `hace ${diffDays} días`;
  if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)} sem`;
  return formatDate(value);
}

/** Compara dos fechas ISO, devuelve diferencia en milisegundos (a - b) */
export function diffDates(a: string | Date, b: string | Date): number {
  const da = typeof a === 'string' ? new Date(a) : a;
  const db = typeof b === 'string' ? new Date(b) : b;
  return da.getTime() - db.getTime();
}

/** Normaliza fecha eliminando ambigüedad de zona horaria (YYYY-MM-DD → Date en America/Bogota) */
export function parseLocalDate(isoLike: string): Date {
  // Si viene como "2026-03-25" sin hora, tratarlo como fecha local
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoLike)) {
    const [y, m, d] = isoLike.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(isoLike);
}
