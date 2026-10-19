import { expect, test, type Page } from '@playwright/test';

// Synthetic geometry and accounts only. No uploaded school documents or APIs.
const triangle = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAKAAAAB4CAIAAAD6wG44AAADSElEQVR4nO2csU4DMRBEkxO/REHvz3ZPwUcdEpEQHOSS89nemdmZIqIBredp36biuq7rxdHNEj2AMzYGLB4DFo8Bi8eAxWPA4jFg8RiweBIBLm8f//6snSyAyxfRv5/yyQL4O0m45gJc7kDNAFsfcNmlKM9YH/Am9f31kinigMvvBb3R3TDWXuIlG91b8jCWBXyUWRFlLAv44emtOY7xkk3OP5NB1IKAz3AqcowFAR9ScVUX9ZJTznlELQW4F5sixFgKcLN+q66ol8xyziBqEcAn6QozVgA8jkThZ6wAuONBrXLHmB5wFzkLi5ob8Jz2CzNjbsCDBFuFRE0MuLucJUXNCnh+44WTMSvgCVKtEqKmBDxUzmKi5gM8ja4GYzLACP0WgBlkAYecycp8jJkAT5azhqhpAKN1WsDmoQccrs3KKWoOwIFyZhc1AWDkHgvwbDSAoVRZ2USNDhhEzryihgYMSJeOMS5g5NaIpsUFvAnO+mLOQwYYVs50okYEjNkU6eSIgDfBXF/82UABU8iZSNRYgNHaEXgFFuBN8NcXf04gwHRyphA1CmBqusiMIQCDdCH5LgjAmzCuL+zk8YAF5Iws6mDA4e+Xf2P8BiutL+ArIgGLyRlT1GGAM8gZ4b0oilZaX6gXxQAWljOaqAMAJ6ELwng24GynN7yB4Busvb4Ib5wKOJWcQUQ9D7DlHNJGmKLzrG/seycBTivncFHPAGw5BzYToOic6xv19uGALedYUY8FbLrhjAcC9ulF6GreDfb6hrQxCrDlDCLqIYAtZ5zeZija6xvYTH/AljOUqDsDtpzROhyraK9veEs9AVvOgKLuBth0MRn3AezTOyJdWh1yg72+OL11AGw5I4v6LGDLeXRONtxZ0V5ftA5PAbac8UXdDthynpnmtrsp2uvbN736bARsObOIugWw6RIxPgzYpzc2R/s/e4O9vqNzsuFjgC1nOlEfAGw54+R5Fu2K9vrOTHPbzwK2nElF/RRgyxkzz3BpUbTXNyoNzT8GbDlTi/oBYNNlZ7wH2KeXJTukXnr9IQczdzfYLLlyj9d1XdeGX3OgsvPdCOXfCTuD8mCDHfZ4g8VjwOIxYPEYsHgMWDwGLB4DvmjnE3kZqS4c7I05AAAAAElFTkSuQmCC', 'base64');
const teacher = { id: 'visual-teacher', nombre: 'Docente de prueba', rol: 'profesor', email: 'visual@example.test', estado: 'activo', permissions: ['subjects.read', 'evaluations.read'] };
const subject = { id: 'visual-subject', profesor_id: teacher.id, nombre: 'Geometría', area: 'Matemáticas', grado: '5', estado: 'activa', estudiantes: [], codigo_matricula: 'VISUAL', codigo_activo: true, requiere_aprobacion: false };
const content = {
  schema_version: 1, pregunta_ids: ['question-a'], recurso_ids: ['triangle', 'table-image', 'private-page'], original_recurso_id: 'original',
  bloques: [
    { id: 'figure', tipo: 'imagen', orden: 0, pregunta_ids: ['question-a'], recurso_id: 'triangle', descripcion: 'Triángulo de la pregunta', seguridad_contenido: 'publicable_confirmado', legible: true },
    { id: 'table', tipo: 'tabla', orden: 1, pregunta_ids: ['question-a'], recurso_id: 'table-image', descripcion: 'Medidas de los lados', seguridad_contenido: 'publicable_confirmado',
      tabla: { encabezados: ['Lado', 'Longitud en centímetros', 'Medida alternativa para comparar'], filas: [['AB', '12', '12 centímetros'], ['BC', '10', '10 centímetros']] } },
    { id: 'source', tipo: 'imagen', orden: 2, pregunta_ids: ['question-a'], recurso_id: 'private-page', descripcion: 'Página original respondida', seguridad_contenido: 'privado_original' },
  ], cobertura: { estado: 'completa', detectados: [], conservados: [], avisos: [] },
};
const evaluation = { id: 'visual-evaluation', materia_id: subject.id, profesor_id: teacher.id, nombre: 'Figuras y medidas', descripcion: 'Observa y compara.', tipo_origen: 'externa_digitalizada', modalidad: 'online', nota_maxima: 5, estado: 'publicada', contenido_version_id: 'revision-a', contenido_visual: content,
  preguntas: [{ numero: 1, contenido_id: 'question-a', tipo: 'abierta', enunciado: 'Compara los lados del triángulo.', puntaje: 5 }], respuestas_esperadas: [{ numero: 1, respuesta: 'Clave exclusiva del docente' }], criterios: [], dba_ids: [], dba_personalizado_ids: [], metas_profesor: [], created_at: '2026-10-19', updated_at: '2026-10-19' };

