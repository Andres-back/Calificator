import type { EducationalIconName } from './EducationalIcon';

export function getSubjectEducationalIcon(area?: string | null): EducationalIconName {
  const normalized = (area ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (/matemat|algebra|geometr|estadistic/.test(normalized)) return 'subject-math';
  if (/social|historia|geograf|ciudadan/.test(normalized)) return 'subject-social';
  if (/ciencia|natural|biolog|quimic|fisic|ambient/.test(normalized)) return 'subject-science';
  if (/lengua|espanol|castellano|literatura|lectura/.test(normalized)) return 'subject-language';
  if (/ingles|idioma|lengua extranjera/.test(normalized)) return 'subject-english';
  if (/arte|artistic|musica|danza|teatro/.test(normalized)) return 'subject-art';
  if (/tecnolog|informat|comput|program|sistema|robot|inteligencia artificial/.test(normalized)) return 'subject-technology';
  return 'subjects';
}
