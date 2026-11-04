# Validación: Spec 144

Entorno: Windows 11, Node con dependencias de `frontend/package-lock.json`, Chromium headless de Playwright 1228. Datos sintéticos en todos los casos; sin backend ni datos reales.

## Regresión: RED antes de la corrección

| Prueba | Resultado con el código de `main` @ `ef35597` |
| --- | --- |
| `npx vitest run src/modules/admin/AdminUsersPage.test.tsx` | ❌ el último diálogo modal es el editor, no la confirmación |
| `npx playwright test e2e/admin-authorization.spec.ts --project=chromium -g 144` | ❌ `elementFromPoint` sobre "Aplicar cambio" devuelve el editor: botón tapado |

## Después de la corrección: GREEN

| Comando (en `frontend/`) | Resultado |
| --- | --- |
| `npx vitest run src/modules/admin/` | ✅ 9 archivos, 56 pruebas |
| `npx playwright test e2e/admin-authorization.spec.ts --project=chromium` | ✅ 3 pruebas |
| `npm run test:run` | ✅ 202 archivos, 1420 pruebas |
| `npm run lint` | ✅ sin errores |
| `npm run typecheck` | ✅ sin errores |

## Evidencia visual

Capturas reales en [`visual/`](visual/), a 384 px y 1440 px, en modo claro y oscuro. En todas, la confirmación está encima del editor y el foco está dentro de ella.

## Fuera de alcance

- El primitivo `Modal` con portal y pila global de diálogos (hallazgo M14 de la revisión) requiere su propia especificación.
- No se probó en un teléfono físico. La emulación a 384 px no acredita un dispositivo real.
