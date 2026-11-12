# Validación: Spec 169

Entorno: Windows 11, Node 22 y Vitest con jsdom. Solo cambia una prueba.

## Diagnóstico: RED

| Evidencia | Resultado |
| --- | --- |
| CI de `main` del 2026-11-10 (ejecución 42903234351, primer intento) | ❌ `GenerationWizard.test.tsx › warns clearly when editing an already assigned evaluation…`: `expect(element).toBeVisible()`. Pasó al repetir |
| CI de los PR #352 y #354 del 2026-11-11 (ejecuciones 42967026665 y 42967696525, primer intento) | ❌ el mismo fallo, en cambios que no tocan el aviso |
| Prueba temporal que mide los contenedores del aviso (no se sube) | Justo después de renderizar: dos `div` con `opacity: 0` en línea. 800 ms después: ninguno |
| `npx vitest run src/modules/evaluaciones/components/GenerationWizard.test.tsx`, 6 veces, antes del cambio | ✅ 6 de 6: en local la animación termina a tiempo, por eso el fallo no se reproduce aquí |

## Después de la corrección: GREEN

| Comando (en `frontend/`) | Resultado |
| --- | --- |
| `npx vitest run src/modules/evaluaciones/components/GenerationWizard.test.tsx`, 3 veces | ✅ 3 de 3 |
| `npx vitest run src/modules/evaluaciones` | ✅ 260 en 33 archivos |
| `npx tsc --noEmit` y `npx eslint` del archivo cambiado | ✅ |
| `python scripts/build_system_inventory.py --check` y `pytest tests/spec_governance` (en la raíz) | ✅ |

## Cobertura de requisitos

| Requisito | Evidencia |
| --- | --- |
| FR-001 (esperar la visibilidad) | la comprobación va dentro de `waitFor` |
| FR-002 (sigue fallando si no es visible) | `waitFor` agota su espera y falla con el mismo mensaje |
| FR-003 (sin cambios de producto) | el único archivo de código cambiado es la prueba |

## Observaciones

- ⚠️ El fallo no se reprodujo en local. La confirmación es que la CI de este PR pase sin repetir el trabajo, y aun así una sola ejecución no demuestra que el fallo intermitente desapareció.
- Otras pruebas del proyecto pueden comprobar la visibilidad sin esperar la animación del modal. No se revisaron.
