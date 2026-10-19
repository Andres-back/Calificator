import { expect, test, type Locator, type Page } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });
test.setTimeout(60_000);

const teacher = { id: 'teacher', nombre: 'Docente prueba', email: 'preview@example.test', rol: 'profesor', estado: 'activo', permissions: ['subjects.read', 'evaluations.read'] };
const subject = { id: 'preview-subject', profesor_id: teacher.id, nombre: 'Lectura', area: 'Lenguaje', grado: '4', descripcion: null, estado: 'activa', estudiantes: [], codigo_activo: true, codigo_matricula: 'DEMO', requiere_aprobacion: false, created_at: '2026-10-04', updated_at: '2026-10-04' };
const evaluation = { id: 'preview-evaluation', materia_id: subject.id, profesor_id: teacher.id, nombre: 'Comprensión lectora y operaciones', descripcion: 'Lee y responde.', tipo_origen: 'nativa', modalidad: 'fisica', nota_maxima: 5, estado: 'borrador', preguntas: [{ numero: 1, enunciado: '¿Cuánto es 3 × 4?', puntaje: 5 }], respuestas_esperadas: [{ numero: 1, respuesta: '12' }], criterios: [], dba_ids: [], dba_personalizado_ids: [], metas_profesor: [], created_at: '2026-10-04', updated_at: '2026-10-04' };

// Dos páginas válidas: comprobar texto y píxeles reales, no solo presencia del visor.
function pdfFixture(pageCount = 2) {
  if (pageCount > 2) {
    const objects = ['<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Kids [${Array.from({ length: pageCount }, (_, i) => `${4 + i * 2} 0 R`).join(' ')}] /Count ${pageCount} >>`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
    for (let index = 1; index <= pageCount; index++) {
      const stream = `BT /F1 14 Tf 50 780 Td (Pagina ${index} de prueba) Tj ET\n`;
      objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + (index - 1) * 2} 0 R >>`, `<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
    }
    let file = '%PDF-1.4\n'; const offsets = [0];
    objects.forEach((body, index) => { offsets.push(file.length); file += `${index + 1} 0 obj\n${body}\nendobj\n`; });
    const xref = file.length;
    return `${file}xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  }
  const stream = 'BT /F1 14 Tf 50 780 Td (Evaluacion para estudiantes) Tj ET\n';
  const second = 'BT /F1 14 Tf 50 780 Td (Ultima pregunta: tres por cuatro) Tj ET\n';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R 6 0 R] /Count 2 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${stream.length} >>\nstream\n${stream}endstream`, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 7 0 R >>', `<< /Length ${second.length} >>\nstream\n${second}endstream`];
  let file = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((body, index) => { offsets.push(file.length); file += `${index + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = file.length;
  file += `xref\n0 8\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return file;
}

async function mockApp(page: Page, student = false, pages = 2) {
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const policy = document.createElement('meta');
      policy.httpEquiv = 'Content-Security-Policy';
      // WS solo para HMR local; en producción se conserva la política existente.
      policy.content = "connect-src 'self' ws://127.0.0.1:4175; worker-src 'self'";
      document.head.appendChild(policy);
    }, { once: true });
  });
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
      return route.fulfill({ contentType: 'application/pdf', body: pdfFixture(pages) });
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

