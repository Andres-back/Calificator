/** Preserve meaningful four-decimal component weights without noisy zeros.
 * Global report-card grades continue to use their own rounding policy. */
export function componentPoints(value: string | number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  const [integer, fraction] = Number(value).toFixed(4).split('.');
  return `${integer}.${fraction.replace(/0+$/, '').padEnd(2, '0')}`;
}
