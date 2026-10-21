# Inventario técnico: 005-evaluaciones

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 71

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `DELETE:/evaluaciones/{evaluacion_id}` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:462` |
| endpoint | `GET:/evaluaciones/contenido-visual/capacidades` | admin, profesor | covered | `backend/app/modules/evaluaciones/visual_router.py:26` |
| endpoint | `GET:/evaluaciones/recursos/{recurso_id}/propuesta` | admin, profesor | covered | `backend/app/modules/evaluaciones/visual_router.py:173` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}` | admin, estudiante, profesor | covered | `backend/app/modules/evaluaciones/router.py:282` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/actividad` | admin, estudiante, profesor | covered | `backend/app/modules/evaluaciones/router.py:292` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/calificaciones` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:785` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/docx` | admin, estudiante, profesor | covered | `backend/app/modules/evaluaciones/router.py:371` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/mi-desglose` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:1752` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/mi-entrega` | admin, estudiante | covered | `backend/app/modules/calificaciones/router.py:1115` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/mi-solicitud-revision` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:1583` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/original` | admin, estudiante, profesor | covered | `backend/app/modules/evaluaciones/visual_router.py:211` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/pdf` | admin, estudiante, profesor | covered | `backend/app/modules/evaluaciones/router.py:341` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/recursos/{recurso_id}` | admin, estudiante, profesor | covered | `backend/app/modules/evaluaciones/visual_router.py:191` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/revision` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:761` |
| endpoint | `PATCH:/evaluaciones/{evaluacion_id}` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:395` |
| endpoint | `PATCH:/evaluaciones/{evaluacion_id}/respuestas-liberadas` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1739` |
| endpoint | `PATCH:/evaluaciones/{evaluacion_id}/validar-estructura` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:473` |
| endpoint | `POST:/evaluaciones` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:256` |
| endpoint | `POST:/evaluaciones/externa/digitalizar` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:236` |
| endpoint | `POST:/evaluaciones/externa/digitalizar-con-archivo` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:97` |
| endpoint | `POST:/evaluaciones/generar-borrador` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:222` |
| endpoint | `POST:/evaluaciones/recursos` | admin, profesor | covered | `backend/app/modules/evaluaciones/visual_router.py:144` |
| endpoint | `POST:/evaluaciones/recursos/estructurado` | admin, profesor | covered | `backend/app/modules/evaluaciones/visual_router.py:70` |
| endpoint | `POST:/evaluaciones/recursos/generar` | admin, profesor | covered | `backend/app/modules/evaluaciones/visual_router.py:90` |
| endpoint | `POST:/evaluaciones/recursos/recortar` | admin, profesor | covered | `backend/app/modules/evaluaciones/visual_router.py:49` |
| endpoint | `POST:/evaluaciones/referencia/extraer` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:57` |
| endpoint | `POST:/evaluaciones/sorpresa` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:246` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/activar-recepcion` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:440` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/calificaciones/manual` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:744` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/cerrar` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:429` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/crear-blueprint` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:407` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/iniciar-entrega` | admin, estudiante | covered | `backend/app/modules/calificaciones/router.py:1153` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/pausar-recepcion` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:451` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/publicar` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:418` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/solicitud-revision` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:1600` |
| frontend_route | `/app/evaluaciones` | authenticated | covered | `frontend/src/config/routes.ts:43` |
| frontend_route | `/app/materias/{id}/evaluaciones` | authenticated | covered | `frontend/src/config/routes.ts:35` |
| frontend_call | `DELETE:/evaluaciones/{id}` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:119` |
| frontend_call | `GET:/evaluaciones/recursos/{id}/propuesta` | admin, profesor | covered | `frontend/src/modules/evaluaciones/visualApi.ts:35` |
| frontend_call | `GET:/evaluaciones/{evaluacionId}/actividad` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:143` |
| frontend_call | `GET:/evaluaciones/{evaluacionId}/calificaciones` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:10` |
| frontend_call | `GET:/evaluaciones/{evaluacionId}/mi-desglose` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:213` |
| frontend_call | `GET:/evaluaciones/{evaluacionId}/mi-entrega` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:134` |
| frontend_call | `GET:/evaluaciones/{evaluacionId}/mi-solicitud-revision` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:176` |
| frontend_call | `GET:/evaluaciones/{evaluacionId}/{format}` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:162` |
| frontend_call | `GET:/evaluaciones/{evaluationId}/original` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:71` |
| frontend_call | `GET:/evaluaciones/{evaluationId}/recursos/{resourceId}` | estudiante | covered | `frontend/src/modules/evaluaciones/api.ts:64` |
| frontend_call | `GET:/evaluaciones/{evaluationId}/revision` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:15` |
| frontend_call | `GET:/evaluaciones/{id}` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:60` |
| frontend_call | `GET:/jobs/{id}` | ambiguous | covered | `frontend/src/modules/evaluaciones/visualApi.ts:32` |
| frontend_call | `PATCH:/evaluaciones/{evaluacionId}/respuestas-liberadas` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:192` |
| frontend_call | `PATCH:/evaluaciones/{id}` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:99` |
| frontend_call | `POST:/evaluaciones/externa/digitalizar-con-archivo` | ambiguous | covered | `frontend/src/modules/evaluaciones/components/DigitalizarEvaluacionModal.tsx:33` |
| frontend_call | `POST:/evaluaciones/generar-borrador` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:81` |
| frontend_call | `POST:/evaluaciones/recursos/estructurado` | admin, profesor | covered | `frontend/src/modules/evaluaciones/visualApi.ts:24` |
| frontend_call | `POST:/evaluaciones/recursos/generar` | admin, profesor | covered | `frontend/src/modules/evaluaciones/visualApi.ts:30` |
| frontend_call | `POST:/evaluaciones/recursos/recortar` | admin, profesor | covered | `frontend/src/modules/evaluaciones/visualApi.ts:27` |
| frontend_call | `POST:/evaluaciones/recursos` | ambiguous | covered | `frontend/src/modules/evaluaciones/visualApi.ts:21` |
| frontend_call | `POST:/evaluaciones/referencia/extraer` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:95` |
| frontend_call | `POST:/evaluaciones/{evaluacionId}/calificaciones/manual` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:28` |
| frontend_call | `POST:/evaluaciones/{evaluacionId}/solicitud-revision` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:183` |
| frontend_call | `POST:/evaluaciones/{id}/activar-recepcion` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:111` |
| frontend_call | `POST:/evaluaciones/{id}/cerrar` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:107` |
| frontend_call | `POST:/evaluaciones/{id}/pausar-recepcion` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:115` |
| frontend_call | `POST:/evaluaciones/{id}/publicar` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:103` |
| frontend_call | `POST:/evaluaciones` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:77` |
| frontend_call | `POST:/jobs/{id}/cancelar` | ambiguous | covered | `frontend/src/modules/evaluaciones/visualApi.ts:33` |
| table | `evaluacion_blueprints` | system | covered | `backend/app/modules/evaluaciones/models.py:142` |
| table | `evaluacion_contenido_versiones` | system | covered | `backend/app/modules/evaluaciones/models.py:234` |
| table | `evaluacion_recursos` | system | covered | `backend/app/modules/evaluaciones/models.py:190` |
| table | `evaluaciones` | system | covered | `backend/app/modules/evaluaciones/models.py:19` |

## Decisiones explícitas de permiso

- `backend:GET:/evaluaciones/{evaluacion_id}/docx` — La exportación reutiliza la autorización de lectura y propiedad de PDF; matrícula y publicación siguen validadas por el servicio y soluciones denegadas a estudiante o docente ajeno. ([issue](https://github.com/Andres-back/Calificator/issues/169)). Evidencia: `backend/tests/unit/test_evaluation_exports.py`.
- `backend:GET:/evaluaciones/{evaluacion_id}/pdf` — La autorización compartida exige evaluations.read y ensure_can_read_evaluation; el solucionario solo admite propietario docente o administrador autorizado. ([issue](https://github.com/Andres-back/Calificator/issues/169)). Evidencia: `backend/tests/unit/test_evaluation_exports.py`.
- `backend:POST:/evaluaciones/recursos/estructurado` — _proposal_scope exige evaluations.create/update y gestión de la materia/evaluación; no basta estar autenticado. ([issue](https://github.com/Andres-back/Calificator/issues/211)). Evidencia: `backend/tests/integration/test_evaluation_visual_permissions.py`.
- `backend:POST:/evaluaciones/recursos/generar` — La ruta y el worker comprueban permiso de edición/creación y gestión de materia antes de inferir. ([issue](https://github.com/Andres-back/Calificator/issues/211)). Evidencia: `backend/tests/integration/test_evaluation_visual_permissions.py`, `backend/tests/unit/test_evaluation_visual_generation.py`.
- `backend:POST:/evaluaciones/recursos/recortar` — _proposal_scope comprueba gestión y el recorte exige recurso del mismo ámbito; no es contenido público. ([issue](https://github.com/Andres-back/Calificator/issues/211)). Evidencia: `backend/tests/integration/test_evaluation_visual_permissions.py`.
- `frontend_call:GET:/evaluaciones/recursos/{id}/propuesta:frontend/src/modules/evaluaciones/visualApi.ts` — Vista previa privada del editor; el estudiante recibe únicamente recursos publicables por otra ruta. ([issue](https://github.com/Andres-back/Calificator/issues/211)). Evidencia: `backend/tests/integration/test_evaluation_visual_permissions.py`, `frontend/e2e/mock/evaluation-visuals.mock.spec.ts`.
- `frontend_call:POST:/evaluaciones/recursos/estructurado:frontend/src/modules/evaluaciones/visualApi.ts` — Cliente del editor docente habilitado por permisos/capacidades; /recursos/ no designa aquí el reproductor estudiante. ([issue](https://github.com/Andres-back/Calificator/issues/211)). Evidencia: `frontend/src/modules/evaluaciones/components/QuestionVisualEditor.test.tsx`, `backend/tests/integration/test_evaluation_visual_permissions.py`.
- `frontend_call:POST:/evaluaciones/recursos/generar:frontend/src/modules/evaluaciones/visualApi.ts` — Propuestas opcionales del editor docente, no generación desde el flujo estudiante. ([issue](https://github.com/Andres-back/Calificator/issues/211)). Evidencia: `frontend/src/modules/evaluaciones/components/QuestionVisualEditor.test.tsx`, `frontend/e2e/mock/evaluation-visuals.mock.spec.ts`.
- `frontend_call:POST:/evaluaciones/recursos/recortar:frontend/src/modules/evaluaciones/visualApi.ts` — Solo el editor docente de material privado usa este cliente; el servidor vuelve a comprobar propiedad. ([issue](https://github.com/Andres-back/Calificator/issues/211)). Evidencia: `backend/tests/integration/test_evaluation_visual_permissions.py`.

## Hallazgos

- **medium · contract_mismatch**: 5 llamadas frontend no tienen endpoint backend canónico coincidente en el análisis estático.
