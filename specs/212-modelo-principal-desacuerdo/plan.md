# Plan: En un desacuerdo entre modelos vale el modelo principal

**Spec**: [spec.md](spec.md) | **Issue**: [#445](https://github.com/Andres-back/Calificator/issues/445)

## Decisión

El desglose por pregunta es la autoridad. La regla del modelo principal se aplica ahí, y el estado de la calificación se ajusta al final según lo que el desglose no pudo resolver.

- **Consenso por pregunta** (`breakdown_policy.component_consensus`): nueva rama antes de «sin consenso». Si A está valorada y hay diferencia material o B quedó pendiente, se usa A con origen `modelo_principal`.
- **Objeciones** (`breakdown_service._SCORE_CONFLICT_IN_ALERT`): se suman `clave`, `no coincide` y `arbitraje`. En producción, de 373 notas que nombran una pregunta, 105 serían objeciones (antes 54) y las demás, avisos.
- **Notas del verificador**: dejan de agregarse como `verificador_ia:` en los bloqueos. El frontend ya las muestra desde `grader_b.alertas`.
- **Suma por preguntas**: `feedback_quality_guard(..., sum_is_authoritative=True)` devuelve `rebuilt` cuando el único motivo es `nota_global_no_coincide_con_suma`.
- **Estado final**: `review_reasons_outside_breakdown(raw_output)` lista lo que sigue pidiendo revisión: petición del modelo principal, evaluador sin nota, segunda revisión incompleta, piso objetivo, retroalimentación reescrita, cobertura, evidencia gráfica, lectura con revisión o falta de trazabilidad. Si está vacía, la calificación pasa a «sugerida».
- **Frontend** (`buildReviewTriage.classifyReviewComponent`): `modelo_principal` agrega la razón de atención `primary_model_used` y omite las de desacuerdo; la baja confianza solo cuenta la de A. `GradeAnalysisDetails` nombra el origen.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/calificaciones/breakdown_policy.py` | regla, guardián, motivos |
| `backend/app/modules/calificaciones/breakdown_service.py` | objeciones, notas sin bloqueo, estado final |
| `backend/tests/unit/test_modelo_principal_desacuerdo.py` | pruebas nuevas |
| `backend/tests/unit/test_grading_component_consensus.py`, `test_breakdown_persistence.py` | pruebas al día con la regla |
| `frontend/src/modules/calificaciones/review-triage/buildReviewTriage.ts` | atención en vez de bloqueo |
| `frontend/src/modules/calificaciones/components/GradeAnalysisDetails.tsx` | texto del origen |
| `frontend/src/modules/calificaciones/review-triage/primaryModel212.test.ts` | prueba nueva |

## Efecto esperado

Sobre los desgloses de los últimos 30 días: 92 preguntas pendientes tendrían puntaje. Unas 17 calificaciones pasarían a «sugerida»; las demás siguen en revisión porque el modelo principal pidió revisión.

## Riesgo

Medio. Una pregunta puede quedar con el puntaje del modelo principal aunque el verificador tuviera razón. Mitigación: las dos valoraciones quedan registradas y visibles, las objeciones concretas siguen pendientes y ninguna nota se publica sin confirmación docente.
