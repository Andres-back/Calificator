import { readFileSync } from 'node:fs';
import { expect, type Page, type Route } from '@playwright/test';
import { login } from './explainableGrading';
import { spec141EvidenceContext, spec141EvidenceGrade, spec141EvidenceHref } from '../mock/spec141-fixtures';

// Spec 217: abre «Editar hojas» con dos hojas guardadas que se pueden girar o recortar.

const png = readFileSync(new URL('./scan-evidence.png', import.meta.url));
const json = (route: Route, data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', json: data });
const fingerprint = 'a'.repeat(64);
const context = {
  ...spec141EvidenceContext,
  limites: { max_pages: 10, max_file_bytes: 10 * 1024 * 1024, max_total_bytes: 40 * 1024 * 1024 },
  paginas: spec141EvidenceContext.paginas.map((sheet, index) => ({ ...sheet, fuente_url: `/api/calificaciones/c1/evidencia/edicion/hoja${index + 1}?fingerprint=${fingerprint}` })),
};

export async function openEvidenceEditor(page: Page) {
  await login(page, 'profesor');
  await page.route('**/api/calificaciones/c1/detalle', route => json(route, spec141EvidenceGrade));
  await page.route('**/api/calificaciones/c1/recalificacion-contexto', route => json(route, {
    estado: 'sin_cambios', version_entrega_id: null, version_objetivo_id: null, fingerprint: null,
    requiere_confirmacion: false, cambios: [], mensaje: 'Se conservarán los puntajes de la entrega.',
  }));
  await page.route('**/api/calificaciones/c1/evidencia/edicion', route => json(route, context));
  await page.route('**/api/calificaciones/c1/evidencia/edicion/*', route => route.fulfill({ status: 200, contentType: 'image/png', body: png }));
  await page.route('**/api/calificaciones/c1/evidencia/paginas/*', route => route.fulfill({ status: 200, contentType: 'image/png', body: png }));
  await page.route('**/api/calificaciones/c1/evidencia', route => route.fulfill({ status: 200, contentType: 'image/png', body: png }));
  await page.goto(spec141EvidenceHref);
  await page.getByRole('button', { name: 'Evidencia', exact: true }).click();
  await page.getByRole('button', { name: 'Editar hojas', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Editar hojas', exact: true });
  await expect(dialog.getByText('Hoja 2', { exact: true })).toBeVisible();
  return dialog;
}
