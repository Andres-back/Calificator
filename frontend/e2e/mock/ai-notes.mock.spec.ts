import { expect, test } from '@playwright/test';
import { login } from '../fixtures/explainableGrading';

// Spec 213: el docente ve qué anotó la IA, en la pregunta que nombra, y no un aviso genérico.
const base = { respuesta_referencia: 'Luz, agua y dióxido de carbono', puntos_maximos: 2.5, evidencia_paginas: [1] };
const breakdown = {
  id: 'd1', calificacion_id: 'c1', version: 1, origen: 'automatico', cobertura_estado: 'completa', requiere_revision: false,
  created_at: '2026-11-22T00:00:00Z', claves_liberadas: true, bloqueos: [],
  formula: { puntos_obtenidos: 5, puntos_posibles: 5, nota_maxima: 5, nota_base: 5, ajuste_global: 0, nota_antes_redondeo: 5, regla_redondeo: 'half_up', decimales: 2, nota_final: 5 },
  componentes: [
    { ...base, id: 'q1', clave: 'pregunta:1', orden: 0, tipo: 'pregunta', numero: '1', titulo: 'Explica la fotosíntesis',
      respuesta_estudiante: 'La planta usa la luz y el agua para hacer su alimento.', puntos_obtenidos: 2.5, estado: 'correcta',
      origen: 'modelo_principal', requiere_revision: false, explicacion: 'Explica la luz y el agua.',
      valoraciones: [{ evaluador: 'A', estado: 'correcta', puntaje: 2.5, confianza: 0.9 }, { evaluador: 'B', estado: 'parcial', puntaje: 1, confianza: 0.8 }] },
    { ...base, id: 'q2', clave: 'pregunta:2', orden: 1, tipo: 'pregunta', numero: '2', titulo: 'Nombra dos partes de la planta',
      respuesta_estudiante: 'Raíz y tallo.', puntos_obtenidos: 2.5, estado: 'correcta', origen: 'consenso_ia', requiere_revision: false,
      explicacion: 'Nombra dos partes correctas.',
      valoraciones: [{ evaluador: 'A', estado: 'correcta', puntaje: 2.5, confianza: 0.95 }, { evaluador: 'B', estado: 'correcta', puntaje: 2.5, confianza: 0.95 }] },
  ],
};

for (const viewport of [{ width: 390, height: 844 }, { width: 1366, height: 900 }]) {
  test(`213 notas de la IA con su texto ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await login(page, 'profesor');
    await page.route('**/api/calificaciones/c1/detalle', (route) => route.fulfill({ json: {
      id: 'c1', evaluacion_id: 'e1', estudiante_id: 's1', materia_id: 'm1',
      estudiante_nombre: 'Estudiante de prueba', evaluacion_nombre: 'Organización de una planta', materia_nombre: 'Naturales',
      nota_sugerida: 5, nota_confirmada: null, nota_maxima: 5, confianza: 0.9, feedback: 'Explicas bien la fotosíntesis.',
      estado: 'sugerida', revisado_por_docente: false, timeline: [], guia_revision: [],
      resultado_json: {
        grader_a: { alertas: ['P2: la letra de la segunda línea es tenue, pero se lee «tallo».'], requiere_revision_docente: false },
        grader_b: { alertas: ['P1: menciona luz y agua pero omite el dióxido de carbono.', 'Suma verificada dígito a dígito: 3.5/5.0.'], requiere_revision_docente: true },
      },
      entrega_tipo: 'foto', entrega_archivo_url: '/api/evidencia-prueba', entrega_evidencia_paginas: 1,
      desglose: breakdown, created_at: '2026-11-22T00:00:00Z', updated_at: '2026-11-22T00:00:00Z',
    } }));
    await page.route('**/api/evidencia-prueba/paginas/1', (route) => route.fulfill({ contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="white"/></svg>' }));
    await page.goto('/app/calificaciones?evaluacion=e1&calificacion=c1');
    const detail = page.getByTestId('grade-review-scroll');
    const summary = detail.getByRole('region', { name: 'Resumen de revisión' });

    await expect(summary).toContainText('Pregunta 1 necesita tu revisión.');
    await summary.getByText('Ver todos los avisos').click();
    await expect(summary).toContainText('El verificador anotó: «Suma verificada dígito a dígito: 3.5/5.0.»');
    await expect(detail.getByText('Hay información que debes comprobar antes de confirmar la nota.')).toHaveCount(0);
    await expect(detail.getByText('La segunda revisión de IA encontró algo que debes comprobar.')).toHaveCount(0);
    if (process.env.SHOTS_DIR) await page.screenshot({ path: `${process.env.SHOTS_DIR}/213-resumen-${viewport.width}.png`, fullPage: false });

    await page.goto('/app/calificaciones?evaluacion=e1&calificacion=c1&pregunta=pregunta%3A1');
    await expect(detail.getByText('El verificador anotó: «P1: menciona luz y agua pero omite el dióxido de carbono.»').first()).toBeVisible();
    await expect(detail.getByText('El verificador propuso 1 punto; se usó la valoración del modelo principal').first()).toBeVisible();
    if (process.env.SHOTS_DIR) await page.screenshot({ path: `${process.env.SHOTS_DIR}/213-pregunta-${viewport.width}.png`, fullPage: false });

    await page.goto('/app/calificaciones?evaluacion=e1&calificacion=c1&pregunta=pregunta%3A2');
    await expect(detail.getByText('El modelo principal anotó: «P2: la letra de la segunda línea es tenue, pero se lee «tallo».»').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
  });
}
