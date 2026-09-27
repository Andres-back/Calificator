import { expect, test, type Page, type Route } from '@playwright/test';

const teacher = {
  id: 'teacher-criteria',
  nombre: 'Profesora de prueba',
  email: 'criterios@example.test',
  rol: 'profesor',
  estado: 'activo',
  permissions: ['subjects.read', 'dba.manage'],
};

const materia = {
  id: 'm1',
  profesor_id: teacher.id,
  nombre: 'Lengua castellana',
  area: 'Lengua castellana',
  grado: '5',
  codigo_matricula: 'LENG5',
  estado: 'activa',
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function installMocks(page: Page) {
  let authenticated = false;

  await page.addInitScript(() => {
    localStorage.setItem('xcalificator:tour:profesor:criterios-aprendizaje:v1', 'completed');
  });

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api/, '');

    if (path === '/auth/login') {
      authenticated = true;
      return json(route, {});
    }
    if (path === '/auth/refresh') return json(route, { detail: 'Sin sesión' }, 401);
    if (path === '/auth/me') {
      return authenticated
        ? json(route, { user: teacher })
        : json(route, { detail: 'Sin sesión' }, 401);
    }
    if (path === '/users/me/authorization') {
      return json(route, {
        profile: teacher.rol,
        is_primary_admin: false,
        custom_role_id: null,
        custom_role_name: null,
        role_version: null,
        auth_version: 1,
        permissions: teacher.permissions,
      });
    }
    if (path === '/materias') return json(route, [materia]);
    if (path === '/materias/m1') return json(route, materia);
    if (path === '/criterios-aprendizaje/capacidades') {
      return json(route, { ui: true, write: true, generation: true });
    }
    if (path === '/materias/m1/criterios-aprendizaje') {
      return json(route, { items: [], total: 0, limit: 25, offset: 0 });
    }
    if (path === '/materias/m1/dba' || path === '/materias/m1/dba-personalizados') {
      return json(route, []);
    }
    if (path === '/calificaciones/bandeja-docente') {
      return json(route, { items: [], total: 0, solicitudes_revision: 0, pendientes_calificacion: 0 });
    }
    if (path === '/analytics/evento') return json(route, {}, 201);

    return json(route, {});
  });
}

test('docente inicia criterios de aprendizaje con tres opciones claras en celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installMocks(page);

  await page.goto('/login');
  await page.getByLabel(/Correo/i).fill(teacher.email);
  await page.locator('input[type="password"]').fill('Password123!');
  await page.getByRole('button', { name: /Iniciar sesi.n/i }).click();
  await expect(page).toHaveURL(/\/app/);

  await page.goto('/app/materias/m1/criterios');
  await expect(page.getByRole('heading', { name: 'Criterios de aprendizaje', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Definir qué voy a evaluar' }).first().click();

  await expect(page.getByRole('heading', { name: '¿Cómo quieres empezar?' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Usar foto, PDF o material/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Escribir lo que enseñé/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Usar criterios que ya tengo/ })).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
});
