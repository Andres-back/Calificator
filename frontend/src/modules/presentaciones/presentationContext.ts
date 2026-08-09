export type PresentationNivel = 'preescolar' | 'primaria' | 'secundaria' | 'media';

export function inferNivelFromGrado(grado: string | null | undefined): PresentationNivel | null {
  const normalized = (grado ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  if (!normalized) return null;
  if (/preescolar|transicion|jardin/.test(normalized)) return 'preescolar';

  const numeric = Number.parseInt(normalized.match(/\d+/)?.[0] ?? '', 10);
  if (Number.isFinite(numeric)) {
    if (numeric <= 0) return 'preescolar';
    if (numeric <= 5) return 'primaria';
    if (numeric <= 9) return 'secundaria';
    return 'media';
  }

  if (/primero|segundo|tercero|cuarto|quinto/.test(normalized)) return 'primaria';
  if (/sexto|septimo|octavo|noveno/.test(normalized)) return 'secundaria';
  if (/decimo|once|undecimo/.test(normalized)) return 'media';
  return null;
}