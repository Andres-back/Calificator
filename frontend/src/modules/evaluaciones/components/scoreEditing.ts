/** Presentation helpers only: the server still validates every saved score. */
const UNITS = 10000;
const CENT = 100;
const SERVER_TOLERANCE = 100;

const toUnits = (value: number) => (Number.isFinite(value) ? Math.round(value * UNITS) : 0);

/** Reads what a teacher typed; anything that is not a score reads as 0, which the editor rejects. */
export function parseScoreInput(text: string): number {
  const value = text.trim().replace(/,/g, '.');
  return /^(?:\d+\.?\d{0,4}|\.\d{1,4})$/.test(value) ? Number(value) : 0;
}

export function scoreSummary(scores: number[], maximum: number) {
  const total = scores.reduce((sum, score) => sum + toUnits(score), 0);
  const difference = total - toUnits(maximum);
  return { total: total / UNITS, difference: difference / UNITS, matches: Math.abs(difference) <= SERVER_TOLERANCE };
}

/**
 * Keeps the open question and scales the others so the sum is exactly the maximum.
 * Returns null when that cannot leave at least 0.01 for every other question.
 */
export function adjustOtherScores(scores: number[], index: number, maximum: number): number[] | null {
  const kept = toUnits(scores[index]);
  const others = scores.map((score, position) => ({ position, weight: Math.max(0, toUnits(score)) })).filter(item => item.position !== index);
  const remaining = toUnits(maximum) - kept;
  if (kept <= 0 || !others.length || remaining < others.length * CENT) return null;
  const weights = others.some(item => item.weight > 0) ? others.map(item => item.weight) : others.map(() => 1);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const cents = Math.floor(remaining / CENT);
  const shares = weights.map(weight => (cents * weight) / totalWeight);
  const assigned = shares.map(share => Math.max(1, Math.floor(share)));
  let pending = cents - assigned.reduce((sum, value) => sum + value, 0);
  const byRemainder = shares.map((share, position) => ({ position, rest: share - Math.floor(share) })).sort((a, b) => b.rest - a.rest);
  for (let step = 0; pending > 0; step += 1, pending -= 1) assigned[byRemainder[step % byRemainder.length].position] += 1;
  while (pending < 0) {
    assigned[assigned.indexOf(Math.max(...assigned))] -= 1;
    pending += 1;
  }
  const result = [...scores];
  others.forEach((item, position) => { result[item.position] = (assigned[position] * CENT) / UNITS; });
  // A kept score with more than two decimals leaves less than one cent to place.
  const largest = assigned.indexOf(Math.max(...assigned));
  result[others[largest].position] = (assigned[largest] * CENT + remaining % CENT) / UNITS;
  return result;
}
