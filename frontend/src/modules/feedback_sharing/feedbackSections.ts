export interface FeedbackSection { title: string; text: string; original: string }

/** Explicit labels only: never derive a learning achievement from a grade. */
export function feedbackSections(value: string): FeedbackSection[] {
  const labels = Array.from(value.matchAll(/\b(Aciertos|Qu[eé] mejorar|Siguiente paso|Pregunta\s+\d+)\s*:/gi));
  if (!labels.length) return [{ title: 'Retroalimentación', text: value, original: value }];
  const sections: FeedbackSection[] = [];
  const first = labels[0].index!;
  if (first > 0 && value.slice(0, first).trim()) {
    sections.push({ title: 'Retroalimentación', text: value.slice(0, first).trim(), original: value.slice(0, first) });
  }
  for (let index = 0; index < labels.length; index++) {
    const match = labels[index];
    const start = index === 0 && !sections.length ? 0 : match.index!;
    const end = labels[index + 1]?.index ?? value.length;
    const label = match[1];
    const title = /^aciertos$/i.test(label) ? 'Aciertos' : /^qu[eé] mejorar$/i.test(label) ? 'Qué mejorar' : /^siguiente paso$/i.test(label) ? 'Siguiente paso' : label;
    const original = value.slice(start, end);
    sections.push({ title, text: value.slice(match.index! + match[0].length, end).trim(), original });
  }
  return sections;
}

/** Only add paragraph breaks; retain every original character for printing. */
export function feedbackPrintText(value: string): string {
  return feedbackSections(value).reduce((text, section, index) =>
    text + (index > 0 && !/\n\s*$/.test(text) ? '\n' : '') + section.original, '');
}
