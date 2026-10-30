import { expect, test, type Page } from '@playwright/test';
import { login } from './fixtures/explainableGrading';

const permissions = ['subjects.read', 'evaluations.read', 'evaluations.update', 'grading.read', 'grading.grade'];
const questions = Array.from({ length: 9 }, (_, i) => ({ clave: `p${i + 1}`, numero: String(i + 1), titulo: `Pregunta ${i + 1}: explica la respuesta con una razón concreta`, tipo: i < 7 ? 'opcion_multiple' : 'abierta', puntaje: i === 8 ? '.52' : '.56', seccion_id: i < 5 ? 'a' : 'b', seccion_titulo: i < 5 ? 'Primera sección' : 'Segunda sección' }));

async function installScoreMocks(page: Page) {
    let definition = { preguntas: questions, plan: { schema_version: 1, modo: 'total', grupos: [{ id: 'total', titulo: 'Todas', claves: questions.map(q => q.clave), presupuesto: '5', fijados: {} }] }, nota_maxima: '5', updated_at: '2026-10-30T00:00:00', contenido_version_id: null, definition_fingerprint: 'a'.repeat(64) };
    const effects = { saves: 0, applies: 0 };
    await page.route('**/api/evaluaciones/e1/reparto', route => {
      if (route.request().method() === 'PUT') {
        effects.saves++; definition = { ...definition, plan: route.request().postDataJSON().plan };
      }
      return route.fulfill({ json: definition });
    });
    await page.route('**/api/evaluaciones/e1/reparto/notas/previsualizar?*', route => route.fulfill({ json: {
      definition_fingerprint: definition.definition_fingerprint, siguiente_cursor: null,
      aviso: 'Los ajustes manuales y pendientes se conservan. Los enlaces anteriores se pausan si cambia la nota.',
      resultados: [
        { calificacion_id: 'g1', nombre: 'Estudiante sintético', elegible: true, nota_actual: '3.04', nota_propuesta: '3.30', fingerprint: 'b'.repeat(64), motivo: null },
        { calificacion_id: 'g2', nombre: 'Decisión manual sintética', elegible: false, nota_actual: '4.80', nota_propuesta: null, fingerprint: null, motivo: 'Tiene un ajuste manual del docente. Se conserva.' },
      ],
    } }));
    await page.route('**/api/evaluaciones/e1/reparto/notas/aplicar', route => {
      effects.applies++; const request = route.request().postDataJSON();
      expect(request.confirmar).toBe(true); expect(request.selecciones).toEqual([{ calificacion_id: 'g1', fingerprint: 'b'.repeat(64) }]);
      return route.fulfill({ json: { request_id: request.request_id, definition_fingerprint: definition.definition_fingerprint, resultados: [{ calificacion_id: 'g1', estado: 'applied', nota_anterior: '3.04', nota_nueva: '3.30' }] } });
    });
    return effects;
}

async function openEditor(page: Page, width: number, theme: string) {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(mode => localStorage.setItem('xc-theme', JSON.stringify({ state: { mode }, version: 0 })), theme);
    await login(page, 'profesor', { permissions });
    const effects = await installScoreMocks(page);
    await page.goto('/app/materias/m1/evaluaciones');
    await page.getByText('Más opciones', { exact: true }).click();
    await page.getByRole('button', { name: 'Repartir puntos', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Repartir puntos', exact: true });
    await expect(dialog.getByLabel('Forma de repartir')).toBeVisible();
    if (width === 390 && theme === 'dark') await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    return { dialog, effects };
}

for (const width of [360, 390, 768, 1440]) for (const theme of ['light', 'dark']) {
  test(`137 guardar reparto por bloques conserva notas ${width}px ${theme}`, async ({ page }, info) => {
    const { dialog, effects } = await openEditor(page, width, theme);
    await dialog.getByLabel('Forma de repartir').selectOption('bloques');
    await dialog.getByLabel('Hasta posición bloque 1').fill('5');
    await dialog.getByLabel('Puntos del bloque 1').fill('2');
    await expect(dialog.getByRole('button', { name: 'Guardar reparto', exact: true })).toBeDisabled();
    await dialog.getByRole('button', { name: 'Añadir bloque' }).click();
    await dialog.getByLabel('Puntos del bloque 2').fill('3');
    await expect(dialog.getByTestId('proposal-p1')).toHaveText('0,4');
    await expect(dialog.getByTestId('proposal-p6')).toHaveText('0,75');
    await dialog.getByRole('checkbox', { name: 'Fijar posición 1', exact: true }).check();
    await dialog.getByLabel('Valor fijado posición 1', { exact: true }).fill('0,9');
    await expect(dialog.getByTestId('proposal-p2')).toHaveText('0,275');
    await expect(dialog.getByTestId('proposal-p6')).toHaveText('0,75');
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: `../output/playwright/137-puntajes/${info.project.name}-${width}-${theme}.png` });
    await dialog.getByRole('button', { name: 'Guardar reparto', exact: true }).click();
    await expect(dialog.getByText('Reparto guardado. Las notas anteriores no han cambiado.')).toBeVisible();
    expect(effects.saves).toBe(1); expect(effects.applies).toBe(0);
    await expect(dialog.getByRole('button', { name: 'Actualizar notas anteriores', exact: true })).toBeEnabled();
  });
  test(`137 actualizar notas requiere confirmación y conserva manuales ${width}px ${theme}`, async ({ page }) => {
    const { dialog, effects } = await openEditor(page, width, theme);
    await dialog.getByRole('button', { name: 'Actualizar notas anteriores', exact: true }).click();
    await expect(dialog.getByRole('checkbox', { name: 'Seleccionar Decisión manual sintética' })).toBeDisabled();
    await dialog.getByRole('checkbox', { name: 'Seleccionar Estudiante sintético', exact: true }).check();
    const selection = dialog.getByRole('checkbox', { name: 'Seleccionar Estudiante sintético', exact: true });
    await selection.focus(); await selection.press('Space'); await expect(selection).not.toBeChecked();
    await selection.press('Space'); await expect(selection).toBeChecked();
    await dialog.getByRole('button', { name: 'Revisar 1 cambios' }).click();
    expect(effects.applies).toBe(0);
    await dialog.getByRole('button', { name: 'Confirmar actualización de 1 notas' }).click();
    await expect(dialog.getByText('1 actualizadas', { exact: true })).toBeVisible();
    expect(effects.applies).toBe(1); expect(effects.saves).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
