# Validación: Spec 170

Entorno: Windows 11, Node 22 y Vitest con jsdom. Datos sintéticos, sin API real en las pruebas. La comprobación en el navegador usó la aplicación local con usuarios sintéticos.

## Pruebas primero: RED

| Prueba (en `frontend/`) | Resultado antes de la corrección (`main` @ `3ddc2d3`) |
| --- | --- |
| `npx vitest run src/modules/evaluaciones/components/GenerationWizard.test.tsx -t "170"` | ❌ 2 de 3 fallan: tras el fallo el contenido no vuelve al inicio, y el aviso de guardado dice «revisa tu conexión» en vez del motivo. La tercera protege el aviso de conexión |

## Después de la corrección: GREEN

| Comando (en `frontend/`) | Resultado |
| --- | --- |
| `npx vitest run src/modules/evaluaciones/components/GenerationWizard.test.tsx -t "170"` | ✅ 3 |
| `npx vitest run src/modules/evaluaciones` | ✅ 263 en 33 archivos |
| `npx tsc --noEmit` y `npx eslint` de los dos archivos cambiados | ✅ |
| `python scripts/build_system_inventory.py --check` y `pytest tests/spec_governance` (en la raíz) | ✅ |

## Comprobación en el navegador

Aplicación local. Se abrió «Editar preguntas», se cambió un enunciado, se modificó la evaluación desde fuera para dejar el editor desactualizado, se desplazó el contenido hasta el final (944 px) y se pulsó «Guardar cambios»:

| Antes | Después |
| --- | --- |
| aviso «…revisa tu conexión y vuelve a guardar», arriba y fuera de la vista | aviso «No pudimos guardar los cambios. La evaluación cambió. Conservamos tu edición; vuelve a abrirla con la versión actual antes de guardar. Tu edición se conserva aquí.», con el contenido en 0 px y la cabecera del modal en su sitio |

## Cobertura de requisitos

| Requisito | Evidencia |
| --- | --- |
| FR-001 (aviso a la vista) | `lleva a la vista el aviso cuando falla la generación` y `muestra el motivo del backend cuando rechaza el guardado y lo lleva a la vista` |
| FR-002 (motivo del servidor) | `muestra el motivo del backend cuando rechaza el guardado…` |
| FR-003 (sin respuesta, aviso de conexión) | `sin respuesta del servidor conserva el aviso de conexión` y la prueba previa `096 retains changes on save failure…` |
| FR-004 (edición conservada) | las pruebas anteriores comprueban el enunciado escrito y el botón habilitado |
| FR-005 (regresión) | la tabla RED |

## Observaciones

- El fallo al generar no se repitió en el navegador con esta rama: el proveedor local respondía. Lo cubre la prueba de componente.
- Una primera versión usaba `scrollIntoView`. En esa prueba manual la cabecera del modal quedó desplazada, pero el guion de prueba también había movido el modal, así que no quedó demostrado que la causa fuera `scrollIntoView`. La versión final mueve solo el contenido del asistente, que no puede tener ese efecto.
- La corrección no cambia el backend ni filas de producción.
