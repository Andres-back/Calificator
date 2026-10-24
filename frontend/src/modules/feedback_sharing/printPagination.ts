export interface FeedbackPrintEntry {
  id: string; estudiante: string; evaluacion: string; materia: string;
  nota: string; nota_maxima: string; retroalimentacion: string;
}
export interface FeedbackPrintFragment extends FeedbackPrintEntry { text: string; continuation: number; height: number }

/** Conservative physical layout shared by A4 and Carta, 180 × 238 mm.
 * Keep exact character slices; even very long words and blank lines survive.
 * A measured glyph width (12 pt Arial) avoids character-count pagination.
 */
export function paginateFeedback(entries: FeedbackPrintEntry[], measure: (text: string) => number, decorated = false): FeedbackPrintFragment[][] {
  const pages: FeedbackPrintFragment[][] = [];
  let page: FeedbackPrintFragment[] = [];
  let used = 0;
  const width = 630;
  const pageHeight = 900;
  const lineHeight = 24;
  // The font is fixed for one pagination. Measuring every repeated character
  // again can block a low-end phone when preparing a whole class of slips.
  const widths = new Map<string, number>();
  const wrap = (text: string, availableWidth = width) => {
    const ends: number[] = [];
    let start = 0, lineWidth = 0;
    for (const character of text) {
      let size = widths.get(character);
      if (size === undefined) { size = measure(character); widths.set(character, size); }
      if (character !== '\n' && lineWidth + size > availableWidth && start > (ends.at(-1) ?? 0)) { ends.push(start); lineWidth = 0; }
      start += character.length;
      lineWidth += size;
      if (character === '\n') { ends.push(start); lineWidth = 0; }
    }
    if (start > (ends.at(-1) ?? -1)) ends.push(start);
    return ends;
  };
  for (const entry of entries) {
    // Name is bold in print; keep a conservative width and include the
    // continuation label in every fragment's estimate, not only page one.
    const headerWidth = decorated ? 510 : 600;
    const identityLines = wrap('Continuación de ' + entry.estudiante, headerWidth / 1.12).length + wrap(entry.evaluacion + ' · ' + entry.materia, headerWidth).length;
    const headerHeight = Math.max((identityLines + 2) * lineHeight, decorated ? 88 : 0);
    const overhead = headerHeight + lineHeight + 32;
    const lineCapacity = Math.max(1, Math.floor((pageHeight - overhead) / lineHeight));
    let offset = 0, continuation = 1;
    while (offset < entry.retroalimentacion.length) {
      const rest = entry.retroalimentacion.slice(offset);
      const lineEnds = wrap(rest);
      let count = lineEnds[Math.min(lineCapacity, lineEnds.length) - 1];
      if (count < rest.length) {
        // A continuation should not start halfway through an ordinary word.
        // Preserve every character, including its surrounding whitespace.
        const space = Math.max(rest.lastIndexOf(' ', count), rest.lastIndexOf('\n', count));
        if (space > Math.max(0, count - 100)) count = space + 1;
      }
      const end = offset + count;
      const height = overhead + Math.min(lineCapacity, lineEnds.length) * lineHeight;
      if (used + height > pageHeight && page.length) { pages.push(page); page = []; used = 0; }
      page.push({ ...entry, text: entry.retroalimentacion.slice(offset, end), continuation: continuation++, height });
      used += height; offset = end;
    }
  }
  if (page.length) pages.push(page);
  return pages;
}
