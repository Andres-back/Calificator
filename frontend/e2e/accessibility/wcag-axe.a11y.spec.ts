import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { login } from '../fixtures/explainableGrading';
import { openEvidenceEditor } from '../fixtures/evidenceEdit';

/**
 * Spec 211: revisión automática de reglas WCAG 2.2 A y AA (axe) en las pantallas principales.
 * Criterios en docs/accesibilidad-usabilidad.md. Usa la API simulada del entorno de pruebas.
 */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

type Screen = { name: string; open: (page: Page) => Promise<void> };

const screens: Screen[] = [
  { name: 'inicio de sesión', open: async (page) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /Iniciar sesi.n/i })).toBeVisible();
  } },
  { name: 'inicio del docente', open: async (page) => {
    await login(page, 'profesor');
  } },
  { name: 'materia del docente', open: async (page) => {
    await login(page, 'profesor');
    await page.goto('/app/materias/m1');
    await expect(page.locator('main#main-content').getByRole('heading', { level: 1 })).toBeVisible();
  } },
  { name: 'revisión de una calificación', open: async (page) => {
    await login(page, 'profesor', { rosterSize: 3 });
    await page.goto('/app/calificaciones/workspace/e1');
    await page.getByText('Estudiante Prueba', { exact: true }).click();
    await expect(page.getByRole('heading', { name: '1. Nota y explicación' })).toBeVisible();
  } },
  // Spec 215: el modo de marcar varias preguntas, con dos seleccionadas.
  { name: 'marcar varias preguntas', open: async (page) => {
    await login(page, 'profesor', { questionCount: 8 });
    await page.goto('/app/calificaciones?evaluacion=e1&calificacion=c1');
    await page.getByRole('navigation', { name: 'Secciones de la calificación' }).getByRole('button', { name: 'Respuestas y puntajes', exact: true }).click();
    await page.getByRole('button', { name: 'Marcar varias preguntas', exact: true }).click();
    const chips = page.getByRole('group', { name: 'Preguntas para marcar' }).getByRole('checkbox');
    await chips.nth(1).click();
    await chips.nth(2).click();
    await expect(page.getByText('2 preguntas seleccionadas')).toBeVisible();
  } },
  // Spec 217: «Editar hojas», con una hoja quitada y la opción de deshacer a la vista.
  { name: 'editar hojas de la evidencia', open: async (page) => {
    const dialog = await openEvidenceEditor(page);
    await dialog.getByRole('button', { name: 'Quitar hoja 2' }).click();
    await expect(dialog.getByRole('button', { name: 'Deshacer', exact: true })).toBeVisible();
  } },
  { name: 'retroalimentación del estudiante', open: async (page) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await login(page, 'estudiante');
    await page.goto('/app/evaluaciones/e1/resolver');
    await expect(page.getByRole('region', { name: 'Tu retroalimentación, paso a paso' })).toBeVisible();
  } },
];

for (const screen of screens) for (const theme of ['light', 'dark'] as const) for (const viewport of [
  { width: 390, height: 844 },
  { width: 1366, height: 900 },
]) {
  test(`211 ${screen.name} cumple WCAG A y AA (${theme}, ${viewport.width}px)`, async ({ page }) => {
    await page.setViewportSize(viewport);
    // El tema se fija antes de cargar: medir el contraste en plena transición de colores da falsos positivos.
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await page.addInitScript((dark) => {
      try { localStorage.setItem('xc-theme', JSON.stringify({ state: { mode: dark ? 'dark' : 'light' }, version: 0 })); } catch { /* sin almacenamiento */ }
    }, theme === 'dark');
    await screen.open(page);
    await page.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), theme === 'dark');
    await page.waitForTimeout(800);
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    const violations = results.violations.map((violation) => ({
      regla: violation.id,
      impacto: violation.impact,
      descripcion: violation.help,
      elementos: violation.nodes.slice(0, 5).map((node) => `${node.target.join(' ')} :: ${node.failureSummary?.split('\n').slice(1, 2).join(' ').trim() ?? ''}`),
      total: violation.nodes.length,
    }));
    if (process.env.AXE_REPORT) console.log(JSON.stringify({ pantalla: screen.name, theme, ancho: viewport.width, violations }));
    expect(violations, `${screen.name} (${theme}, ${viewport.width}px)`).toEqual([]);
  });
}
