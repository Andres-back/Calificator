import { expect, test, type Page } from '@playwright/test';

const teacher = {
  id: 'profesor-recursos-e2e',
  nombre: 'Profesora Recursos',
  email: 'recursos@example.test',
  rol: 'profesor',
  estado: 'activo',
  permissions: ['subjects.read', 'dba.read', 'resources.read', 'resources.create', 'resources.update', 'resources.assign'],
};

const materia = {
  id: 'materia-recursos-1',
  profesor_id: teacher.id,
  nombre: 'Ciencias 5°',
  area: 'Ciencias Naturales',
  grado: '5°',
  descripcion: 'Curso de prueba',
  codigo_matricula: 'CIEN05',
  codigo_activo: true,
  requiere_aprobacion: false,
  estado: 'activa',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};


const generatedResource = {
  id: 'resource-associated-1',
  tipo: 'guia',
  titulo: 'Guía del ciclo del agua',
  materia_id: materia.id,
  materia_nombre: materia.nombre,
  contenido_json: { titulo: 'Guía del ciclo del agua', instrucciones: 'Repasa y responde.' },
  archivo_url: null,
  asignacion_tipo: null,
  publicado_estudiantes: false,
  fecha_publicacion: null,
  evaluacion_id: null,
  evaluacion_estado: null,
  evaluacion_modalidad: null,
  evaluacion_recepcion_habilitada: null,
  created_at: '2026-08-22T00:00:00Z',
  updated_at: '2026-08-22T00:00:00Z',
};

const resourceTypes = [
  'crucigrama',
  'sopa_letras',
  'emparejar',
  'guia',
  'taller',
  'cuento',
  'para_colorear',
  'plan_refuerzo',
  'ficha',
  'lectura_comprensiva',
  'mapa_conceptual',
  'flashcards',
] as const;

async function mockApplication(page: Page) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, '');
    const json = (body: unknown, status = 200) => route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });

    if (path === '/auth/refresh') return json({});
    if (path === '/auth/me') return json({ user: teacher });
    if (path === '/users/me/authorization') return json({
      profile: teacher.rol, is_primary_admin: false, custom_role_id: null,
      custom_role_name: null, role_version: null, auth_version: 1,
      permissions: teacher.permissions,
    });
    if (path === '/materias') return json([materia]);
    if (path === `/materias/${materia.id}/dba`) {
      return json([{
        id: 'dba-recursos-1',
        fuente: 'oficial',
        codigo: 'DBA-1',
        area: materia.area,
        grado: materia.grado,
        descripcion: 'Explica los cambios de estado del agua.',
      }]);
    }
    if (path === '/herramientas/guia' && request.method() === 'POST') return json(generatedResource);
    if (path === '/herramientas/' + generatedResource.id && request.method() === 'GET') return json(generatedResource);
    if (path === '/herramientas/' + generatedResource.id + '/evaluaciones') return json([]);
    if (path === '/herramientas' && request.method() === 'GET') return json([]);
    return json({});
  });
}

async function fillBaseFields(page: Page, type: string) {
  await page.getByRole('textbox', { name: /^Título/ }).fill(`Material ${type}`);
  await page.getByRole('textbox', { name: /^Tema/ }).fill('El ciclo del agua');
  if (type === 'plan_refuerzo') {
    await page.getByRole('textbox', { name: /^Nombre del estudiante/ }).fill('Estudiante E2E');
  }
}

test.beforeEach(async ({ page }) => {
  await mockApplication(page);
});

test('el selector ofrece una sola herramienta para relacionar pares', async ({ page }) => {
  await page.goto('/app/herramientas/nuevo');

  await expect(page.getByRole('heading', { name: '2. Elige el formato' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: /Elegir Relacionar pares/i })).toHaveCount(1);
  await expect(page.getByText('Unir columnas', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Emparejar', { exact: true })).toHaveCount(0);
});

test('un enlace anterior de unir columnas abre la herramienta consolidada', async ({ page }) => {
  await page.goto('/app/herramientas/nuevo?tipo=unir_columnas');

  await expect(page.getByRole('heading', { name: 'Crear recurso: Relacionar pares' })).toBeVisible();
  await expect(page.getByPlaceholder('Relacionar pares: estados del agua')).toBeVisible();
});

test('todos los recursos permiten llegar a revisión con generación libre', async ({ page }) => {
  test.setTimeout(60_000);
  for (const type of resourceTypes) {
    await page.goto(`/app/herramientas/nuevo?tipo=${type}`);
    await fillBaseFields(page, type);

    const review = page.getByRole('button', { name: 'Revisar antes de generar' });
    await expect(review, `${type} debe aceptar generación libre`).toBeEnabled();
    await review.click();
    await expect(page.getByText('Generación libre con IA')).toBeVisible();
    await page.getByRole('button', { name: 'Volver al formulario' }).click();
  }
});

test('un recurso puede usar rúbrica sin seleccionar DBA', async ({ page }) => {
  await page.goto('/app/herramientas/nuevo?tipo=guia');
  await fillBaseFields(page, 'guia');
  await page.getByRole('checkbox', { name: /Usar criterios de rúbrica/i }).check();
  await page.getByPlaceholder(/Claridad/i).fill('Explica con claridad');
  await page.getByPlaceholder(/Claridad/i).press('Enter');

  await page.getByRole('button', { name: 'Revisar antes de generar' }).click();

  await expect(
    page
      .getByLabel('¿Generar guía de aprendizaje?')
      .getByText('Criterios de rúbrica', { exact: true }),
  ).toBeVisible();
});

test('DBA solo se exige cuando el profesor activa esa opción', async ({ page }) => {
  await page.goto('/app/herramientas/nuevo?tipo=guia');
  await fillBaseFields(page, 'guia');
  await page.getByRole('combobox').selectOption(materia.id);
  await page.getByRole('checkbox', { name: /Alinear con DBA/i }).check();

  await expect(page.getByRole('button', { name: 'Revisar antes de generar' })).toBeDisabled();
  await page.getByRole('checkbox', { name: /DBA-1/i }).check();
  await page.getByRole('button', { name: 'Revisar antes de generar' }).click();

  await expect(page.getByText('Alineación con DBA')).toBeVisible();
});


test('generar con materia conserva el recurso y abre la decisión de asignación', async ({ page }) => {
  await page.goto('/app/herramientas/nuevo?tipo=guia');
  await page.getByRole('textbox', { name: /^Título/ }).fill(generatedResource.titulo);
  await page.getByRole('textbox', { name: /^Tema/ }).fill('El ciclo del agua');
  await page.getByRole('combobox').selectOption(materia.id);
  await page.getByRole('button', { name: 'Revisar antes de generar' }).click();
  await page.getByRole('button', { name: 'Sí, generar material' }).click();

  await expect(page).toHaveURL(new RegExp('/app/herramientas/' + generatedResource.id + '\\?action=assign'));
  await expect(page.getByRole('heading', { name: 'Asignar a una clase' })).toBeVisible();
  await expect(page.getByLabel('Materia o salón')).toBeDisabled();
  await expect(page.getByText(/Conserva la materia elegida al generar/)).toBeVisible();
  await expect(page.getByText('Material de apoyo', { exact: true })).toBeVisible();
  await expect(page.getByText('Taller o actividad evaluable', { exact: true })).toBeVisible();
});
