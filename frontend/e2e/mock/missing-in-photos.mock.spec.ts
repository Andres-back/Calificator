import { expect, test } from '@playwright/test';
import { login } from '../fixtures/explainableGrading';

// Spec 207: las respuestas que no aparecen en las fotos se nombran y llevan a la evidencia.
const base = {
  respuesta_referencia: 'Referencia', puntos_maximos: 1.67, evidencia_paginas: [1],
};
const pendiente = (numero: string) => ({
  ...base, id: `q${numero}`, clave: `pregunta:${numero}`, orden: Number(numero) - 1, tipo: 'pregunta', numero, titulo: `Pregunta ${numero}`,
  respuesta_estudiante: '', puntos_obtenidos: null, estado: 'revision_pendiente', origen: 'consenso_ia', requiere_revision: true,
  explicacion: 'La valoración de esta respuesta no tiene consenso verificable; el docente debe revisar la evidencia y la clave.',
  valoraciones: [{ evaluador: 'A', estado: 'sin_respuesta', puntaje: 0, confianza: 0.5 }, { evaluador: 'B', estado: 'no_evaluable', puntaje: 0 }],
});
const breakdown = {
  id: 'd1', calificacion_id: 'c1', version: 2, origen: 'automatico', cobertura_estado: 'parcial', requiere_revision: true,
  created_at: '2026-11-20T00:00:00Z', claves_liberadas: true,
  formula: { puntos_obtenidos: 1.67, puntos_posibles: 5, nota_maxima: 5, nota_base: 1.67, ajuste_global: 0, nota_antes_redondeo: 1.67, regla_redondeo: 'half_up', decimales: 2, nota_final: 1.67 },
  bloqueos: ['componente_pendiente:pregunta:2', 'componente_pendiente:pregunta:3', 'cobertura_evidencia_incompleta'],
  componentes: [
    { ...base, id: 'q1', clave: 'pregunta:1', orden: 0, tipo: 'pregunta', numero: '1', titulo: 'Pregunta 1', respuesta_estudiante: 'La planta no podría hacer la fotosíntesis.',
      puntos_obtenidos: 1.67, estado: 'correcta', origen: 'consenso_ia', requiere_revision: false, explicacion: 'Responde lo que pasaría sin luz.',
      valoraciones: [{ evaluador: 'A', estado: 'correcta', puntaje: 1.67, confianza: 0.95 }, { evaluador: 'B', estado: 'correcta', puntaje: 1.67, confianza: 0.95 }] },
    pendiente('2'), pendiente('3'),
  ],
};

