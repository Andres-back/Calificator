import { expect, test, type Page, type Locator } from '@playwright/test';

// Each case traverses library, documents, editor error/discard and subject context.
test.setTimeout(60_000);
// Layout is specified in CSS pixels; avoid a 2880px offscreen backing surface
// in Windows WebKit when checking the 1440px desktop viewport.
test.use({ deviceScaleFactor: 1 });

const teacher = { id: 'review-teacher', nombre: 'Docente de prueba', email: 'review@example.test', rol: 'profesor', estado: 'activo', permissions: ['subjects.read', 'evaluations.read', 'evaluations.create', 'resources.read', 'resources.create', 'resources.update', 'resources.assign', 'resources.delete'] };
const materia = { id: 'review-materia', profesor_id: teacher.id, nombre: 'Ciencias Naturales 5A', area: 'Ciencias Naturales', grado: '5', estado: 'activa', codigo_matricula: 'PRUEBA', estudiantes: [] };
  const types = ['guia', 'cuento', 'lectura_comprensiva', 'crucigrama', 'flashcards', 'mapa_conceptual'];
  const titles = ['Guía del ciclo del agua y su importancia en nuestra comunidad', 'La aventura de una gota de agua', 'Lectura: cuidemos los ríos de nuestra región', 'Crucigrama del ciclo del agua', 'Tarjetas de los cambios de estado', 'Mapa conceptual sobre el agua'];
  const resources = types.map((tipo, i) => ({ id: `review-${tipo}`, profesor_id: teacher.id, tipo, titulo: titles[i], materia_id: materia.id, materia_nombre: materia.nombre, archivo_url: null, publicado_estudiantes: i === 1, asignacion_tipo: i === 1 ? 'apoyo' : null, evaluacion_id: null, created_at: '2026-10-18T12:00:00Z', updated_at: '2026-10-18T12:00:00Z', contenido_json: {
    titulo: titles[i], instrucciones: 'Lee el material y desarrolla las actividades. Explica tus respuestas con tus propias palabras.',
    _xcalificator: { enfoque_pedagogico: 'rubrica' }, criterios: [{ nombre: 'Comprensión del ciclo del agua', descripcion: 'Explica los cambios y los relaciona con una situación cotidiana.', peso_porcentaje: 100 }],
    ...(tipo === 'guia' ? { objetivos: ['Reconocer los cambios de estado del agua.'], introduccion: 'El agua cambia de estado y circula entre la tierra y la atmósfera.', secciones: [{ titulo: 'La evaporación', contenido: 'El calor del sol transforma el agua líquida en vapor.', ejemplo_guiado: 'La ropa mojada se seca al sol porque parte del agua se evapora.', actividades: ['Describe qué sucede con un charco después de un día soleado.'] }], cierre: 'Relaciona evaporación, condensación y precipitación.' } : {}),
    ...(tipo === 'cuento' ? { personajes: ['Luna, una gota de agua', 'El sol'], parrafos: ['Luna vivía en un río rodeado de árboles. Una mañana sintió el calor del sol y comenzó a subir, convertida en vapor.', 'En lo alto conoció otras gotas y juntas formaron una nube. Al enfriarse, regresaron a la tierra como lluvia.', 'Luna comprendió que su viaje ayudaba a las plantas, los animales y las personas.'], moraleja: 'Cuidar el agua es cuidar la vida.', preguntas_comprension: ['¿Qué hizo que Luna subiera al cielo?', '¿Cómo regresó a la tierra?'] } : {}),
    ...(tipo === 'lectura_comprensiva' ? { texto: 'Los ríos llevan agua a muchos seres vivos. Cuando cuidamos sus orillas y evitamos arrojar basura, protegemos el lugar donde viven peces, aves y plantas. Cada familia puede ayudar con acciones pequeñas y constantes.', preguntas: [{ numero: 1, tipo: 'abierta', enunciado: '¿Por qué es importante cuidar los ríos?', respuesta_esperada: 'Porque son necesarios para los seres vivos.' }] } : {}),
    ...(tipo === 'crucigrama' ? { crucigrama: { grid: [['A','G','U','A'],['','','',''],['S','O','L','']], pistas_horizontal: [{ numero: 1, fila: 0, columna: 0, longitud: 4, pista: 'Líquido necesario para vivir', respuesta: 'AGUA' }, { numero: 2, fila: 2, columna: 0, longitud: 3, pista: 'Fuente de calor y luz', respuesta: 'SOL' }], pistas_vertical: [] } } : {}),
    ...(tipo === 'flashcards' ? { tarjetas: [{ numero: 1, anverso: 'Evaporación', reverso: 'Paso del estado líquido al gaseoso.' }, { numero: 2, anverso: 'Condensación', reverso: 'Paso del estado gaseoso al líquido.' }] } : {}),
    ...(tipo === 'mapa_conceptual' ? { concepto_principal: 'Ciclo del agua', nodos: [{ id: '1', concepto: 'Evaporación', nivel: 1 }, { id: '2', concepto: 'Condensación', nivel: 1 }], relaciones: [{ origen: '1', destino: '2', etiqueta: 'se enfría' }], mapa_valido: true } : {}),
  } }));

