# Validación: Spec 146

Entorno: Windows 11, Node con dependencias de `frontend/package-lock.json`, Chromium headless de Playwright. Datos sintéticos en todos los casos; sin backend ni datos reales.

## Regresión: RED antes de la corrección

| Prueba (en `frontend/`) | Resultado con el código de `main` @ `8588296` |
| --- | --- |
| `npx vitest run src/modules/materias/MateriaEvaluaciones.test.tsx` | ❌ 4 fallos: no existe "Borrador" (se mostraba `borrador`), no aparecen los diálogos "Publicar evaluación" ni "Cerrar entregas" |
| `npx vitest run src/modules/evaluaciones/EvaluacionesPage.test.tsx` | ❌ 2 fallos: no aparecen "Publicar evaluación" ni "Cerrar evaluación" |

## Después de la corrección: GREEN

| Comando | Resultado |
| --- | --- |
| `npx vitest run` de los dos archivos anteriores | ✅ 19 pruebas |
| `npm run test:run` | ✅ 203 archivos, 1425 pruebas |
| `npm run lint` | ✅ sin errores ni advertencias |
| `npm run typecheck` | ✅ sin errores |
| `npx playwright test e2e/evaluation-ai-wizard.spec.ts e2e/evaluation-preview.spec.ts e2e/p2-responsive.spec.ts --project=chromium` | ✅ 77 pasan; ⚠️ 5 de `p2-responsive` (admin 1366/1920, recorrido del profesor, modo oscuro del profesor) fallan por errores 403 en consola. **Preexistente**: las mismas pruebas fallan localmente en `main` @ `8588296` sin este cambio (9 fallos) y pasaron en el CI del PR #307. Se confía en el CI. |
| `python scripts/build_system_inventory.py --write` y `pytest tests/spec_governance` | ✅ 61 pruebas |

## Fuera de alcance

- Reorganizar la lista por estado, jerarquía de la tarjeta, avance por evaluación (requiere backend) y fechas relativas: van en su propia especificación.
- No se probó en un teléfono físico.