for (const viewport of [{ width: 390, height: 844 }, { width: 1366, height: 900 }]) {
  test(`207 respuestas que no aparecen en las fotos ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await login(page, 'profesor');
    await page.route('**/api/calificaciones/c1/detalle', (route) => route.fulfill({ json: {
      id: 'c1', evaluacion_id: 'e1', estudiante_id: 's1', materia_id: 'm1',
      estudiante_nombre: 'Estudiante de prueba', evaluacion_nombre: 'Organización de una planta', materia_nombre: 'Naturales',
      nota_sugerida: 1.67, nota_confirmada: null, nota_maxima: 5, confianza: 0.5, feedback: 'Revisa las preguntas 2 y 3.',
      estado: 'requiere_revision', revisado_por_docente: false, timeline: [], guia_revision: [],
      resultado_json: { evidence_coverage: { cobertura: 0.333, esperadas: [1, 2, 3], faltantes: [2, 3], detectadas: [1], requiere_revision: true } },
      entrega_tipo: 'foto', entrega_archivo_url: '/api/evidencia-prueba', entrega_evidencia_paginas: 1,
      desglose: breakdown, created_at: '2026-11-20T00:00:00Z', updated_at: '2026-11-20T00:00:00Z',
    } }));
    await page.route('**/api/evidencia-prueba/paginas/1', (route) => route.fulfill({ contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="white"/></svg>' }));
    await page.goto('/app/calificaciones?evaluacion=e1&calificacion=c1');
    const detail = page.getByTestId('grade-review-scroll');

    const alert = detail.getByRole('region', { name: 'Resumen de revisión' }).getByRole('alert');
    await expect(alert).toContainText('Las respuestas de las preguntas 2 y 3 no aparecen en las fotos.');
    await expect(alert).toContainText('añade esa foto en «Editar hojas»');
    await expect(detail.getByText('No están revisadas todas las preguntas de forma consistente.')).toHaveCount(0);
    await detail.getByText('Ver todos los avisos').click();
    await expect(detail.getByRole('button', { name: /Pregunta 2/ })).toBeVisible();
    if (process.env.SHOTS_DIR) await page.screenshot({ path: `${process.env.SHOTS_DIR}/207-avisos-${viewport.width}.png`, fullPage: false });

    await alert.getByRole('button', { name: 'Añadir la foto que falta' }).click();
    await expect(detail.getByRole('img', { name: 'Hoja 1 de la evidencia del estudiante' })).toBeVisible();

    await page.goto('/app/calificaciones?evaluacion=e1&calificacion=c1&pregunta=pregunta%3A2');
    await expect(detail.getByText('Esta respuesta no aparece en las fotos de la entrega').first()).toBeVisible();
    if (process.env.SHOTS_DIR) await page.screenshot({ path: `${process.env.SHOTS_DIR}/207-pregunta-${viewport.width}.png`, fullPage: false });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
  });
}

for (const viewport of [{ width: 390, height: 844 }, { width: 1366, height: 900 }]) {
  test(`207 la foto no trae respuestas a la evaluación ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await login(page, 'profesor');
    const sinRespuestas = { ...breakdown,
      bloqueos: ['componente_pendiente:pregunta:1', 'componente_pendiente:pregunta:2', 'componente_pendiente:pregunta:3', 'feedback_quality:componentes_o_evidencia_pendientes'],
      formula: { ...breakdown.formula, puntos_obtenidos: 0, nota_base: 0, nota_antes_redondeo: 0, nota_final: 0 },
      componentes: [{ ...pendiente('1'), valoraciones: [] }, { ...pendiente('2'), valoraciones: [] }, { ...pendiente('3'), valoraciones: [] }] };
    await page.route('**/api/calificaciones/c1/detalle', (route) => route.fulfill({ json: {
      id: 'c1', evaluacion_id: 'e1', estudiante_id: 's1', materia_id: 'm1',
      estudiante_nombre: 'Estudiante de prueba', evaluacion_nombre: 'Organización de una planta', materia_nombre: 'Naturales',
      nota_sugerida: null, nota_confirmada: null, nota_maxima: 5, confianza: 0, feedback: '',
      estado: 'requiere_revision', revisado_por_docente: false, timeline: [], guia_revision: [],
      resultado_json: { motivo_revision: 'image_not_usable', orchestrator: 'vision_failed',
        alertas: ['La hoja no contiene las preguntas 1-3 del contexto; es una página de apuntes sobre el proceso de la fotosíntesis.'] },
      entrega_tipo: 'foto', entrega_archivo_url: '/api/evidencia-prueba', entrega_evidencia_paginas: 1,
      desglose: sinRespuestas, created_at: '2026-11-20T00:00:00Z', updated_at: '2026-11-20T00:00:00Z',
    } }));
    await page.route('**/api/evidencia-prueba/paginas/1', (route) => route.fulfill({ contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="white"/></svg>' }));
    await page.goto('/app/calificaciones?evaluacion=e1&calificacion=c1');
    const detail = page.getByTestId('grade-review-scroll');
    const alert = detail.getByRole('region', { name: 'Resumen de revisión' }).getByRole('alert');

    await expect(alert).toContainText('La IA no encontró en las fotos respuestas a esta evaluación.');
    await expect(alert).toContainText('Lo que vio: «La hoja no contiene las preguntas 1-3 del contexto; es una página de apuntes sobre el proceso de la fotosíntesis.»');
    await expect(detail.getByText('Falta información para completar la revisión.')).toHaveCount(0);
    await alert.scrollIntoViewIfNeeded();
    if (process.env.SHOTS_DIR) await page.screenshot({ path: `${process.env.SHOTS_DIR}/207-sin-respuestas-${viewport.width}.png`, fullPage: false });
    await alert.getByRole('button', { name: 'Ver evidencia' }).click();
    await expect(detail.getByRole('img', { name: 'Hoja 1 de la evidencia del estudiante' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
  });
}
