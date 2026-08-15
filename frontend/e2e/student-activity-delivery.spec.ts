import { expect, test, type Page } from '@playwright/test';

const student = {
  id: 'student-authorization-e2e',
  nombre: 'Estudiante E2E',
  email: 'student-authorization@example.test',
  rol: 'estudiante',
  estado: 'activo',
};

const material = {
  id: 'material-publicado-1',
  tipo: 'taller',
  titulo: 'Taller visible de multiplicación',
  materia_id: 'materia-1',
  materia_nombre: 'Matemáticas',
  contenido_json: {
    instrucciones: 'Resuelve cada ejercicio y explica tu procedimiento.',
    puntos: [{ numero: 1, enunciado: '¿Cuánto es 3 × 9?' }],
  },
  archivo_url: null,
  evaluacion_id: 'evaluacion-1',
  evaluacion_estado: 'publicada',
  evaluacion_modalidad: 'fisica',
  asignacion_tipo: 'actividad',
  publicado_estudiantes: true,
  fecha_publicacion: '2026-08-14T00:00:00Z',
  created_at: '2026-08-14T00:00:00Z',
  updated_at: '2026-08-14T00:00:00Z',
};

async function mockStudentApplication(page: Page) {
  let authenticated = false;
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api/, '');
    const json = (body: unknown, status = 200) => route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });

    if (path === '/auth/refresh') return json({ detail: 'No session' }, 401);
    if (path === '/auth/login' && request.method() === 'POST') {
      authenticated = true;
      return json({});
    }
    if (path === '/auth/me') {
      return authenticated ? json({ user: student }) : json({ detail: 'No session' }, 401);
    }
    if (path === `/herramientas/${material.id}`) return json(material);
    if (path === '/materias') return json([]);
    return json([]);
  });
}

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/Correo/i).fill(student.email);
  await page.locator('input[type="password"]').fill('password-for-test');
  await page.getByRole('button', { name: /Iniciar sesi.n/i }).click();
  await expect(page).toHaveURL(/\/app/);
}

test('student reads the assigned activity without answer keys and can continue to delivery', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockStudentApplication(page);
  await login(page);

  await page.goto(`/app/recursos/${material.id}`);

  await expect(page.getByRole('heading', { name: material.titulo })).toBeVisible();
  await expect(page.getByText('¿Cuánto es 3 × 9?')).toBeVisible();
  await expect(page.getByText('Este es el material que debes resolver.')).toBeVisible();
  await expect(page.getByRole('link', { name: /Ir a entregar/i })).toHaveAttribute(
    'href',
    `/app/evaluaciones/${material.evaluacion_id}/resolver`,
  );
  const download = page.getByRole('link', { name: /Descargar PDF/i });
  await expect(download).toHaveAttribute('href', new RegExp(`/api/herramientas/${material.id}/pdf`));
  await expect(download).not.toHaveAttribute('href', /soluciones=true/);
  await expect(page.getByText(/respuesta_correcta|27/i)).toHaveCount(0);

  const noHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(noHorizontalOverflow).toBe(true);
});
