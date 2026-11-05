# Validación: Spec 145

Entorno: Windows 11, Node con dependencias de `frontend/package-lock.json`, Python 3.11 y Chromium headless de Playwright. Datos sintéticos en todos los casos; sin backend real ni datos personales.

## Pruebas primero: RED

| Prueba | Resultado con `main` @ `1b82884` |
| --- | --- |
| `npx vitest run src/modules/calificaciones/gradePresentation.test.ts` | ❌ 9 fallos. Por ejemplo, 2.94 se mostraba "2.94" en vez de "2.9", 4.67 como "4.67" en vez de "4.7", y 2.95 sobre 10 como "2.95" en vez de "3.0". |
| `npx vitest run src/modules/calificaciones/StudentResultCard.test.tsx` | ❌ 1.15 se mostraba "1.1" (error binario de `toFixed`) y 2.95 se mostraba "3.0" (el sistema decidía el empate). |
| `npx vitest run src/modules/evaluaciones/studentProgress.test.ts` | ❌ el estudiante veía "Calificada: 3.0 / 5.0" para un 2.95 que el docente veía "2.95". |
| `pytest tests/unit/test_xali_delivered_max_grade.py` (backend) | Sin el campo, `nota_maxima` llega vacío y la aserción `== 5.00` falla. |

## Después de la corrección: GREEN

| Comando | Resultado |
| --- | --- |
| Pruebas anteriores | ✅ 34 pruebas en frontend y 2 en backend |
| `npm run test:run` (frontend) | ✅ 203 archivos, 1441 pruebas, tras actualizar `MateriaBoletin.test.tsx` (4.67 → 4.7) |
| `npm run lint` y `npm run typecheck` | ✅ sin errores ni advertencias |
| `npx playwright test e2e/p2-responsive.spec.ts -g "boletín docente en mosaico"` | ✅ 8 pruebas (384 y 1440 px, claro y oscuro), con la expectativa actualizada a "4.7 / 5.0" |
| `npx playwright test` de `explainable-grading`, `feedback-delivery`, `grade-direct-review`, `review-grade-csv` y `evaluation-preview` | ✅ 78 pruebas |
| `python scripts/build_system_inventory.py --write` y `pytest tests/spec_governance` | ✅ 61 pruebas |

## Análisis de cobertura (analyze y converge)

- Cada requisito (FR-001 a FR-006) está cubierto por al menos una tarea en `tasks.md` y por una prueba.
- **SC-001** (misma cifra): se comprueba con la función compartida. Todas las vistas de nota final la usan, y en `frontend/src` solo quedan `toFixed(1)` sobre notas en vistas de auditoría fuera de alcance (FR-005):
  - la comparación de calificadores A/B;
  - la línea de tiempo del historial (`timeline.ts`, nota anterior → nueva);
  - el mensaje de rango al escribir una nota.

  **Observación para una spec posterior:** la línea de tiempo usa `toFixed(1)` con el error binario, así que un cambio de 2.95 a 3.0 podría verse "3.0 → 3.0". Conviene pasarla a `formatScoreDetail` cuando se trabaje el historial.
- **SC-002** (valores de referencia): tabla en `gradePresentation.test.ts`.
- **SC-003** (sin decidir el empate): 2.95/5, 5.95/10, 59.95/100 y 2.65/4.5 conservan dos decimales.
- **FR-005** (auditoría): fórmula, historial, editor de puntajes, nota anterior y aviso de diferencia IA/cálculo siguen con dos decimales, con `formatScoreDetail` o su presentación propia. Los E2E de `explainable-grading` ("3.50 / 5", "0.70 / 1.00") siguen pasando.

## Fuera de alcance

- Regla al confirmar y detección del empate en backend, y `tasa_aprobacion` de analítica sobre la nota redondeada: spec posterior.
- Pregunta al docente (2.9 o 3.0) al confirmar un empate: spec posterior.
- Promedios del curso (panel del estudiante y analítica).
- No se probó en un teléfono físico.
