# Inventario técnico: 005-evaluaciones

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 85

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `DELETE:/evaluaciones/{evaluacion_id}` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:488` |
| endpoint | `GET:/evaluaciones/contenido-visual/capacidades` | admin, profesor | covered | `backend/app/modules/evaluaciones/visual_router.py:26` |
| endpoint | `GET:/evaluaciones/copias/{job_id}` | admin, profesor | covered | `backend/app/modules/evaluaciones/copy_router.py:36` |
| endpoint | `GET:/evaluaciones/impresion/{job_id}/pdf` | authenticated | covered | `backend/app/modules/evaluaciones/router.py:57` |
| endpoint | `GET:/evaluaciones/recursos/{recurso_id}/propuesta` | admin, profesor | covered | `backend/app/modules/evaluaciones/visual_router.py:183` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}` | admin, estudiante, profesor | covered | `backend/app/modules/evaluaciones/router.py:308` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/actividad` | admin, estudiante, profesor | covered | `backend/app/modules/evaluaciones/router.py:318` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/calificaciones` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:848` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/docx` | admin, estudiante, profesor | covered | `backend/app/modules/evaluaciones/router.py:397` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/mi-desglose` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:1853` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/mi-entrega` | admin, estudiante | covered | `backend/app/modules/calificaciones/router.py:1179` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/mi-solicitud-revision` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:1684` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/original` | admin, estudiante, profesor | covered | `backend/app/modules/evaluaciones/visual_router.py:221` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/pdf` | admin, estudiante, profesor | covered | `backend/app/modules/evaluaciones/router.py:367` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/recuperacion-documental` | authenticated | covered | `backend/app/modules/evaluaciones/copy_router.py:15` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/recursos/{recurso_id}` | admin, estudiante, profesor | covered | `backend/app/modules/evaluaciones/visual_router.py:201` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/revision` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:824` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/ultima-copia` | admin, profesor | covered | `backend/app/modules/evaluaciones/copy_router.py:22` |
| endpoint | `PATCH:/evaluaciones/{evaluacion_id}` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:421` |
| endpoint | `PATCH:/evaluaciones/{evaluacion_id}/respuestas-liberadas` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1840` |
| endpoint | `PATCH:/evaluaciones/{evaluacion_id}/validar-estructura` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:499` |
| endpoint | `POST:/evaluaciones` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:281` |
| endpoint | `POST:/evaluaciones/externa/digitalizar` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:259` |
| endpoint | `POST:/evaluaciones/externa/digitalizar-con-archivo` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:119` |
| endpoint | `POST:/evaluaciones/generar-borrador` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:245` |
| endpoint | `POST:/evaluaciones/impresion/preparar` | authenticated | covered | `backend/app/modules/evaluaciones/router.py:46` |
| endpoint | `POST:/evaluaciones/recursos` | admin, profesor | covered | `backend/app/modules/evaluaciones/visual_router.py:154` |
| endpoint | `POST:/evaluaciones/recursos/estructurado` | admin, profesor | covered | `backend/app/modules/evaluaciones/visual_router.py:71` |
| endpoint | `POST:/evaluaciones/recursos/generar` | admin, profesor | covered | `backend/app/modules/evaluaciones/visual_router.py:91` |
| endpoint | `POST:/evaluaciones/recursos/recortar` | admin, profesor | covered | `backend/app/modules/evaluaciones/visual_router.py:50` |
| endpoint | `POST:/evaluaciones/referencia/extraer` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:79` |
| endpoint | `POST:/evaluaciones/sorpresa` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:270` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/activar-recepcion` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:466` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/calificaciones/manual` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:807` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/cerrar` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:455` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/copiar` | admin, profesor | covered | `backend/app/modules/evaluaciones/copy_router.py:29` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/crear-blueprint` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:433` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/iniciar-entrega` | admin, estudiante | covered | `backend/app/modules/calificaciones/router.py:1217` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/pausar-recepcion` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:477` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/publicar` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:444` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/solicitud-revision` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:1701` |
| frontend_route | `/app/evaluaciones` | authenticated | covered | `frontend/src/config/routes.ts:43` |
| frontend_route | `/app/materias/{id}/evaluaciones` | authenticated | covered | `frontend/src/config/routes.ts:35` |
| frontend_call | `DELETE:/evaluaciones/{id}` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:147` |
| frontend_call | `GET:/evaluaciones/copias/{id}` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:23` |
| frontend_call | `GET:/evaluaciones/impresion/{id}/pdf` | ambiguous | covered | `frontend/src/modules/evaluaciones/printApi.ts:23` |
| frontend_call | `GET:/evaluaciones/recursos/{id}/propuesta` | admin, profesor | covered | `frontend/src/modules/evaluaciones/visualApi.ts:36` |
| frontend_call | `GET:/evaluaciones/{evaluacionId}/actividad` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:171` |
| frontend_call | `GET:/evaluaciones/{evaluacionId}/calificaciones` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:10` |
| frontend_call | `GET:/evaluaciones/{evaluacionId}/mi-desglose` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:241` |
| frontend_call | `GET:/evaluaciones/{evaluacionId}/mi-entrega` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:162` |
| frontend_call | `GET:/evaluaciones/{evaluacionId}/mi-solicitud-revision` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:204` |
| frontend_call | `GET:/evaluaciones/{evaluacionId}/{format}` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:190` |
| frontend_call | `GET:/evaluaciones/{evaluationId}/original` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:99` |
| frontend_call | `GET:/evaluaciones/{evaluationId}/recursos/{resourceId}` | estudiante | covered | `frontend/src/modules/evaluaciones/api.ts:92` |
| frontend_call | `GET:/evaluaciones/{evaluationId}/revision` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:15` |
| frontend_call | `GET:/evaluaciones/{id}/recuperacion-documental` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:10` |
| frontend_call | `GET:/evaluaciones/{id}/ultima-copia` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:15` |
| frontend_call | `GET:/evaluaciones/{id}` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:88` |
| frontend_call | `GET:/jobs/{id}` | ambiguous | covered | `frontend/src/modules/evaluaciones/visualApi.ts:33` |
| frontend_call | `PATCH:/evaluaciones/{evaluacionId}/respuestas-liberadas` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:238` |
| frontend_call | `PATCH:/evaluaciones/{id}` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:127` |
| frontend_call | `POST:/evaluaciones/externa/digitalizar-con-archivo` | ambiguous | covered | `frontend/src/modules/evaluaciones/components/DigitalizarEvaluacionModal.tsx:33` |
| frontend_call | `POST:/evaluaciones/generar-borrador` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:109` |
| frontend_call | `POST:/evaluaciones/impresion/preparar` | ambiguous | covered | `frontend/src/modules/evaluaciones/printApi.ts:14` |
| frontend_call | `POST:/evaluaciones/recursos/estructurado` | admin, profesor | covered | `frontend/src/modules/evaluaciones/visualApi.ts:25` |
| frontend_call | `POST:/evaluaciones/recursos/generar` | admin, profesor | covered | `frontend/src/modules/evaluaciones/visualApi.ts:31` |
| frontend_call | `POST:/evaluaciones/recursos/recortar` | admin, profesor | covered | `frontend/src/modules/evaluaciones/visualApi.ts:28` |
| frontend_call | `POST:/evaluaciones/recursos` | ambiguous | covered | `frontend/src/modules/evaluaciones/visualApi.ts:22` |
| frontend_call | `POST:/evaluaciones/referencia/extraer` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:123` |
| frontend_call | `POST:/evaluaciones/{evaluacionId}/calificaciones/manual` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:28` |
| frontend_call | `POST:/evaluaciones/{evaluacionId}/solicitud-revision` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:211` |
| frontend_call | `POST:/evaluaciones/{id}/activar-recepcion` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:139` |
| frontend_call | `POST:/evaluaciones/{id}/cerrar` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:135` |
| frontend_call | `POST:/evaluaciones/{id}/copiar` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:19` |
| frontend_call | `POST:/evaluaciones/{id}/pausar-recepcion` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:143` |
| frontend_call | `POST:/evaluaciones/{id}/publicar` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:131` |
| frontend_call | `POST:/evaluaciones` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:105` |
| frontend_call | `POST:/jobs/{id}/cancelar` | ambiguous | covered | `frontend/src/modules/evaluaciones/visualApi.ts:34` |
| job | `tasks.copy_evaluation` | system | covered | `backend/app/modules/evaluaciones/copy_worker.py:50` |
| job | `tasks.recover_evaluation_copies` | system | covered | `backend/app/modules/evaluaciones/copy_worker.py:68` |
| table | `evaluacion_blueprints` | system | covered | `backend/app/modules/evaluaciones/models.py:144` |
| table | `evaluacion_contenido_versiones` | system | covered | `backend/app/modules/evaluaciones/models.py:236` |
| table | `evaluacion_recursos` | system | covered | `backend/app/modules/evaluaciones/models.py:192` |
| table | `evaluaciones` | system | covered | `backend/app/modules/evaluaciones/models.py:19` |

