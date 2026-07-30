import { describe, expect, it } from 'vitest';
import { TOOLS } from './meta';
import {
  filterTools,
  goalForTool,
  isGradableTool,
  MATERIAL_CREATION_TOOLS,
} from './toolPickerModel';

describe('toolPickerModel', () => {
  it('asigna cada herramienta a una intención docente', () => {
    const mapped = TOOLS.map((tool) => goalForTool(tool.tipo));
    expect(mapped).toHaveLength(TOOLS.length);
    expect(mapped.every(Boolean)).toBe(true);
  });

  it('filtra formatos de evaluación sin mezclar juegos', () => {
    const result = filterTools(TOOLS, { goal: 'evaluar', search: '' });
    expect(result.map((tool) => tool.tipo)).toEqual([
      'examen',
      'rubrica',
      'quiz_rapido',
    ]);
  });

  it('deja examen, quiz y rúbrica fuera del creador de materiales', () => {
    expect(MATERIAL_CREATION_TOOLS.some((tool) => isGradableTool(tool.tipo))).toBe(false);
    expect(MATERIAL_CREATION_TOOLS.map((tool) => tool.tipo)).not.toContain('examen');
  });

  it('busca sin exigir tildes ni mayúsculas', () => {
    const result = filterTools(TOOLS, {
      goal: 'todos',
      search: 'GUIA',
    });
    expect(result.map((tool) => tool.tipo)).toContain('guia');
  });

  it('combina intención y texto de búsqueda', () => {
    const result = filterTools(TOOLS, {
      goal: 'jugar',
      search: 'palabras',
    });
    expect(result.map((tool) => tool.tipo)).toContain('crucigrama');
    expect(result.every((tool) => goalForTool(tool.tipo) === 'jugar')).toBe(
      true,
    );
  });
});
