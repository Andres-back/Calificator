import { stableMotifIndex } from '@/modules/motif_library/motifLibrary';

const motifs = [
  ['libro', 'Libro'], ['lapices', 'Lápices'], ['idea', 'Idea'], ['cohete', 'Cohete'],
  ['planeta', 'Planeta'], ['microscopio', 'Microscopio'], ['atomo', 'Átomo'], ['calculadora', 'Calculadora'],
  ['geometria', 'Geometría'], ['globo', 'Globo terráqueo'], ['brote', 'Brote'], ['origami', 'Origami'],
  ['montana', 'Montaña'], ['olas', 'Olas'], ['brujula', 'Brújula'], ['cometa', 'Cometa'],
  ['musica', 'Música'], ['piezas', 'Piezas'], ['telescopio', 'Telescopio'], ['arte', 'Arte'],
] as const;

export const feedbackMotifs = motifs.map(([id, label]) => ({ id, label, src: `/assets/feedback-motifs/${id}.png` }));
export interface PrintMotif { id: string; label: string; src: string }

/** Decorative only: no score, ability, gender or personal data is used. */
export function motifForStudent(choice: string, studentId: string, collection: PrintMotif[] = feedbackMotifs) {
  if (choice !== 'mixed') return collection.find(item => item.id === choice);
  return collection[stableMotifIndex(studentId, collection.length)];
}