## Decisiones explícitas de permiso

- `backend:GET:/evaluaciones/copias/{job_id}` — Requiere lectura y creación, identidad del solicitante y gestión del destino. El alumno no obtiene estado privado pese a tener lectura de evaluaciones. ([issue](https://github.com/Andres-back/Calificator/issues/270)). Evidencia: `backend/tests/integration/test_evaluation_copy.py`.
- `backend:GET:/evaluaciones/{evaluacion_id}/docx` — La exportación reutiliza la autorización de lectura y propiedad de PDF; matrícula y publicación siguen validadas por el servicio y soluciones denegadas a estudiante o docente ajeno. ([issue](https://github.com/Andres-back/Calificator/issues/169)). Evidencia: `backend/tests/unit/test_evaluation_exports.py`.
- `backend:GET:/evaluaciones/{evaluacion_id}/pdf` — La autorización compartida exige evaluations.read y ensure_can_read_evaluation; el solucionario solo admite propietario docente o administrador autorizado. ([issue](https://github.com/Andres-back/Calificator/issues/169)). Evidencia: `backend/tests/unit/test_evaluation_exports.py`.
- `backend:GET:/evaluaciones/{evaluacion_id}/ultima-copia` — Exige simultáneamente evaluations.read y evaluations.create, además de gestión de fuente y destino. La extracción estática une actores de cada permiso y no representa su intersección. ([issue](https://github.com/Andres-back/Calificator/issues/270)). Evidencia: `backend/tests/integration/test_evaluation_copy.py`.
- `backend:POST:/evaluaciones/recursos/estructurado` — _proposal_scope exige evaluations.create/update y gestión de la materia/evaluación; no basta estar autenticado. ([issue](https://github.com/Andres-back/Calificator/issues/211)). Evidencia: `backend/tests/integration/test_evaluation_visual_permissions.py`.
- `backend:POST:/evaluaciones/recursos/generar` — La ruta y el worker comprueban permiso de edición/creación y gestión de materia antes de inferir. ([issue](https://github.com/Andres-back/Calificator/issues/211)). Evidencia: `backend/tests/integration/test_evaluation_visual_permissions.py`, `backend/tests/unit/test_evaluation_visual_generation.py`.
- `backend:POST:/evaluaciones/recursos/recortar` — _proposal_scope comprueba gestión y el recorte exige recurso del mismo ámbito; no es contenido público. ([issue](https://github.com/Andres-back/Calificator/issues/211)). Evidencia: `backend/tests/integration/test_evaluation_visual_permissions.py`.
- `backend:POST:/evaluaciones/{evaluacion_id}/copiar` — Lectura y creación son acumulativas; ambos extremos deben ser gestionables y del mismo propietario. El contrato de alumno está denegado y no se copian datos académicos. ([issue](https://github.com/Andres-back/Calificator/issues/270)). Evidencia: `backend/tests/integration/test_evaluation_copy.py`.
- `frontend_call:GET:/evaluaciones/recursos/{id}/propuesta:frontend/src/modules/evaluaciones/visualApi.ts` — Vista previa privada del editor; el estudiante recibe únicamente recursos publicables por otra ruta. ([issue](https://github.com/Andres-back/Calificator/issues/211)). Evidencia: `backend/tests/integration/test_evaluation_visual_permissions.py`, `frontend/e2e/mock/evaluation-visuals.mock.spec.ts`.
- `frontend_call:POST:/evaluaciones/recursos/estructurado:frontend/src/modules/evaluaciones/visualApi.ts` — Cliente del editor docente habilitado por permisos/capacidades; /recursos/ no designa aquí el reproductor estudiante. ([issue](https://github.com/Andres-back/Calificator/issues/211)). Evidencia: `frontend/src/modules/evaluaciones/components/QuestionVisualEditor.test.tsx`, `backend/tests/integration/test_evaluation_visual_permissions.py`.
- `frontend_call:POST:/evaluaciones/recursos/generar:frontend/src/modules/evaluaciones/visualApi.ts` — Propuestas opcionales del editor docente, no generación desde el flujo estudiante. ([issue](https://github.com/Andres-back/Calificator/issues/211)). Evidencia: `frontend/src/modules/evaluaciones/components/QuestionVisualEditor.test.tsx`, `frontend/e2e/mock/evaluation-visuals.mock.spec.ts`.
- `frontend_call:POST:/evaluaciones/recursos/recortar:frontend/src/modules/evaluaciones/visualApi.ts` — Solo el editor docente de material privado usa este cliente; el servidor vuelve a comprobar propiedad. ([issue](https://github.com/Andres-back/Calificator/issues/211)). Evidencia: `backend/tests/integration/test_evaluation_visual_permissions.py`.

## Hallazgos

- **medium · contract_mismatch**: 6 llamadas frontend no tienen endpoint backend canónico coincidente en el análisis estático.
