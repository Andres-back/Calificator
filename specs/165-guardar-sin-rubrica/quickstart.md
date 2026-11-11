# Validación: Spec 165

Entorno: Windows 11, Node 22 y Vitest con jsdom. Datos sintéticos, sin API real en las pruebas. La comprobación en el navegador usó la aplicación local con usuarios sintéticos.

## Pruebas primero: RED

| Prueba (en `frontend/`) | Resultado antes de la corrección (`main` @ `3ddc2d3`) |
| --- | --- |
| `npx vitest run src/modules/evaluaciones/components/generationWizardModel.test.ts -t "165"` | ❌ 2 de 3 fallan: `useRubric` es `true` con peso cero, y `criteriaWithoutRubric` no existe. La tercera protege que una rúbrica real siga encendida |
| `npx vitest run src/modules/evaluaciones/components/GenerationWizard.test.tsx -t "165"` | ❌ 1 de 1: aparece «el peso debe ser mayor que cero» |

## Después de la corrección: GREEN

| Comando (en `frontend/`) | Resultado |
| --- | --- |
| Las dos órdenes anteriores | ✅ 3 y 1 |
| `npx vitest run src/modules/evaluaciones` | ✅ 264 en 33 archivos |
| `npx tsc --noEmit` | ✅ |
| `npx eslint` de los cuatro archivos cambiados | ✅ |
| `python scripts/build_system_inventory.py --check` y `pytest tests/spec_governance` (en la raíz) | ✅ |

## Comprobación en el navegador

Aplicación local, evaluación generada sin rúbrica, guardada con pesos en cero por el código anterior, publicada y con una entrega:

| Paso | Antes | Después |
| --- | --- | --- |
| Más opciones › «Editar preguntas» | aviso «Criterio 1: el peso debe ser mayor que cero» y «Guardar cambios» deshabilitado | sin aviso y botón habilitado |
| Cambiar el enunciado de una pregunta y guardar | no se podía | 200; el asistente se cierra |

## Cobertura de requisitos

| Requisito | Evidencia |
| --- | --- |
| FR-001 (rúbrica solo con peso o niveles) | `se abre con la rúbrica apagada…`, `conserva la rúbrica encendida…` y `165 reabre una evaluación generada sin rúbrica…` |
| FR-002 (sin pesos al guardar sin rúbrica) | `sin rúbrica no envía pesos ni puntajes por criterio…` |
| FR-003 (con rúbrica no cambia) | `conserva la rúbrica encendida…` y las pruebas existentes de la rúbrica editable |
| FR-004 (regresión) | la tabla RED |

## Observaciones

- Al editar, el asistente envía solo los campos que cambian. Los pesos en cero ya guardados se quedan como están y la lectura los ignora.
- No se comprobó el primer guardado de una evaluación recién generada contra un modelo real: la generación local usó un sustituto con contenido fijo.
- La corrección no cambia el backend ni filas de producción.
