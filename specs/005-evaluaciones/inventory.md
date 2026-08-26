# Inventario técnico: 005-evaluaciones

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 47

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `DELETE:/evaluaciones/{evaluacion_id}` | authenticated | covered | `backend/app/modules/evaluaciones/router.py:380` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}` | authenticated | covered | `backend/app/modules/evaluaciones/router.py:224` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/actividad` | authenticated | covered | `backend/app/modules/evaluaciones/router.py:233` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/calificaciones` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:839` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/mi-desglose` | estudiante | covered | `backend/app/modules/calificaciones/router.py:1720` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/mi-entrega` | estudiante | covered | `backend/app/modules/calificaciones/router.py:1164` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/mi-solicitud-revision` | estudiante | covered | `backend/app/modules/calificaciones/router.py:1553` |
| endpoint | `GET:/evaluaciones/{evaluacion_id}/pdf` | authenticated | covered | `backend/app/modules/evaluaciones/router.py:242` |
| endpoint | `PATCH:/evaluaciones/{evaluacion_id}` | authenticated | covered | `backend/app/modules/evaluaciones/router.py:319` |
| endpoint | `PATCH:/evaluaciones/{evaluacion_id}/respuestas-liberadas` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1707` |
| endpoint | `PATCH:/evaluaciones/{evaluacion_id}/validar-estructura` | authenticated | covered | `backend/app/modules/evaluaciones/router.py:390` |
| endpoint | `POST:/evaluaciones` | authenticated | covered | `backend/app/modules/evaluaciones/router.py:206` |
| endpoint | `POST:/evaluaciones/externa/digitalizar` | authenticated | covered | `backend/app/modules/evaluaciones/router.py:188` |
| endpoint | `POST:/evaluaciones/externa/digitalizar-con-archivo` | authenticated | covered | `backend/app/modules/evaluaciones/router.py:77` |
| endpoint | `POST:/evaluaciones/generar-borrador` | authenticated | covered | `backend/app/modules/evaluaciones/router.py:175` |
| endpoint | `POST:/evaluaciones/referencia/extraer` | authenticated | covered | `backend/app/modules/evaluaciones/router.py:38` |
| endpoint | `POST:/evaluaciones/sorpresa` | authenticated | covered | `backend/app/modules/evaluaciones/router.py:197` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/activar-recepcion` | authenticated | covered | `backend/app/modules/evaluaciones/router.py:360` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/calificaciones/manual` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:822` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/cerrar` | authenticated | covered | `backend/app/modules/evaluaciones/router.py:350` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/crear-blueprint` | authenticated | covered | `backend/app/modules/evaluaciones/router.py:330` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/pausar-recepcion` | authenticated | covered | `backend/app/modules/evaluaciones/router.py:370` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/publicar` | authenticated | covered | `backend/app/modules/evaluaciones/router.py:340` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/solicitud-revision` | estudiante | covered | `backend/app/modules/calificaciones/router.py:1570` |
| frontend_route | `/app/evaluaciones` | admin | covered | `frontend/src/config/routes.ts:32` |
| frontend_route | `/app/materias/{id}/evaluaciones` | admin, profesor | covered | `frontend/src/config/routes.ts:24` |
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
