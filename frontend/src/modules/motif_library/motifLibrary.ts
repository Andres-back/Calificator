const aliases: Record<string, string> = {
  naturales: 'naturales', 'ciencias naturales': 'naturales', 'ciencias naturales y educacion ambiental': 'naturales', biologia: 'naturales', fisica: 'naturales', quimica: 'naturales',
  sociales: 'sociales', 'ciencias sociales': 'sociales', historia: 'sociales', geografia: 'sociales',
  matematicas: 'matematicas', matematica: 'matematicas',
  castellana: 'castellana', 'lengua castellana': 'castellana', lenguaje: 'castellana', espanol: 'castellana',
  ingles: 'ingles', english: 'ingles',
  tecnologia: 'tecnologia', informatica: 'tecnologia', 'tecnologia e informatica': 'tecnologia',
  artistica: 'artistica', 'educacion artistica': 'artistica', artes: 'artistica',
  'educacion fisica': 'fisica', deportes: 'fisica',
  etica: 'etica', 'etica y valores': 'etica',
  religiosa: 'religiosa', 'educacion religiosa': 'religiosa', religion: 'religiosa',
};

export function collectionForArea(area?: string | null): string {
  const key = area?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ') ?? '';
  return aliases[key] ?? 'general';
}

/** Opaque destination ID only; no mark, name, ability or demographic input. */
export function stableMotifIndex(destinationId: string, count: number): number {
  if (count < 1) return -1;
  let hash = 0;
  for (const character of destinationId) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0;
  return hash % count;
}

export function curatedAssetPath(value: string): string {
  if (!/^\/api\/biblioteca-motivos\/archivos\/[a-z][a-z0-9-]{0,69}\/(?:thumbnail|full)\/[a-f0-9]{64}$/.test(value)) {
    throw new Error('Referencia de biblioteca no válida');
  }
  return value;
}
