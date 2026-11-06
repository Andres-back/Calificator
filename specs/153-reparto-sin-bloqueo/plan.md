# Plan: El reparto de puntos no bloquea publicar ni editar

**Spec**: [spec.md](spec.md) | **Issue**: [#323](https://github.com/Andres-back/Calificator/issues/323) | **Tipo**: hotfix (no requiere `plan-approved`)

## Diagnóstico

Evidencia de producción, de una evaluación digitalizada en borrador, consultada en modo de solo lectura el 2026-11-06:

- El primer rechazo fue correcto: los puntajes sumaban 6.00 sobre una nota máxima de 5.00.
- Después del reparto, las tres versiones tienen `coverage_json = {}` y `contenido_visual` nulo. `score_service.save_scoring_definition` crea la primera así y las demás lo copian.
- `publish_evaluation` exige `coverage_json.estado == "completa"`, por lo que responde 409 en cada intento.
- Ejecutar las demás validaciones de publicación sobre esa evaluación, sin guardar, no encontró otro bloqueo.
- Con una versión, una edición pasa por `prepare_content_edit`, que exige manifiesto o documento (422). `save_content_revision` también exige `contenido_id`, que las preguntas digitalizadas no tienen.

## Decisión

- `publish_evaluation` exige cobertura solo si `snapshot_json.contenido_visual` no es nulo.
- `prepare_content_edit` y `save_content_revision` aceptan una edición de solo texto cuando ya hay versión anterior y no hay material ni documento. La versión resultante ya guarda cobertura `completa`, el valor actual cuando no hay manifiesto.

Descartado:

- Corregir `coverage_json` en las filas de producción: las versiones tienen hash y son historial. La corrección de código basta sin tocar datos.
- Cambiar también la versión base de `score_service`: el valor vacío deja de afectar a la publicación, así que no aporta nada.
- Asignar `contenido_id` a las preguntas al editar: cambiaría el contenido académico de una edición que no lo pide.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/evaluaciones/service.py` | la cobertura se exige solo con material |
| `backend/app/modules/evaluaciones/visual_service.py` | edición de solo texto con versión anterior |
| `backend/tests/unit/test_score_revision_without_material.py` | pruebas de regresión |

Sin migraciones, sin rutas nuevas, sin cambios de frontend y sin cambios de datos.

## Riesgos

- Una evaluación con entregas y este tipo de versión también podrá editar su texto. Es lo mismo que ya permiten las evaluaciones con material, y las entregas conservan su versión.
- No hay prueba de integración de la secuencia completa con PostgreSQL. La cobertura es unitaria, por etapas.
