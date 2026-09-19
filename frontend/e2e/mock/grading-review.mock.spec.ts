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
  await expect(page.getByText('1 con atención')).toBeVisible();
  await expect(page.getByText('1 bloqueada')).toBeVisible();
  await page.getByRole('button', { name: /Revisar primera excepción/ }).click();
  await expect(page).toHaveURL(/pregunta=pregunta%3A3/);
  await page.getByRole('button', { name: /Siguiente excepción/ }).click();
  await expect(page).toHaveURL(/pregunta=pregunta%3A2/);
  expect(mutations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
});
