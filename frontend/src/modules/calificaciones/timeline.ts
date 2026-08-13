export function formatTimelineScore(value: unknown): string | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const score = Number(value);
  return Number.isFinite(score) ? score.toFixed(1) : null;
}