const renderingResources = [...resources, ...[
  { tipo: 'taller', titulo: 'Taller del agua', contenido_json: { puntos: [{ numero: 1, enunciado: 'Explica la evaporación.', respuesta_esperada: 'Paso de líquido a vapor.', puntaje: 1, lineas_respuesta: 3 }] } },
  { tipo: 'plan_refuerzo', titulo: 'Refuerzo del agua', contenido_json: { semanas: [{ semana: 1, tema: 'Cambios de estado', actividades: ['Explica un ejemplo'], recursos: ['Cuaderno'] }] } },
  { tipo: 'sopa_letras', titulo: 'Sopa del agua', contenido_json: { grilla: [['S', 'O', 'L']], banco_palabras: ['SOL'], palabras: [{ palabra: 'SOL', fila: 0, col: 0, fila_fin: 0, col_fin: 2, direccion: 'E', invertida: false }] } },
  { tipo: 'emparejar', titulo: 'Pares del agua', contenido_json: { columna_izquierda: [{ numero: 1, texto: 'Sol' }], columna_derecha: [{ letra: 'A', texto: 'Calor' }], soluciones: [{ numero: 1, letra: 'A' }] } },
].map(resource => ({ ...resources[0], ...resource, id: `review-${resource.tipo}` }))];

