import { describe, expect, it } from 'vitest';
import { filterResources, resourceState, resourceCapabilities, resourceReturnPath, mergeResourcePages } from './resourcePresentationModel';
import type { MaterialListItem } from '@/types/api';

const item = (id: string, extra = {}): MaterialListItem => ({ id, titulo: 'Guía de fracciones', tipo: 'guia', materia_id: 'math', materia_nombre: 'Matemáticas', archivo_url: null, created_at: '', ...extra });

describe('resource presentation contracts', () => {
  it('combines text, subject and type including unassigned resources without changing data', () => {
    const resources = [item('1'), item('2', { materia_id: null, materia_nombre: null })];
    expect(filterResources(resources, { query: 'FRACCIONES', subject: 'none', type: 'guia' }).map(r => r.id)).toEqual(['2']);
    expect(filterResources(resources, { query: '', subject: 'math', type: 'cuento' })).toEqual([]);
    expect(resources[0].titulo).toBe('Guía de fracciones');
  });
  it('keeps lifecycle labels consistent and merges overlapping pages once', () => {
    expect(resourceState(item('1')).label).toBe('Borrador');
    expect(resourceState(item('1', { asignacion_tipo: 'apoyo', publicado_estudiantes: true })).label).toBe('Apoyo visible');
    expect(resourceState(item('1', { asignacion_tipo: 'actividad', publicado_estudiantes: true, evaluacion_recepcion_habilitada: false })).label).toBe('Actividad · entregas cerradas');
    expect(mergeResourcePages([[item('1')], [item('1'), item('2')]]).map(r => r.id)).toEqual(['1', '2']);
  });
  it('requires confirmed authorship, not an admin role or permission alone', () => {
    const permissions = ['resources.read', 'resources.update', 'resources.create', 'resources.assign', 'resources.delete', 'evaluations.create'];
    expect(resourceCapabilities(permissions, false).edit).toBe(false);
    expect(resourceCapabilities(permissions, false).solutions).toBe(false);
    expect(resourceCapabilities(permissions, true).convert).toBe(true);
    expect(resourceCapabilities(['resources.assign'], true).convert).toBe(false);
    expect(resourceCapabilities(['resources.read'], true).solutions).toBe(true);
  });
  it('accepts only internal origin paths belonging to the current account', () => {
    expect(resourceReturnPath({ accountId: 'a', path: '/app/herramientas?q=sol' }, 'a')).toBe('/app/herramientas?q=sol');
    for (const path of ['https://evil.test', '//evil.test', '/app/admin', '/app/herramientas/nuevo', '/app/herramientas?redirect=evil']) {
      expect(resourceReturnPath({ accountId: 'a', path }, 'a')).toBe('/app/herramientas');
    }
    expect(resourceReturnPath({ accountId: 'a', path: '/app/materias/math/recursos' }, 'b')).toBe('/app/herramientas');
    expect(resourceReturnPath({ accountId: 'a', path: '/app/materias/math/recursos' }, 'a')).toBe('/app/materias/math/recursos');
  });
});
