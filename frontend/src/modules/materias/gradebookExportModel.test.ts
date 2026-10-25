import { expect, it } from 'vitest';
import type { Calificacion, Evaluacion } from '@/types/api';
import { buildGradeExport, exportCsvRows } from './gradebookExportModel';

const evaluations = [{ id: 'e', nombre: 'Lectura', nota_maxima: 5 }] as Evaluacion[];
const students = ['z', 'a', 'b', 'c', 'd', 'f'].map(id => ({ id, nombre: id === 'b' ? 'a' : id }));
const grade = (student: string, props: object) => ({ id: student, estudiante_id: student, ...props }) as Calificacion;
const grades = new Map([['e', [
  grade('z', { estado: 'ajustada', nota_confirmada: '4.25', nota_sugerida: 2 }),
  grade('a', { estado: 'confirmada', nota_confirmada: 0 }),
  grade('b', { estado: 'requiere_revision', nota_sugerida: '3.6' }),
  grade('c', { estado: 'procesando', nota_confirmada: 5, nota_sugerida: 5 }),
  grade('f', { estado: 'requiere_revision', nota_sugerida: 5, resultado_json: { pipeline_status: 'failed' } }),
]]]);

it('separates final/suggested/processing/error/missing without losing zero or adjusted scores', () => {
  const report = buildGradeExport(students, evaluations, grades);
  expect(report.counts).toEqual({ final: 2, suggested: 1, processing: 1, missing: 1, error: 1 });
  expect(report.rows.map(row => row.id)).toEqual(['a', 'b', 'c', 'd', 'f', 'z']);
  expect(exportCsvRows(report, 'final')).toEqual([
    ['Nombre del estudiante', 'Lectura'], ['a', '0'], ['a', ''], ['c', ''], ['d', ''], ['f', ''], ['z', '4,25'],
  ]);
  expect(exportCsvRows(report, 'provisional')).toEqual([
    ['Nombre del estudiante', 'Lectura · Nota provisional', 'Lectura · Estado'],
    ['a', '0', 'Confirmada'], ['a', '3,6', 'Sugerida · pendiente de revisión'], ['c', '', 'Calificando'],
    ['d', '', 'Sin nota'], ['f', '', 'Requiere reintento'], ['z', '4,25', 'Ajustada'],
  ]);
});
it('uses only current API attempts and rejects duplicate unresolved attempts rather than guessing by date', () => {
  expect(() => buildGradeExport(students, evaluations, new Map([['e', [grade('a', { estado: 'publicada', nota_confirmada: 3 }), grade('a', { estado: 'publicada', nota_confirmada: 4 })]]]))).toThrow(/intentos/);
});
it('ignores annulled grades and rejects invalid or out-of-scale numeric values', () => {
  const report = buildGradeExport(students, evaluations, new Map([['e', [
    grade('a', { estado: 'anulada', nota_confirmada: 5 }), grade('b', { estado: 'publicada', nota_confirmada: 99 }),
    grade('c', { estado: 'confirmada', nota_confirmada: ' ' }), grade('f', { estado: 'sugerida', nota_sugerida: -1 }),
  ]]]));
  expect(report.counts.final).toBe(0);
  expect(report.counts.suggested).toBe(0);
});
it('disambiguates headings without identifying homonyms by their name', () => {
  const scope = [evaluations[0], { ...evaluations[0], id: 'e2' }, { ...evaluations[0], id: 'e3', nombre: 'Lectura (1)' }];
  const report = buildGradeExport(students, scope, grades);
  expect(exportCsvRows(report, 'final')[0]).toEqual(['Nombre del estudiante', 'Lectura (2)', 'Lectura (3)', 'Lectura (1)']);
});
it('preserves a teacher decision despite warnings retained from the original failed analysis', () => {
  const report = buildGradeExport(students, evaluations, new Map([['e', [grade('a', {
    estado: 'publicada', nota_confirmada: 3.25, revisado_por_docente: true, resultado_json: { pipeline_status: 'failed' },
  })]]]));
  expect(report.counts.final).toBe(1);
  expect(exportCsvRows(report, 'final')).toContainEqual(['a', '3,25']);
});
