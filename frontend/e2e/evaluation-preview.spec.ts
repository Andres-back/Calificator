import { expect, test, type Page } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

const teacher = { id: 'teacher', nombre: 'Docente prueba', email: 'preview@example.test', rol: 'profesor', estado: 'activo', permissions: ['subjects.read', 'evaluations.read'] };
const subject = { id: 'preview-subject', profesor_id: teacher.id, nombre: 'Lectura', area: 'Lenguaje', grado: '4', descripcion: null, estado: 'activa', estudiantes: [], codigo_activo: true, codigo_matricula: 'DEMO', requiere_aprobacion: false, created_at: '2026-10-04', updated_at: '2026-10-04' };
const evaluation = { id: 'preview-evaluation', materia_id: subject.id, profesor_id: teacher.id, nombre: 'Comprensión lectora y operaciones', descripcion: 'Lee y responde.', tipo_origen: 'nativa', modalidad: 'fisica', nota_maxima: 5, estado: 'borrador', preguntas: [{ numero: 1, enunciado: '¿Cuánto es 3 × 4?', puntaje: 5 }], respuestas_esperadas: [{ numero: 1, respuesta: '12' }], criterios: [], dba_ids: [], dba_personalizado_ids: [], metas_profesor: [], created_at: '2026-10-04', updated_at: '2026-10-04' };

// PDF válido mínimo: comprueba el visor y las descargas, sin dependencia de servicios externos.
function pdfFixture() {
  const stream = 'BT /F1 14 Tf 50 780 Td (Evaluacion para estudiantes) Tj ET\n';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${stream.length} >>\nstream\n${stream}endstream`];
  let file = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((body, index) => { offsets.push(file.length); file += `${index + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = file.length;
  file += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return file;
}

async function mockApp(page: Page, student = false) {
  const user = student ? { ...teacher, id: 'student', rol: 'estudiante', permissions: ['subjects.read', 'evaluations.read', 'evaluations.submit'] } : teacher;
  const requests: { path: string; solutions: string | null; method: string }[] = [];
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, '');
    const method = route.request().method();
    const json = (value: unknown) => route.fulfill({ json: value });
    if (path === '/auth/me') return json({ user });
    if (path === '/users/me/authorization') return json({ profile: user.rol, permissions: user.permissions });
    if (path === '/materias') return json([subject]);
    if (path === `/materias/${subject.id}`) return json(subject);
    if (path === `/materias/${subject.id}/estudiantes`) return json({ ...subject, estudiantes: [] });
    if (path === `/materias/${subject.id}/evaluaciones`) return json([{ ...evaluation, estado: student ? 'publicada' : 'borrador' }]);
    if (path === `/evaluaciones/${evaluation.id}/pdf`) {
      requests.push({ path, solutions: url.searchParams.get('soluciones'), method });
      return route.fulfill({ contentType: 'application/pdf', body: pdfFixture() });
    }
    if (path === `/evaluaciones/${evaluation.id}/docx`) {
      requests.push({ path, solutions: url.searchParams.get('soluciones'), method });
      return route.fulfill({ contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', body: 'Word mock' });
    }
    requests.push({ path, solutions: null, method });
    return json([]);
  });
  return requests;
}

for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 1366, height: 768 }]) {
  test(`preview y descargas docentes sin edición en ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    if (viewport.width === 390) {
      await page.addInitScript(() => localStorage.setItem('xc-theme', JSON.stringify({ state: { mode: 'dark' }, version: 0 })));
    }
    const requests = await mockApp(page);
    await page.goto(`/app/materias/${subject.id}/evaluaciones`);
    await page.getByRole('button', { name: 'Visualizar' }).click();
    const dialog = page.getByRole('dialog', { name: 'Visualizar evaluación' });
    const frame = page.getByTitle('Formato final de la evaluación');
    await expect(frame).toBeVisible();
    const geometry = await dialog.evaluate((element) => ({ overflow: element.scrollWidth > element.clientWidth + 1, bottom: element.getBoundingClientRect().bottom }));
    expect(geometry.overflow).toBe(false);
    expect(geometry.bottom).toBeLessThanOrEqual(viewport.height);
    const pdfBounds = await frame.boundingBox();
    const buttonBounds = await dialog.getByRole('button', { name: 'Descargar PDF' }).boundingBox();
    expect(pdfBounds!.height).toBeGreaterThan(250);
    expect(pdfBounds!.y + pdfBounds!.height).toBeLessThanOrEqual(buttonBounds!.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('evaluation-preview.png') });
    const pdfDownload = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Descargar PDF' }).click();
    expect((await pdfDownload).suggestedFilename()).toMatch(/\.pdf$/);
    const wordDownload = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Descargar Word' }).click();
    expect((await wordDownload).suggestedFilename()).toMatch(/\.docx$/);
    await page.getByRole('combobox', { name: 'Versión del documento' }).selectOption('solutions');
    await expect.poll(() => requests.filter((request) => request.path.endsWith('/pdf')).at(-1)?.solutions).toBe('true');
    await page.getByRole('button', { name: 'Cerrar diálogo' }).click();
    await expect(dialog).not.toBeVisible();
    // La navegación existente registra telemetría; exportar no muta el dominio académico.
    expect(requests.filter((request) => request.method !== 'GET' && request.path !== '/analytics/evento')).toEqual([]);
    expect(requests.filter((request) => request.path.endsWith('/pdf'))[0].solutions).toBe('false');
  });
}

test('lista global tiene visualización y estudiante conserva su resolución sin controles docentes', async ({ page }) => {
  await mockApp(page);
  await page.goto('/app/evaluaciones');
  await page.getByRole('button', { name: 'Visualizar' }).click();
  await expect(page.getByTitle('Formato final de la evaluación')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar diálogo' }).click();
  await page.unroute('**/api/**');
  await mockApp(page, true);
  await page.goto('/app/evaluaciones');
  await expect(page.getByRole('button', { name: 'Visualizar' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Descargar Word' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Ver evaluación', exact: true })).toHaveAttribute('href', `/app/evaluaciones/${evaluation.id}/resolver`);
});
