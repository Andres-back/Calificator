import { expect, test } from '@playwright/test';
import { login } from '../fixtures/explainableGrading';

const base = {
  clave: 'pregunta:1', orden: 0, tipo: 'pregunta', numero: '1', titulo: 'Pregunta 1',
  respuesta_estudiante: '24', respuesta_referencia: '24', puntos_obtenidos: 1, puntos_maximos: 1,
  estado: 'correcta', explicacion: 'Explicación verificable.', origen: 'objetivo', requiere_revision: false,
  evidencia_paginas: [1], valoraciones: [],
};

const breakdown = {
  id: 'd1', calificacion_id: 'c1', version: 1, origen: 'automatico', cobertura_estado: 'completa',
  requiere_revision: true, created_at: '2026-09-19T00:00:00Z', claves_liberadas: true,
  formula: { puntos_obtenidos: 2, puntos_posibles: 3, nota_maxima: 5, nota_base: 3.33, ajuste_global: 0, nota_antes_redondeo: 3.33, regla_redondeo: 'half_up', decimales: 2, nota_final: 3.33 },
  componentes: [
    { ...base, id: 'safe', clave: 'pregunta:1' },
    { ...base, id: 'attention', clave: 'pregunta:2', orden: 1, numero: '2', titulo: 'Pregunta 2', origen: 'consenso_ia', explicacion: '', valoraciones: [] },
    { ...base, id: 'blocked', clave: 'pregunta:3', orden: 2, numero: '3', titulo: 'Pregunta 3', estado: 'ilegible', puntos_obtenidos: null, requiere_revision: true },
  ],
};

test('prioriza excepciones en móvil sin confirmar ni publicar automáticamente', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const mutations: string[] = [];
  page.on('request', (request) => {
    if (request.method() !== 'GET' && /confirmar|ajustar|publicar/.test(request.url())) mutations.push(request.url());
  });
  await login(page, 'profesor', { breakdown });
  await page.goto('/app/calificaciones/workspace/e1');
  await page.getByText('Estudiante Prueba', { exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Revisa primero las excepciones' })).toBeVisible();
  await expect(page.getByText('1 por revisar')).toBeVisible();
  await expect(page.getByText('1 bloqueada')).toBeVisible();
  await page.getByRole('button', { name: /Revisar primera excepción/ }).click();
  await expect(page).toHaveURL(/pregunta=pregunta%3A3/);
  await page.getByRole('button', { name: /Siguiente excepción/ }).click();
  await expect(page).toHaveURL(/pregunta=pregunta%3A2/);
  expect(mutations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
});

test('busca y selecciona estudiantes con fluidez en móvil', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await login(page, 'profesor');
  const roster = Array.from({ length: 24 }, (_, index) => ({
    id: `student-${index + 1}`,
    nombre: index === 19 ? 'Ángela Zambrano' : `Estudiante ${index + 1}`,
    email: `estudiante-${index + 1}@example.test`,
    rol: 'estudiante',
    estado: 'activo',
  }));
  const searchedTerms: string[] = [];
  await page.route('**/api/materias/m1/estudiantes', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ id: 'm1', nombre: 'Matemáticas', estudiantes: roster }),
  }));
  await page.route('**/api/evaluaciones/e1/revision**', (route) => {
    const url = new URL(route.request().url());
    const query = url.searchParams.get('q') ?? '';
    if (query) searchedTerms.push(query);
    const normalized = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const filtered = roster.filter((item) => item.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(normalized));
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        evaluacion_id: 'e1', materia_id: 'm1', total_alumnos: roster.length, siguiente_cursor: null,
        contadores: { todas: roster.length, pendientes: roster.length, alertas: 0, procesando: 0, publicadas: 0 },
        alumnos: filtered.map((item) => ({
          estudiante_id: item.id, nombre: item.nombre, calificacion_id: null, entrega_id: null, job_id: null,
          estado: 'sin_entrega', nota: null,
          resumen_revision: { version: null, cobertura: null, bloqueos: [], componentes_pendientes: 0, componentes_ilegibles: 0, pqrs_abiertas: null, tiene_alertas: false },
        })),
      }),
    });
  });

  await page.goto('/app/calificaciones/workspace/e1');
  const reviewSearch = page.getByRole('searchbox', { name: 'Buscar estudiante' });
  await reviewSearch.pressSequentially('angela', { delay: 25 });
  await expect.poll(() => searchedTerms).toEqual(['angela']);
  await expect(page.getByText('Ángela Zambrano')).toBeVisible();

  await page.getByRole('button', { name: 'Añadir entregas' }).click();
  const picker = page.getByRole('combobox', { name: /Buscar estudiante para esta entrega/i });
  await picker.fill('angela');
  await page.getByRole('option', { name: 'Ángela Zambrano' }).click();
  await expect(page.getByText('Seleccionado: Ángela Zambrano')).toBeVisible();
  await expect(page.getByRole('button', { name: /Elegir fotos o PDF/i })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
  await page.screenshot({ path: '../output/playwright/mobile-grading/student-search-360x800.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
  await page.screenshot({ path: '../output/playwright/mobile-grading/student-search-390x844.png', fullPage: true });
});
