# Inventario técnico: 005-evaluaciones

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 51

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `DELETE:/evaluaciones/{evaluacion_id}` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:402` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}` | admin, estudiante, profesor | covered | `backend/app/modules/evaluaciones/router.py:237` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/actividad` | admin, estudiante, profesor | covered | `backend/app/modules/evaluaciones/router.py:247` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/calificaciones` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:768` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/docx` | admin, estudiante, profesor | covered | `backend/app/modules/evaluaciones/router.py:312` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/mi-desglose` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:1708` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/mi-entrega` | admin, estudiante | covered | `backend/app/modules/calificaciones/router.py:1095` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/mi-solicitud-revision` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:1539` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/pdf` | admin, estudiante, profesor | covered | `backend/app/modules/evaluaciones/router.py:286` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/revision` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:744` |
| endpoint | `PATCH:/evaluaciones/{evaluacion_id}` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:335` |
| endpoint | `PATCH:/evaluaciones/{evaluacion_id}/respuestas-liberadas` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1695` |
| endpoint | `PATCH:/evaluaciones/{evaluacion_id}/validar-estructura` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:413` |
| endpoint | `POST:/evaluaciones` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:217` |
| endpoint | `POST:/evaluaciones/externa/digitalizar` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:197` |
| endpoint | `POST:/evaluaciones/externa/digitalizar-con-archivo` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:79` |
| endpoint | `POST:/evaluaciones/generar-borrador` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:183` |
| endpoint | `POST:/evaluaciones/referencia/extraer` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:39` |
| endpoint | `POST:/evaluaciones/sorpresa` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:207` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/activar-recepcion` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:380` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/calificaciones/manual` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:727` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/cerrar` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:369` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/crear-blueprint` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:347` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/pausar-recepcion` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:391` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/publicar` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:358` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/solicitud-revision` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:1556` |
| frontend_route | `/app/evaluaciones` | authenticated | covered | `frontend/src/config/routes.ts:42` |
| frontend_route | `/app/materias/{id}/evaluaciones` | authenticated | covered | `frontend/src/config/routes.ts:34` |
| frontend_call | `DELETE:/evaluaciones/{id}` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:101` |
| frontend_call | `GET:/evaluaciones/{evaluacionId}/actividad` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:118` |
| frontend_call | `GET:/evaluaciones/{evaluacionId}/calificaciones` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:10` |
| frontend_call | `GET:/evaluaciones/{evaluacionId}/mi-desglose` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:184` |
| frontend_call | `GET:/evaluaciones/{evaluacionId}/mi-entrega` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:109` |
| frontend_call | `GET:/evaluaciones/{evaluacionId}/mi-solicitud-revision` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:147` |
| frontend_call | `GET:/evaluaciones/{evaluacionId}/{format}` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:133` |
| frontend_call | `GET:/evaluaciones/{evaluationId}/revision` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:15` |
| frontend_call | `GET:/evaluaciones/{id}` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:55` |
| frontend_call | `PATCH:/evaluaciones/{evaluacionId}/respuestas-liberadas` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:192` |
| frontend_call | `PATCH:/evaluaciones/{id}` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:81` |
| frontend_call | `POST:/evaluaciones/externa/digitalizar-con-archivo` | ambiguous | covered | `frontend/src/modules/evaluaciones/components/DigitalizarEvaluacionModal.tsx:102` |
| frontend_call | `POST:/evaluaciones/generar-borrador` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:63` |
| frontend_call | `POST:/evaluaciones/referencia/extraer` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:77` |
| frontend_call | `POST:/evaluaciones/{evaluacionId}/calificaciones/manual` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:28` |
| frontend_call | `POST:/evaluaciones/{evaluacionId}/solicitud-revision` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:154` |
| frontend_call | `POST:/evaluaciones/{id}/activar-recepcion` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:93` |
| frontend_call | `POST:/evaluaciones/{id}/cerrar` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:89` |
| frontend_call | `POST:/evaluaciones/{id}/pausar-recepcion` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:97` |
| frontend_call | `POST:/evaluaciones/{id}/publicar` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:85` |
| frontend_call | `POST:/evaluaciones` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:59` |
| table | `evaluacion_blueprints` | system | covered | `backend/app/modules/evaluaciones/models.py:132` |
| table | `evaluaciones` | system | covered | `backend/app/modules/evaluaciones/models.py:19` |

## Decisiones explícitas de permiso

- `backend:GET:/evaluaciones/{evaluacion_id}/docx` — La exportación reutiliza la autorización de lectura y propiedad de PDF; matrícula y publicación siguen validadas por el servicio y soluciones denegadas a estudiante o docente ajeno. ([issue](https://github.com/Andres-back/Calificator/issues/169)). Evidencia: `backend/tests/unit/test_evaluation_exports.py`.
- `backend:GET:/evaluaciones/{evaluacion_id}/pdf` — La autorización compartida exige evaluations.read y ensure_can_read_evaluation; el solucionario solo admite propietario docente o administrador autorizado. ([issue](https://github.com/Andres-back/Calificator/issues/169)). Evidencia: `backend/tests/unit/test_evaluation_exports.py`.

## Hallazgos

- **medium · contract_mismatch**: 5 llamadas frontend no tienen endpoint backend canónico coincidente en el análisis estático.
