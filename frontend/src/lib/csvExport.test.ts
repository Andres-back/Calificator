import { expect, it, vi } from 'vitest';
import { csvText, downloadCsv } from './csvExport';
it('preserves accents and neutralizes spreadsheet formulas', () => {
  const text = csvText([['Nombre', 'Nota'], ['Muñoz; "Ana"\nPérez', 0], [' \t=1+1', '+SUM(A1)'], ['@alumno', '-cmd']]);
  expect(text.startsWith('\uFEFF')).toBe(true);
  expect(text).toContain('"Muñoz; ""Ana""\nPérez";0');
  expect(text).toContain("' \t=1+1;'+SUM(A1)");
  expect(text).toContain("'@alumno;'-cmd");
});
it('downloads CSV and releases its private URL', () => {
  vi.useFakeTimers();
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  downloadCsv('../Notas: clase', [['Nombre', 'Nota'], ['Alumno', '4,5']]);
  expect(click).toHaveBeenCalledOnce();
  vi.runAllTimers();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  expect(document.querySelector('a[download]')).toBeNull();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
