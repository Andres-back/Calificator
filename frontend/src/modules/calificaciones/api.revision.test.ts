import { afterEach, describe, expect, it, vi } from 'vitest';

import { marcarRevisionManual } from './api';

const transport = vi.hoisted(() => ({ patch: vi.fn() }));

vi.mock('@/lib/api', () => ({ api: transport }));

afterEach(() => vi.clearAllMocks());

describe('manual grading review API', () => {
  it('marks the grade for manual review without sending a replacement score', async () => {
    const grade = { id: 'grade-1', estado: 'requiere_revision', nota_sugerida: 4 };
    transport.patch.mockResolvedValue({ data: grade });

    await expect(
      marcarRevisionManual('grade-1', 'Comprobar el procedimiento.'),
    ).resolves.toBe(grade);

    expect(transport.patch).toHaveBeenCalledWith(
      '/calificaciones/grade-1/revision-manual',
      { motivo: 'Comprobar el procedimiento.' },
    );
    expect(transport.patch.mock.calls[0][1]).not.toHaveProperty('nota_confirmada');
  });
});