async function mockApp(page: Page, student = false) {
  const user = student ? { ...teacher, id: 'visual-student', rol: 'estudiante', permissions: ['subjects.read', 'evaluations.read', 'evaluations.submit'] } : teacher;
  const seen: string[] = [];
  const item = student ? { ...evaluation, respuestas_esperadas: [], contenido_visual: { schema_version: 1, bloques: content.bloques.filter(block => block.seguridad_contenido === 'publicable_confirmado').map(({ seguridad_contenido: _private, ...block }) => block) } } : evaluation;
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url()); const path = url.pathname.replace(/^\/api/, ''); seen.push(path);
    if (path === '/auth/me') return route.fulfill({ json: { user } });
    if (path === '/users/me/authorization') return route.fulfill({ json: { profile: user.rol, permissions: user.permissions } });
    if (path === '/materias') return route.fulfill({ json: [subject] });
    if (path === `/materias/${subject.id}` || path === `/materias/${subject.id}/estudiantes`) return route.fulfill({ json: subject });
    if (path.endsWith('/evaluaciones') && path.startsWith('/materias/')) return route.fulfill({ json: [item] });
    if (path === `/evaluaciones/${item.id}`) return route.fulfill({ json: item });
    if (path.includes('/recursos/')) {
      if (student && path.endsWith('private-page')) return route.fulfill({ status: 403, json: { detail: 'Solo docente' } });
      expect(url.searchParams.get('version_id')).toBe('revision-a');
      return route.fulfill({ contentType: 'image/png', body: triangle });
    }
    if (path.endsWith('/mi-entrega')) return route.fulfill({ status: 404, json: { detail: 'Sin entrega' } });
    if (/\/(actividad|mi-desglose|mi-solicitud-revision)$/.test(path)) return route.fulfill({ json: null });
    if (path.endsWith('/pdf')) return route.fulfill({ status: 422, json: { detail: 'Usa la vista de figuras de esta muestra.' } });
    return route.fulfill({ json: [] });
  });
  return seen;
}

test.use({ reducedMotion: 'reduce' });
for (const width of [360, 390, 1440]) for (const dark of [false, true]) {
  test(`101 lector docente con figuras ${width}px ${dark ? 'oscuro' : 'claro'}`, async ({ page, browserName }, testInfo) => {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
    if (dark) await page.addInitScript(() => localStorage.setItem('xc-theme', JSON.stringify({ state: { mode: 'dark' }, version: 0 })));
    const seen = await mockApp(page);
    await page.goto(`/app/materias/${subject.id}/evaluaciones`);
    await page.getByRole('button', { name: 'Visualizar' }).click();
    const dialog = page.getByRole('dialog', { name: 'Visualizar evaluación' });
    await dialog.getByRole('button', { name: 'Opciones' }).click();
    await dialog.getByRole('button', { name: 'Ver preguntas y figuras' }).click();
    const figure = dialog.getByAltText('Triángulo de la pregunta');
    await expect(figure).toBeVisible();
    await expect.poll(() => figure.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(160);
    await expect(dialog.getByRole('table', { name: 'Medidas de los lados' })).toContainText('12 centímetros');
    expect(seen.some(path => path.endsWith('private-page') || path.endsWith('/original'))).toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('visual-reader.png') });
    await dialog.getByRole('button', { name: 'Ampliar Triángulo de la pregunta' }).click();
    const zoom = page.getByRole('dialog', { name: 'Triángulo de la pregunta' });
    const increase = zoom.getByRole('button', { name: 'Aumentar imagen' });
    await expect(increase).toBeVisible(); await expect(increase).toBeEnabled();
    // The existing preview suite uses keyboard activation on desktop WebKit:
    // its headless rAF clock can stall; mobile still exercises pointer input.
    if (browserName === 'webkit' && width >= 768) await increase.press('Enter');
    else await increase.click();
    await expect(zoom).toContainText('150%');
    const close = zoom.getByRole('button', { name: 'Cerrar diálogo' });
    if (browserName === 'webkit' && width >= 768) await close.press('Enter');
    else await close.click();
    await expect(dialog).toBeVisible();
  });
}

test('101 alumno ve estímulos sin soluciones ni original privado', async ({ page }) => {
  const seen = await mockApp(page, true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/app/evaluaciones/${evaluation.id}/resolver`);
  await expect(page.getByAltText('Triángulo de la pregunta')).toBeVisible();
  await expect(page.getByRole('table', { name: 'Medidas de los lados' })).toContainText('12 centímetros');
  await expect(page.getByText('Clave exclusiva del docente')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Revisar material conservado' })).toHaveCount(0);
  expect(seen.some(path => path.endsWith('private-page') || path.endsWith('/original'))).toBe(false);
});
