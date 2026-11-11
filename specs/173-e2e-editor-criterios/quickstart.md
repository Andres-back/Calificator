# Validación: Spec 173

Entorno: Windows 11, Node 22 y Playwright con Chromium. Solo cambia una prueba E2E.

## Diagnóstico: RED

| Evidencia | Resultado |
| --- | --- |
| CI del PR #352, fragmento 3/4 (ejecución 43047961344, primer intento) | ❌ `[chromium] › e2e/resources-responsive.spec.ts:166:1 › 106 criterios mantiene cabecera y acciones dentro del editor`: `expect(received).toBeGreaterThanOrEqual(expected)` |
| Comentario del ayudante `touch` en el mismo archivo | el diálogo «anima desde scale(.96)» |

El fallo no se reprodujo en local.

## Después de la corrección: GREEN

| Comando (en `frontend/`) | Resultado |
| --- | --- |
| `npx playwright test e2e/resources-responsive.spec.ts --project=chromium -g "106 criterios" --repeat-each=5` | ✅ 5 de 5 |
| `npx tsc --noEmit` y `npx eslint e2e/resources-responsive.spec.ts` | ✅ |
| `python scripts/build_system_inventory.py --check` y `pytest tests/spec_governance` (en la raíz) | ✅ |

## Cobertura de requisitos

| Requisito | Evidencia |
| --- | --- |
| FR-001 (medición repetida) | el bloque `expect(async () => { … }).toPass()` de la prueba |
| FR-002 (sigue fallando si queda fuera) | `toPass()` agota su espera y falla con la última aserción |
| FR-003 (sin cambios de producto) | el único archivo de código cambiado es la prueba |

## Observaciones

- ⚠️ Como el fallo es intermitente y no se reprodujo en local, una ejecución en verde de la CI no demuestra que desapareció.
- No se corrió en WebKit en local; lo ejecuta la CI si el proyecto incluye esta prueba.
- Otras pruebas E2E que miden posiciones no se revisaron.
