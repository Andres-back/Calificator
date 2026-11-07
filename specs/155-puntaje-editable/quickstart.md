# Validación: Spec 155

Entorno local: Windows 11, Python 3.13 y Chromium. Las pruebas de integración con PostgreSQL y WebKit se ejecutan en CI.

## Pruebas primero: RED

| Prueba | Resultado con el código anterior |
| --- | --- |
| `pytest tests/unit/test_score_plan_deliveries.py` | ❌ 3 de 3 fallan: la lectura no informa las entregas |
| `vitest GenerationWizard.test.tsx -t 155` | ❌ 7 de 8 fallan. La octava comprueba que una evaluación sin guardar sigue editable |

`scoreEditing.test.ts` se escribió antes que su módulo, pero no se registró una ejecución en rojo: el módulo no existía.

## Después de la corrección: GREEN

| Comando | Resultado |
| --- | --- |
| `pytest tests/unit/test_score_plan_deliveries.py tests/unit/test_score_allocation.py` | ✅ 26 |
| `vitest src/modules/evaluaciones` | ✅ 239 |
| `tsc --noEmit` y `eslint` de los archivos cambiados | ✅ sin errores |
| `playwright test evaluation-score-editing evaluation-score-allocation --project=chromium` | ✅ 18 |
| `build_system_inventory.py --write` y `pytest tests/spec_governance` | ✅ inventario vigente y 67 pruebas |

## Pendiente

- Confirmar en un celular real que aparece el teclado numérico. La prueba E2E comprueba `inputmode="decimal"` y que el campo se puede editar.

## Cobertura de requisitos

| Requisito | Evidencia |
| --- | --- |
| FR-001 y FR-002 (escribir, teclado decimal, coma) | `155 pregunta nueva` en E2E, `scoreEditing.test.ts` y el editor en Vitest |
| FR-003 (valor inválido) | `un valor inválido se explica` |
| FR-004 y FR-005 (suma y ajuste) | `ajustar conserva la pregunta abierta`, `explica cuando no se puede ajustar` y `adjustOtherScores` |
| FR-006 (protección) | `con entregas sigue protegido`, `mientras comprueba`, `si la comprobación falla` y su E2E |
| FR-007 (dato de entregas) | `test_score_plan_deliveries.py` |
| FR-008 (notas intactas) | sin escrituras en la lectura; sin guardar hasta "Guardar cambios"; `evaluation-score-allocation` sigue en verde |
