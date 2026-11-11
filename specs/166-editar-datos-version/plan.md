# Plan: «Editar datos» funciona después de repartir puntos, imprimir o copiar

**Spec**: [spec.md](spec.md) | **Issue**: [#350](https://github.com/Andres-back/Calificator/issues/350) | **Tipo**: hotfix (no requiere `plan-approved`)

## Diagnóstico

Reproducido en local sobre `4c83bb6` el 2026-11-10:

- `MateriaEvaluaciones.handleSubmit` envía nombre, descripción, nota máxima, modalidad y fecha límite, sin `expected_updated_at` ni `expected_content_version_id`.
- En `update_evaluation`, una evaluación con `contenido_version_id` pasa por `visual_service.prepare_content_edit`, que responde 409 si `expected_updated_at` falta o si la versión esperada no coincide.
- La evaluación recibe `contenido_version_id` al guardar el reparto (`score_service`), al preparar la impresión (`print_service`) y al copiarla (`copy_service`).
- La misma petición con los dos campos respondió 200 en local, sobre una evaluación publicada con una entrega.
- Los demás editores ya los envían: `EvaluacionesPage`, `EvaluationCriteriaEditor`, `EvaluationPrintPanel` y `GenerationWizard`.

## Decisión

Solo frontend: `handleSubmit` añade `expected_updated_at: editingEval.updated_at` y, si existe, `expected_content_version_id: editingEval.contenido_version_id`, igual que `EvaluacionesPage`.

Descartado:

- **Relajar la comprobación en el backend**: protege contra sobrescribir una edición más reciente y la usan los demás editores.
- **Unificar los dos formularios de «Editar datos»** (materia y página general): es un cambio mayor que no cabe en un hotfix.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `frontend/src/modules/materias/MateriaEvaluaciones.tsx` | enviar la versión esperada al guardar |
| `frontend/src/modules/materias/MateriaEvaluaciones.test.tsx` | prueba de regresión del cuerpo enviado y del rechazo |

Sin backend, sin migraciones y sin cambios de datos.

## Riesgos

- Guardar «Editar datos» en una evaluación con versión crea una versión de contenido nueva, como ya ocurre desde la página general. Las entregas conservan la versión que tenían.
- Si la lista está desactualizada porque la evaluación cambió en otra pestaña, el docente verá el aviso de conflicto, ahora con motivo real, y tendrá que reabrir el formulario.
