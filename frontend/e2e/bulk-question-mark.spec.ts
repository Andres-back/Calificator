import { expect, test, type Page } from '@playwright/test';
import { login } from './fixtures/explainableGrading';

// Spec 215: el docente marca varias preguntas a la vez, en celular y en computador.

type Component = Record<string, unknown> & { id: string; puntos_obtenidos: number | null; puntos_maximos: number; estado: string };
type Breakdown = { version: number; formula: Record<string, number | string>; componentes: Component[] } & Record<string, unknown>;

function component(number: number, estado: string, puntos: number | null): Component {
  return {
    id: `q${number}`, clave: `pregunta:${number}`, orden: number - 1, tipo: 'pregunta', numero: String(number),
    titulo: `Pregunta ${number}: explica cómo obtuviste el resultado`, respuesta_estudiante: `Respuesta ${number}`,
    respuesta_referencia: `Referencia ${number}`, referencia_oculta: false, puntos_obtenidos: puntos, puntos_maximos: 1, estado,
    explicacion: estado === 'no_evaluable' ? 'La foto no deja leer la respuesta con seguridad.' : 'Valoración de la IA.',
    orientacion_mejora: estado === 'correcta' ? null : 'Relee la pregunta y compara tu resultado.',
    origen: 'consenso_ia', requiere_revision: estado === 'no_evaluable', evidencia_paginas: [], valoraciones: [],
  };
}

const components = [
  component(1, 'correcta', 1), component(2, 'no_evaluable', null), component(3, 'no_evaluable', null), component(4, 'incorrecta', 0),
  component(5, 'no_evaluable', null), component(6, 'correcta', 1), component(7, 'incorrecta', 0), component(8, 'correcta', 1),
];
const breakdown: Breakdown = {
  id: 'd1', calificacion_id: 'c1', version: 1, origen: 'automatico', cobertura_estado: 'incompleta',
  requiere_revision: true, created_at: '2026-08-21T00:00:00Z', claves_liberadas: true,
  formula: { puntos_obtenidos: 3, puntos_posibles: 8, nota_maxima: 5, nota_base: 1.88, ajuste_global: 0, nota_antes_redondeo: 1.875, regla_redondeo: 'half_up', decimales: 2, nota_final: 1.88 },
  componentes: components,
};

type Change = { componente_id: string; puntos_obtenidos: number; estado: string; motivo_interno: string; explicacion_estudiante: string };

function applied(current: Breakdown, changes: Change[]): Breakdown {
  const next = current.componentes.map((item) => {
    const change = changes.find((entry) => entry.componente_id === item.id);
    return change ? { ...item, puntos_obtenidos: change.puntos_obtenidos, estado: change.estado, explicacion: change.explicacion_estudiante, origen: 'docente', requiere_revision: false, orientacion_mejora: change.estado === 'correcta' ? null : item.orientacion_mejora } : item;
  });
  const earned = next.reduce((sum, item) => sum + Number(item.puntos_obtenidos ?? 0), 0);
  const final = Number(((earned / 8) * 5).toFixed(2));
  return { ...current, version: current.version + 1, origen: 'docente', componentes: next, formula: { ...current.formula, puntos_obtenidos: earned, nota_base: final, nota_antes_redondeo: final, nota_final: final } };
}