async function fixtures(page: Page, permissions = teacher.permissions) {
  const writes: { path: string; payload: unknown }[] = [];
  let failSave = false;
  await page.route('**/api/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api/, '');
    const json = (body: unknown, status = 200) => route.fulfill({ json: body, status });
    if (path === '/auth/me') return json({ user: { ...teacher, permissions } });
    if (path === '/users/me/authorization') return json({ profile: 'profesor', auth_version: 1, permissions });
    if (path === '/materias') return json([materia]);
    if (path === '/materias/' + materia.id || path === '/materias/' + materia.id + '/estudiantes') return json(materia);
    if (path === '/jobs/pendientes') return json({ items: [] });
    if (path.endsWith('/evaluaciones')) return json([]);
    if (path === '/herramientas' || path.endsWith('/recursos')) return json(resources);
    const resource = renderingResources.find(item => path === '/herramientas/' + item.id);
    if (resource && request.method() === 'PATCH') {
      writes.push({ path, payload: request.postDataJSON() });
      if (failSave) return json({ detail: 'No disponible' }, 503);
      return json({ ...resource, ...request.postDataJSON() });
    }
    if (resource) return json(resource);
    if (request.method() !== 'GET' && !['/auth/refresh', '/analytics/evento'].includes(path)) {
      writes.push({ path, payload: request.postData() });
      return json({ detail: 'Operación no esperada' }, 403);
    }
    return json({});
  });
  return { writes, failNextSave: () => { failSave = true; } };
}
async function touch(control: Locator) {
  // The existing dialog animates from scale(.96); measure its settled hit area.
  await expect.poll(async () => (await control.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.999);
  await expect.poll(async () => (await control.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(43.999);
}

for (const width of [360, 390, 1440]) for (const theme of ['light', 'dark']) {
  test(`106 recursos claros ${width}px ${theme}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width === 360 ? 800 : 844 });
    await page.addInitScript(mode => localStorage.setItem('xc-theme', JSON.stringify({ state: { mode }, version: 0 })), theme);
    const mock = await fixtures(page);
    await page.goto('/app/herramientas');
    const first = page.getByRole('link', { name: 'Ver recurso', exact: true }).first();
    await expect(first).toBeVisible();
    const libraryY = (await first.boundingBox())!.y;
    const firstCardY = await first.evaluate(element => element.closest('.card')!.getBoundingClientRect().top);
    expect(libraryY + (await first.boundingBox())!.height).toBeLessThan(page.viewportSize()!.height);
    await touch(first);
    const search = page.getByRole('searchbox', { name: 'Buscar recursos' });
    await touch(search);
    await expect(page.locator('details').first()).not.toHaveAttribute('open');
    await search.fill('agua');
    await page.getByRole('combobox', { name: 'Tipo de recurso' }).selectOption('guia');
    await expect(page.getByRole('link', { name: 'Ver recurso', exact: true })).toHaveCount(1);
    await page.screenshot({ path: `../output/playwright/106-recursos/${info.project.name}-${width}-${theme}-biblioteca.png` });
    await first.click();
    const body = page.locator('[data-resource-body]');
    await expect(body).toBeVisible();
    const bodyY = (await body.boundingBox())!.y;
    expect(bodyY).toBeLessThan(page.viewportSize()!.height - 30);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Descargar', exact: true }).click();
    const download = page.getByRole('dialog', { name: 'Descargar recurso' });
    await expect(download.getByRole('link', { name: 'PDF para estudiantes' })).not.toHaveAttribute('href', /soluciones=true/);
    await expect(download.getByRole('link', { name: 'Solucionario docente' })).toHaveAttribute('href', /soluciones=true/);
    await touch(download.getByRole('link', { name: 'PDF para estudiantes' }));
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Descargar', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Más opciones', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Opciones del recurso' })).toBeVisible();
    await page.keyboard.press('Escape');
    expect(mock.writes).toEqual([]);
    await page.screenshot({ path: `../output/playwright/106-recursos/${info.project.name}-${width}-${theme}-detalle.png` });
    await page.getByRole('button', { name: 'Editar contenido' }).click();
    const editor = page.getByRole('dialog', { name: 'Editar recurso', exact: true });
    await expect(editor.getByRole('heading', { name: 'Editar recurso' })).toBeFocused();
    // The shared spring can settle at a subpixel matrix, not literally 'none'.
    // This tolerance is only for position recording; hit targets remain >=44px.
    await expect.poll(async () => editor.evaluate(element => {
      const transform = getComputedStyle(element).transform;
      if (transform === 'none') return true;
      const matrix = new DOMMatrixReadOnly(transform);
      return Math.abs(matrix.a - 1) <= 0.002 && Math.abs(matrix.f) <= 1;
    })).toBe(true);
    const editorY = (await editor.boundingBox())!.y;
    const title = editor.getByLabel('Título del recurso');
    await title.fill('Título ajustado sin perder contenido');
    if (width < 640) {
      expect(await title.evaluate(element => getComputedStyle(element).fontSize)).toBe('16px');
      await title.evaluate(element => (element as HTMLInputElement).setSelectionRange(2, 7));
      await page.setViewportSize({ width, height: 440 });
      expect(await title.evaluate(element => [(element as HTMLInputElement).selectionStart, (element as HTMLInputElement).selectionEnd])).toEqual([2, 7]);
      await expect.poll(async () => title.evaluate(element => {
        const target = element.getBoundingClientRect();
        const area = element.closest('[data-mobile-scroll]')!.getBoundingClientRect();
        return target.top >= area.top && target.bottom <= area.bottom;
      })).toBe(true);
      await editor.getByRole('button', { name: 'Listo', exact: true }).click();
    }
    await touch(editor.getByRole('button', { name: 'Guardar cambios' }));
    await touch(editor.getByRole('button', { name: 'Cancelar' }));
    await page.screenshot({ path: `../output/playwright/106-recursos/${info.project.name}-${width}-${theme}-editor.png` });
    mock.failNextSave();
    await editor.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(editor.getByRole('alert')).toContainText('No se guardaron los cambios');
    await expect(title).toHaveValue('Título ajustado sin perder contenido');
    expect(mock.writes).toHaveLength(1);
    expect(mock.writes[0].payload).toEqual({ titulo: 'Título ajustado sin perder contenido', contenido_json: { ...resources[0].contenido_json, titulo: 'Título ajustado sin perder contenido' } });
    await editor.getByRole('button', { name: 'Cancelar' }).click();
    await page.getByRole('button', { name: 'Descartar cambios', exact: true }).click();
    await expect(editor).not.toBeVisible();
    await page.setViewportSize({ width, height: width === 360 ? 800 : 844 });
    await page.getByRole('link', { name: 'Volver a recursos', exact: true }).click();
    await expect(page.getByRole('searchbox', { name: 'Buscar recursos' })).toHaveValue('agua');
    await expect(page.getByRole('combobox', { name: 'Tipo de recurso' })).toHaveValue('guia');
    await page.goto('/app/materias/' + materia.id + '/recursos');
    await expect(page.getByRole('heading', { name: 'Recursos del salón' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ver recurso', exact: true })).toHaveCount(6);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('link', { name: 'Ver recurso', exact: true }).first().click();
    await expect(page.getByRole('link', { name: 'Volver a recursos', exact: true })).toHaveAttribute('href', '/app/materias/' + materia.id + '/recursos');
    info.annotations.push({ type: 'measurements', description: JSON.stringify({ firstCardY, libraryY, bodyY, editorY }) });
  });
}
test('106 conserva lectura de los diez formatos sin escrituras', async ({ page }) => {
  const mock = await fixtures(page);
  for (const width of [360, 1440]) for (const resource of renderingResources) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/app/herramientas/' + resource.id);
    await expect(page.locator('[data-resource-body]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole('heading', { name: resource.titulo, exact: true }).first()).toBeVisible();
  }
  expect(mock.writes).toEqual([]);
});

test('106 criterios mantiene cabecera y acciones dentro del editor', async ({ page }) => {
  const mock = await fixtures(page);
  for (const width of [360, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/app/herramientas/' + resources[0].id);
    await page.getByText('Qué se evaluará · criterios propuestos', { exact: true }).click();
    await page.getByRole('button', { name: 'Editar criterios', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Editar recurso', exact: true });
    await expect(editor.locator('[data-resource-field="criterios"]')).toBeFocused();
    const dialogBounds = (await editor.boundingBox())!;
    expect((await editor.getByRole('heading', { name: 'Editar recurso', exact: true }).boundingBox())!.y).toBeGreaterThanOrEqual(dialogBounds.y);
    for (const name of ['Guardar cambios', 'Cancelar']) {
      const button = editor.getByRole('button', { name, exact: true });
      const bounds = (await button.boundingBox())!;
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(dialogBounds.y + dialogBounds.height + 0.001);
      await touch(button);
    }
    await editor.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(editor).not.toBeVisible();
  }
  expect(mock.writes).toEqual([]);
});

test('106 docente de solo lectura conserva lector y permisos desde materia', async ({ page }) => {
  const mock = await fixtures(page, ['subjects.read', 'resources.read']);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/materias/' + materia.id + '/recursos');
  const resource = page.getByRole('link', { name: 'Ver recurso', exact: true }).first();
  await expect(resource).toHaveAttribute('href', '/app/herramientas/' + resources[0].id);
  await resource.click();
  await expect(page.locator('[data-resource-body]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar contenido' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Asignar a clase' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Más opciones', exact: true }).click();
  const menu = page.getByRole('dialog', { name: 'Opciones del recurso' });
  await expect(menu.getByRole('button', { name: 'Duplicar recurso' })).toHaveCount(0);
  await expect(menu.getByRole('button', { name: 'Eliminar recurso' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Descargar', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Solucionario docente' })).toBeVisible();
  expect(mock.writes).toEqual([]);
});
