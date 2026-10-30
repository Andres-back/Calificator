/** Presentation mirror only. The server revalidates every plan under its lock. */
export interface ScoreGroup { id: string; titulo: string; claves: string[]; presupuesto: string; fijados: Record<string, string> }
export interface ScorePlan { schema_version: 1; modo: 'total' | 'tipo' | 'seccion' | 'bloques'; grupos: ScoreGroup[] }
export interface ScoreQuestion { clave: string; numero: string; titulo: string; tipo: string; puntaje: string; seccion_id?: string | null; seccion_titulo?: string | null }

function units(value: string): number {
  const text = value.trim().replace(',', '.');
  if (!/^(?:\d+(?:\.\d{1,4})?|\.\d{1,4})$/.test(text)) throw new Error('Usa un número positivo con hasta cuatro decimales, sin separador de miles.');
  const [whole, fraction = ''] = text.split('.');
  const result = Number(whole || 0) * 10000 + Number(fraction.padEnd(4, '0'));
  if (!Number.isSafeInteger(result) || result <= 0 || result > 99999900) throw new Error('Los puntos deben ser mayores que cero y no superar la escala permitida.');
  return result;
}

function fromUnits(value: number): string {
  return (value / 10000).toFixed(4).replace(/\.?0+$/, '');
}

export function formatAllocationScore(value: string | number): string {
  const number = Number(String(value).replace(',', '.'));
  return Number.isFinite(number) ? number.toLocaleString('es', { maximumFractionDigits: 4 }) : '—';
}

export function compileScorePlan(plan: ScorePlan, keys: string[], maximum: string): Record<string, string> {
  if (!keys.length || keys.length > 100 || new Set(keys).size !== keys.length) throw new Error('No pudimos identificar de forma única todas las preguntas.');
  if (!plan.grupos.length || new Set(plan.grupos.map(group => group.id)).size !== plan.grupos.length) throw new Error('Cada bloque necesita un identificador distinto.');
  const members = plan.grupos.flatMap(group => group.claves);
  if (new Set(members).size !== members.length || members.length !== keys.length || members.some(key => !keys.includes(key))) throw new Error('Incluye todas las preguntas una sola vez, sin superponer bloques.');
  if (plan.grupos.reduce((sum, group) => sum + units(group.presupuesto), 0) !== units(maximum)) throw new Error('Los puntos de los bloques deben sumar exactamente la nota máxima.');
  const result: Record<string, string> = {};
  for (const group of plan.grupos) {
    if (!group.claves.length || Object.keys(group.fijados).some(key => !group.claves.includes(key))) throw new Error('Revisa las preguntas y los puntos fijados de este bloque.');
    const free = keys.filter(key => group.claves.includes(key) && !Object.prototype.hasOwnProperty.call(group.fijados, key));
    const remaining = units(group.presupuesto) - Object.values(group.fijados).reduce((sum, value) => sum + units(value), 0);
    if (remaining < free.length || (!free.length && remaining !== 0)) throw new Error(`El bloque «${group.titulo}» no tiene puntos suficientes: libera un valor fijado o revisa su total.`);
    Object.entries(group.fijados).forEach(([key, value]) => { result[key] = fromUnits(units(value)); });
    free.forEach((key, index) => { result[key] = fromUnits(Math.floor(remaining / free.length) + (index < remaining % free.length ? 1 : 0)); });
  }
  return Object.fromEntries(keys.map(key => [key, result[key]]));
}
