# Inventario técnico: 005-evaluaciones

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 47

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `DELETE:/evaluaciones/{evaluacion_id}` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:403` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}` | admin, estudiante, profesor | covered | `backend/app/modules/evaluaciones/router.py:235` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/actividad` | admin, estudiante, profesor | covered | `backend/app/modules/evaluaciones/router.py:245` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/calificaciones` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:839` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/mi-desglose` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:1721` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/mi-entrega` | admin, estudiante | covered | `backend/app/modules/calificaciones/router.py:1166` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/mi-solicitud-revision` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:1554` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/pdf` | admin, estudiante, profesor | covered | `backend/app/modules/evaluaciones/router.py:255` |
| endpoint | `PATCH:/evaluaciones/{evaluacion_id}` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:336` |
| endpoint | `PATCH:/evaluaciones/{evaluacion_id}/respuestas-liberadas` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1708` |
| endpoint | `PATCH:/evaluaciones/{evaluacion_id}/validar-estructura` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:414` |
| endpoint | `POST:/evaluaciones` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:215` |
| endpoint | `POST:/evaluaciones/externa/digitalizar` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:195` |
| endpoint | `POST:/evaluaciones/externa/digitalizar-con-archivo` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:78` |
| endpoint | `POST:/evaluaciones/generar-borrador` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:181` |
| endpoint | `POST:/evaluaciones/referencia/extraer` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:38` |
| endpoint | `POST:/evaluaciones/sorpresa` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:205` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/activar-recepcion` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:381` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/calificaciones/manual` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:822` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/cerrar` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:370` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/crear-blueprint` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:348` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/pausar-recepcion` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:392` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/publicar` | admin, profesor | covered | `backend/app/modules/evaluaciones/router.py:359` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/solicitud-revision` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:1571` |
| frontend_route | `/app/evaluaciones` | authenticated | covered | `frontend/src/config/routes.ts:36` |
| frontend_route | `/app/materias/{id}/evaluaciones` | authenticated | covered | `frontend/src/config/routes.ts:28` |
| frontend_call | `DELETE:/evaluaciones/{id}` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:101` |
| frontend_call | `GET:/evaluaciones/{evaluacionId}/actividad` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:118` |
| frontend_call | `GET:/evaluaciones/{evaluacionId}/calificaciones` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:10` |
| frontend_call | `GET:/evaluaciones/{evaluacionId}/mi-desglose` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:163` |
| frontend_call | `GET:/evaluaciones/{evaluacionId}/mi-entrega` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:109` |
| frontend_call | `GET:/evaluaciones/{evaluacionId}/mi-solicitud-revision` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:126` |
| frontend_call | `GET:/evaluaciones/{id}` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:55` |
| frontend_call | `PATCH:/evaluaciones/{evaluacionId}/respuestas-liberadas` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:167` |
| frontend_call | `PATCH:/evaluaciones/{id}` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:81` |
| frontend_call | `POST:/evaluaciones/externa/digitalizar-con-archivo` | ambiguous | covered | `frontend/src/modules/evaluaciones/components/DigitalizarEvaluacionModal.tsx:91` |
| frontend_call | `POST:/evaluaciones/generar-borrador` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:63` |
| frontend_call | `POST:/evaluaciones/referencia/extraer` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:77` |
| frontend_call | `POST:/evaluaciones/{evaluacionId}/calificaciones/manual` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:23` |
| frontend_call | `POST:/evaluaciones/{evaluacionId}/solicitud-revision` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:133` |
| frontend_call | `POST:/evaluaciones/{id}/activar-recepcion` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:93` |
| frontend_call | `POST:/evaluaciones/{id}/cerrar` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:89` |
| frontend_call | `POST:/evaluaciones/{id}/pausar-recepcion` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:97` |
| frontend_call | `POST:/evaluaciones/{id}/publicar` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:85` |
| frontend_call | `POST:/evaluaciones` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:59` |
| table | `evaluacion_blueprints` | system | covered | `backend/app/modules/evaluaciones/models.py:127` |
| table | `evaluaciones` | system | covered | `backend/app/modules/evaluaciones/models.py:14` |

## Decisiones explícitas de permiso

Sin decisiones explícitas de permiso para este dominio.

## Hallazgos

Sin hallazgos específicos del dominio.