for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
  test(`preview y descargas docentes sin edición en ${viewport.width}px`, async ({ page, browserName }, testInfo) => {
    const activate = async (control: Locator) => {
      await expect(control).toBeVisible(); await expect(control).toBeEnabled();
      if (browserName === 'webkit' && viewport.width >= 768) await control.press('Enter');
      else await control.click();
    };
    await page.setViewportSize(viewport);
    if (viewport.width === 390) {
      await page.addInitScript(() => localStorage.setItem('xc-theme', JSON.stringify({ state: { mode: 'dark' }, version: 0 })));
    }
    const requests = await mockApp(page);
    await page.goto(`/app/materias/${subject.id}/evaluaciones`);
    await activate(page.getByRole('button', { name: 'Visualizar' }));
    const dialog = page.getByRole('dialog', { name: 'Visualizar evaluación' });
    const frame = page.getByRole('region', { name: 'Formato final de la evaluación' });
    await expect(frame).toBeVisible();
    const canvas = frame.locator('[data-pdf-page="1"] canvas');
    await expect(canvas).toHaveAttribute('data-rendered', 'true');
    await expect.poll(() => canvas.evaluate((node: HTMLCanvasElement) => {
      const pixels = node.getContext('2d')!.getImageData(0, 0, node.width, node.height).data;
      let ink = 0;
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i] < 200 && pixels[i + 3] > 0) ink++;
      return ink;
    })).toBeGreaterThan(20);
    await activate(frame.getByText('Leer texto de la página 1'));
    await expect(frame.getByText('Evaluacion para estudiantes', { exact: true })).toBeVisible();
    await activate(frame.getByRole('button', { name: 'Página siguiente' }));
    await activate(frame.getByText('Leer texto de la página 2'));
    await expect(frame.getByText('Ultima pregunta: tres por cuatro', { exact: true })).toBeVisible();
    await expect(canvas).toHaveAttribute('data-rendered', 'true');
    await activate(frame.getByRole('button', { name: 'Ampliar página' }));
    await expect(frame.locator('[aria-live]')).toHaveText('Página 2 de 2');
    const geometry = await dialog.evaluate((element) => ({ overflow: element.scrollWidth > element.clientWidth + 1, bottom: element.getBoundingClientRect().bottom }));
    expect(geometry.overflow).toBe(false);
    expect(geometry.bottom).toBeLessThanOrEqual(viewport.height + 1);
    const pdfBounds = await frame.boundingBox();
    expect(pdfBounds!.height).toBeGreaterThan(180);
    if (viewport.width === 390) expect(pdfBounds!.height).toBeGreaterThan(viewport.height * 0.6);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await activate(frame.getByRole('button', { name: 'Ajustar al ancho' }));
    await activate(frame.getByRole('button', { name: 'Página anterior' }));
    await expect(frame.locator('[data-pdf-page="1"] canvas')).toHaveAttribute('data-rendered', 'true');
    await page.screenshot({ path: testInfo.outputPath('evaluation-preview.png') });
    await activate(dialog.getByRole('button', { name: 'Opciones' }));
    await expect(dialog.getByRole('link', { name: /Ver evaluación completa/ })).toHaveAttribute('target', '_blank');
    const pdfDownload = page.waitForEvent('download');
    await activate(dialog.getByRole('button', { name: 'Descargar PDF' }));
    expect((await pdfDownload).suggestedFilename()).toMatch(/\.pdf$/);
    const wordDownload = page.waitForEvent('download');
    await activate(dialog.getByRole('button', { name: 'Descargar Word' }));
    expect((await wordDownload).suggestedFilename()).toMatch(/\.docx$/);
    await page.getByRole('combobox', { name: 'Versión del documento' }).selectOption('solutions');
    await expect.poll(() => requests.filter((request) => request.path.endsWith('/pdf')).at(-1)?.solutions).toBe('true');
    await activate(page.getByRole('button', { name: 'Cerrar diálogo' }));
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
  await expect(page.getByRole('region', { name: 'Formato final de la evaluación' }).locator('canvas').first()).toHaveAttribute('data-rendered', 'true');
  await page.getByRole('button', { name: 'Cerrar diálogo' }).click();
  await page.unroute('**/api/**');
  await mockApp(page, true);
  await page.goto('/app/evaluaciones');
  await expect(page.getByRole('button', { name: 'Visualizar' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Descargar Word' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Ver evaluación', exact: true })).toHaveAttribute('href', `/app/evaluaciones/${evaluation.id}/resolver`);
});

test('102 lectura continua de veinte páginas con render acotado', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApp(page, false, 20);
  await page.goto(`/app/materias/${subject.id}/evaluaciones`);
  await page.getByRole('button', { name: 'Visualizar' }).click();
  const dialog = page.getByRole('dialog', { name: 'Visualizar evaluación' });
  const scroll = dialog.locator('[data-document-scroll]');
  await expect(scroll.locator('[data-pdf-page]')).toHaveCount(20);
  await expect(scroll.locator('[data-pdf-page="1"] canvas')).toHaveAttribute('data-rendered', 'true');
  for (const number of [5, 10, 20, 1]) {
    await scroll.locator(`[data-pdf-page="${number}"]`).evaluate((node) => node.scrollIntoView({ block: 'start' }));
    const canvas = scroll.locator(`[data-pdf-page="${number}"] canvas`);
    await expect(canvas).toHaveAttribute('data-rendered', 'true');
    await expect(canvas).toBeVisible();
    expect(await scroll.locator('canvas').count()).toBeLessThanOrEqual(3);
    expect(await canvas.evaluate((node: HTMLCanvasElement) => node.width * node.height)).toBeLessThanOrEqual(4_000_000);
  }
  await dialog.getByRole('button', { name: 'Cerrar diálogo' }).focus();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Opciones' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});
