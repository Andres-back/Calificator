# Validación: Spec 150, PR 1 (Historias 1 y 2)

Entorno: Windows 11 y Chromium. Pruebas con datos simulados, sin API ni datos reales. WebKit y el resto de navegadores los valida el CI.

## Pruebas primero: RED

| Prueba (en `frontend/`) | Resultado con el código anterior |
| --- | --- |
| `vitest run gradePresentation.test.ts GradeFinalEditor.test.tsx` | ❌ 13 fallan: no existía `tieOptions` ni la pregunta en el editor |
| `playwright test e2e/grade-tie-decision.spec.ts --project=chromium` | ❌ 5 de 6 fallan. La que pasa es "una nota sin empate se confirma sin pregunta", que debe pasar en ambos casos |

## Después de la corrección: GREEN

| Comando | Resultado |
| --- | --- |
| `playwright test e2e/grade-tie-decision.spec.ts --project=chromium` | ✅ 6 |
| `vitest run` | ✅ 1455 |
| `tsc --noEmit` y `eslint src --max-warnings=0` | ✅ |
| `playwright test` de `explainable-grading`, `grade-direct-review`, `grade-review-mosaic` y `grade-tie-decision` en Chromium | 52 de 53. ⚠️ "docente comprende fórmula y pregunta en 1366px" falló en la tanda y pasó al repetirla sola |

## Cobertura de requisitos

| Requisito | Evidencia |
| --- | --- |
| FR-001 (una sola regla) | `tieOptions` en `gradePresentation.test.ts`, escalas 5, 10, 100 y 4.5 |
| FR-002 (pedir y enviar) | E2E de confirmar y de establecer nota; `GradeFinalEditor.test.tsx` |
| FR-003 (sin preselección) | E2E de confirmar; `GradeFinalEditor.test.tsx` |
| FR-004 (nota pendiente) | E2E en escritorio y móvil |
| FR-005 (cifra decidida) | `gradePresentation.test.ts`; E2E de nota decidida (solo la nota principal del detalle) |
| FR-008 (sin empate, igual) | E2E sin empate y las pruebas existentes |
| FR-009 (regresión) | la tabla RED |

FR-006 y FR-007 corresponden al PR 2.

## Observaciones

- Guardar la retroalimentación de una nota en empate sin decisión también pregunta, porque el backend la exige. Si ya hay decisión, se reenvía la misma. Este camino no tiene prueba E2E propia.
- "Establecer nota" pasa de un decimal a dos (`step="0.01"`). Con un decimal era imposible escribir 2.95, así que la pregunta nunca aparecería.
- Hasta el PR 2, la lista de estudiantes, el boletín y las demás pantallas siguen mostrando 2.95 aunque exista una decisión.