async function openReview(page: Page) {
  await login(page, 'profesor', { breakdown, gradeOverride: { estado: 'requiere_revision', nota_sugerida: 1.88, nota_confirmada: null, revisado_por_docente: false } });
  const detail = page.waitForResponse((response) => new URL(response.url()).pathname.endsWith('/calificaciones/c1/detalle'));
  await page.goto('/app/calificaciones?evaluacion=e1&calificacion=c1');
  const original = await (await detail).json();
  const saves: { version_esperada: number; cambios_componentes: Change[] }[] = [];
  let saved: Breakdown | null = null;
  await page.route('**/api/calificaciones/c1/desglose', async (route) => {
    if (route.request().method() !== 'PUT') return route.fallback();
    const body = route.request().postDataJSON();
    saves.push(body);
    saved = applied(saved ?? breakdown, body.cambios_componentes);
    return route.fulfill({ json: saved });
  });
  await page.route('**/api/calificaciones/c1/detalle', (route) => (saved ? route.fulfill({ json: { ...original, estado: 'ajustada', revisado_por_docente: true, desglose: saved } }) : route.fallback()));
  await page.getByRole('navigation', { name: 'Secciones de la calificación' }).getByRole('button', { name: 'Respuestas y puntajes', exact: true }).click();
  return saves;
}

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) test(`215 marcar varias preguntas ${width}px ${theme}`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 850 });
  await page.addInitScript((mode) => localStorage.setItem('xc-theme', JSON.stringify({ state: { mode }, version: 0 })), theme);
  const saves = await openReview(page);

  await page.getByRole('button', { name: 'Marcar varias preguntas', exact: true }).click();
  const chips = page.getByRole('group', { name: 'Preguntas para marcar' }).getByRole('checkbox');
  await expect(chips).toHaveCount(8);
  const panel = page.getByRole('group', { name: 'Marcar varias preguntas', exact: true });
  await expect(panel.getByRole('button', { name: 'Marcar correctas', exact: true })).toBeDisabled();

  for (const index of [1, 2, 4]) await chips.nth(index).click();
  await expect(panel.getByText('3 preguntas seleccionadas')).toBeVisible();
  await expect(chips.nth(1)).toHaveAttribute('aria-checked', 'true');
  await expect(chips.nth(0)).toHaveAttribute('aria-checked', 'false');
  // Tamaño táctil y sin desplazamiento lateral.
  for (const target of [...await chips.all(), ...await panel.getByRole('button').all()]) {
    const box = (await target.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await panel.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath(`215-seleccion-${width}-${theme}.png`) });

  await panel.getByRole('button', { name: 'Marcar correctas', exact: true }).click();
  await expect(panel.getByRole('status')).toHaveText('3 preguntas quedarán correctas: 2, 3 y 5.');
  await expect(panel.getByTestId('bulk-mark-preview')).toHaveText('Nota: 1.88 → 3.75');
  expect(saves).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath(`215-confirmar-${width}-${theme}.png`) });

  await panel.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.getByText('3 preguntas marcadas como correctas. Nota recalculada.')).toBeVisible();
  expect(saves).toHaveLength(1);
  expect(saves[0].version_esperada).toBe(1);
  expect(saves[0].cambios_componentes.map((change) => [change.componente_id, change.estado, change.puntos_obtenidos])).toEqual([['q2', 'correcta', 1], ['q3', 'correcta', 1], ['q5', 'correcta', 1]]);
  expect(saves[0].cambios_componentes.every((change) => change.explicacion_estudiante === 'Tu profesor revisó esta respuesta y es correcta.' && change.motivo_interno === 'Marcada como correcta junto con otras preguntas.')).toBe(true);
  // Con la versión nueva vuelve la navegación normal.
  await expect(page.getByRole('navigation', { name: 'Preguntas y criterios' }).getByRole('button')).toHaveCount(8);
  await expect(page.getByRole('button', { name: 'Marcar varias preguntas', exact: true })).toBeVisible();
});

test('215 cancelar no guarda nada y al editar una pregunta no se ofrece el lote', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 });
  const saves = await openReview(page);

  await page.getByRole('button', { name: 'Marcar varias preguntas', exact: true }).click();
  await page.getByRole('group', { name: 'Preguntas para marcar' }).getByRole('checkbox').nth(3).click();
  const panel = page.getByRole('group', { name: 'Marcar varias preguntas', exact: true });
  await panel.getByRole('button', { name: 'Marcar incorrectas', exact: true }).click();
  await expect(panel.getByRole('status')).toHaveText('La pregunta 4 quedará incorrecta.');
  await panel.getByRole('button', { name: 'Volver', exact: true }).click();
  await panel.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Preguntas y criterios' })).toBeVisible();
  expect(saves).toEqual([]);

  await page.getByRole('button', { name: 'Ajustar puntaje y explicación', exact: true }).click();
  await expect(page.getByTestId('grade-component-editor')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Marcar varias preguntas', exact: true })).toHaveCount(0);
});

test('215 si la calificación cambió en otra revisión, no guarda y trae la versión vigente', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 });
  const saves = await openReview(page);
  // Registrada después: responde antes que la ruta que acepta el guardado.
  await page.route('**/api/calificaciones/c1/desglose', (route) => (route.request().method() === 'PUT'
    ? route.fulfill({ status: 409, json: { detail: 'El desglose cambió en otra sesión. Recarga y compara antes de guardar.' } })
    : route.fallback()));

  await page.getByRole('button', { name: 'Marcar varias preguntas', exact: true }).click();
  await page.getByRole('group', { name: 'Preguntas para marcar' }).getByRole('checkbox').nth(1).click();
  const panel = page.getByRole('group', { name: 'Marcar varias preguntas', exact: true });
  await panel.getByRole('button', { name: 'Marcar correctas', exact: true }).click();
  const refreshed = page.waitForResponse((response) => new URL(response.url()).pathname.endsWith('/calificaciones/c1/detalle'));
  await panel.getByRole('button', { name: 'Confirmar', exact: true }).click();

  await expect(page.getByText('La calificación cambió en otra revisión. No se guardó nada; vuelve a seleccionar las preguntas.')).toBeVisible();
  await refreshed;
  expect(saves).toEqual([]);
});
