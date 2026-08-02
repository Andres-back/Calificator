import { afterEach, describe, expect, it, vi } from 'vitest';

import { convertToEvaluacion, listMaterialEvaluaciones } from './api';


const transport = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@/lib/api', () => ({ api: transport }));

afterEach(() => vi.clearAllMocks());


describe('generated material assignment API', () => {
  it('converts through the canonical evaluation resource with modality and attempt policy', async () => {
    const evaluation = {
      id: 'evaluation-1',
      material_origen_id: 'material-1',
      estado: 'borrador',
      modalidad: 'mixta',
    };
    const payload = {
      materia_id: 'subject-1',
      nombre: 'Actividad de multiplicacion',
      nota_maxima: 5,
      modalidad: 'mixta' as const,
      politica_intento: 'multiples_intentos' as const,
      intentos_permitidos: 2,
      tiempo_limite_minutos: 40,
    };
    transport.post.mockResolvedValue({ data: evaluation });

    await expect(convertToEvaluacion('material-1', payload)).resolves.toBe(evaluation);

    expect(transport.post).toHaveBeenCalledWith(
      '/herramientas/material-1/convertir-evaluacion',
      payload,
    );
  });

  it('lists the canonical evaluations already created from the material', async () => {
    const evaluations = [
      { id: 'evaluation-1', material_origen_id: 'material-1' },
    ];
    transport.get.mockResolvedValue({ data: evaluations });

    await expect(listMaterialEvaluaciones('material-1')).resolves.toBe(evaluations);
    expect(transport.get).toHaveBeenCalledWith(
      '/herramientas/material-1/evaluaciones',
    );
  });
});
