import type { MaterialListItem } from '@/types/api';
import { TOOL_BY_TIPO } from './meta';

export interface ResourceFilters { query: string; subject: string; type: string }
export function filterResources(items: MaterialListItem[], filters: ResourceFilters) {
  const query = filters.query.trim().toLocaleLowerCase('es');
  return items.filter(item => (
    (!filters.subject || (filters.subject === 'none' ? !item.materia_id : item.materia_id === filters.subject))
    && (!filters.type || item.tipo === filters.type)
    && (!query || [item.titulo, item.materia_nombre, item.tipo, TOOL_BY_TIPO[item.tipo]?.label].filter(Boolean).join(' ').toLocaleLowerCase('es').includes(query))
  ));
}
export function mergeResourcePages(pages: MaterialListItem[][]): MaterialListItem[] {
  return [...new Map(pages.flat().map(item => [item.id, item])).values()];
}
export function resourceState(item: MaterialListItem) {
  if (item.asignacion_tipo === 'actividad') return {
    label: item.publicado_estudiantes ? (item.evaluacion_recepcion_habilitada ? 'Actividad · recibe entregas' : 'Actividad · entregas cerradas') : 'Actividad oculta',
    tone: item.publicado_estudiantes ? 'success' as const : 'violet' as const,
  };
  if (item.asignacion_tipo === 'apoyo') return { label: item.publicado_estudiantes ? 'Apoyo visible' : 'Apoyo oculto', tone: item.publicado_estudiantes ? 'success' as const : 'neutral' as const };
  return { label: 'Borrador', tone: 'neutral' as const };
}
export function resourceCapabilities(permissions: string[], authorConfirmed: boolean) {
  const has = (permission: string) => authorConfirmed && permissions.includes(permission);
  return {
    read: permissions.includes('resources.read'),
    edit: has('resources.update'), duplicate: has('resources.create'), remove: has('resources.delete'),
    assign: has('resources.assign'), convert: has('resources.assign') && has('evaluations.create'),
    solutions: has('resources.read'), openActivity: permissions.includes('evaluations.read'),
  };
}
/** Navigation hints never grant access and are accepted only for the current account. */
export function resourceReturnPath(origin: unknown, accountId: string | undefined): string {
  const fallback = '/app/herramientas';
  if (!origin || typeof origin !== 'object' || !accountId) return fallback;
  const value = origin as Record<string, unknown>;
  if (value.accountId !== accountId || typeof value.path !== 'string') return fallback;
  if (/^\/app\/materias\/[a-zA-Z0-9-]+\/recursos$/.test(value.path)) return value.path;
  if (!/^\/app\/herramientas(?:\?|$)/.test(value.path)) return fallback;
  const url = new URL(value.path, 'https://internal.invalid');
  if ([...url.searchParams.keys()].some(key => !['q', 'materia', 'tipo'].includes(key))) return fallback;
  return url.pathname + url.search;
}
export const resourceLinkClass = 'focus-ring inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-surface-2';
