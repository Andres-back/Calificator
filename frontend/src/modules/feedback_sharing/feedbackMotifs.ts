const motifs = [
  ['libro', 'Libro'], ['lapices', 'Lápices'], ['idea', 'Idea'], ['cohete', 'Cohete'],
  ['planeta', 'Planeta'], ['microscopio', 'Microscopio'], ['atomo', 'Átomo'], ['calculadora', 'Calculadora'],
  ['geometria', 'Geometría'], ['globo', 'Globo terráqueo'], ['brote', 'Brote'], ['origami', 'Origami'],
  ['montana', 'Montaña'], ['olas', 'Olas'], ['brujula', 'Brújula'], ['cometa', 'Cometa'],
  ['musica', 'Música'], ['piezas', 'Piezas'], ['telescopio', 'Telescopio'], ['arte', 'Arte'],
] as const;

export const feedbackMotifs = motifs.map(([id, label]) => ({ id, label, src: `/assets/feedback-motifs/${id}.png` }));

/** Decorative only: no score, ability, gender or personal data is used. */
export function motifForStudent(choice: string, studentId: string) {
  if (choice !== 'mixed') return feedbackMotifs.find(item => item.id === choice);
  let hash = 0;
  for (const character of studentId) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0;
  return feedbackMotifs[hash % feedbackMotifs.length];
}
