# Inventario técnico: 008-calificaciones

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 65

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `DELETE:/calificaciones/modo-salon/{sesion_id}` | authenticated | covered | `backend/app/modules/calificaciones/router.py:1139` |
| endpoint | `GET:/calificaciones/bandeja-docente` | authenticated | covered | `backend/app/modules/calificaciones/router.py:1541` |
| endpoint | `GET:/calificaciones/modo-salon/{sesion_id}` | authenticated | covered | `backend/app/modules/calificaciones/router.py:951` |
| endpoint | `GET:/calificaciones/modo-salon/{sesion_id}/estudiantes` | authenticated | covered | `backend/app/modules/calificaciones/router.py:975` |
| endpoint | `GET:/calificaciones/{calificacion_id}/desglose` | authenticated | covered | `backend/app/modules/calificaciones/router.py:1660` |
| endpoint | `GET:/calificaciones/{calificacion_id}/desglose/historial` | authenticated | covered | `backend/app/modules/calificaciones/router.py:1696` |
| endpoint | `GET:/calificaciones/{calificacion_id}/detalle` | authenticated | covered | `backend/app/modules/calificaciones/router.py:1468` |
| endpoint | `GET:/calificaciones/{calificacion_id}/incidencias` | authenticated | covered | `backend/app/modules/calificaciones/router.py:1613` |
| endpoint | `GET:/estudiantes/{estudiante_id}/boletin` | authenticated | covered | `backend/app/modules/calificaciones/router.py:877` |
| endpoint | `GET:/estudiantes/{estudiante_id}/resumen-academico` | authenticated | covered | `backend/app/modules/calificaciones/router.py:856` |
| endpoint | `PATCH:/calificaciones/modo-salon/{sesion_id}/estudiantes/{estudiante_id}` | authenticated | covered | `backend/app/modules/calificaciones/router.py:1021` |
| endpoint | `PATCH:/calificaciones/{calificacion_id}/ajustar` | authenticated | covered | `backend/app/modules/calificaciones/router.py:788` |
| endpoint | `PATCH:/calificaciones/{calificacion_id}/confirmar` | authenticated | covered | `backend/app/modules/calificaciones/router.py:771` |
| endpoint | `PATCH:/calificaciones/{calificacion_id}/publicar` | authenticated | covered | `backend/app/modules/calificaciones/router.py:1489` |
| endpoint | `PATCH:/calificaciones/{calificacion_id}/revision-manual` | authenticated | covered | `backend/app/modules/calificaciones/router.py:805` |
| endpoint | `PATCH:/incidencias/{incidencia_id}/resolver` | authenticated | covered | `backend/app/modules/calificaciones/router.py:1629` |
| endpoint | `POST:/calificaciones/foto` | authenticated | covered | `backend/app/modules/calificaciones/router.py:255` |
| endpoint | `POST:/calificaciones/lote` | authenticated | covered | `backend/app/modules/calificaciones/router.py:503` |
| endpoint | `POST:/calificaciones/lote/ajustar` | authenticated | covered | `backend/app/modules/calificaciones/router.py:1528` |
| endpoint | `POST:/calificaciones/lote/asincrono` | authenticated | covered | `backend/app/modules/calificaciones/router.py:609` |
| endpoint | `POST:/calificaciones/lote/confirmar` | authenticated | covered | `backend/app/modules/calificaciones/router.py:1518` |
| endpoint | `POST:/calificaciones/lote/publicar` | authenticated | covered | `backend/app/modules/calificaciones/router.py:1508` |
| endpoint | `POST:/calificaciones/modo-salon/iniciar` | authenticated | covered | `backend/app/modules/calificaciones/router.py:910` |
| endpoint | `POST:/calificaciones/modo-salon/{sesion_id}/foto` | authenticated | covered | `backend/app/modules/calificaciones/router.py:1064` |
| endpoint | `POST:/calificaciones/{calificacion_id}/incidencias` | authenticated | covered | `backend/app/modules/calificaciones/router.py:1592` |
| endpoint | `POST:/calificaciones/{calificacion_id}/reintentar-foto` | authenticated | covered | `backend/app/modules/calificaciones/router.py:395` |
| endpoint | `POST:/calificaciones/{calificacion_id}/solicitar-reemplazo` | authenticated | covered | `backend/app/modules/calificaciones/router.py:458` |
| endpoint | `PUT:/calificaciones/{calificacion_id}/desglose` | authenticated | covered | `backend/app/modules/calificaciones/router.py:1675` |
| frontend_route | `/app/calificaciones/boletin` | estudiante | covered | `frontend/src/config/routes.ts:40` |
| frontend_route | `/app/calificaciones/workspace` | admin, profesor | covered | `frontend/src/config/routes.ts:41` |
| frontend_route | `/app/calificaciones/workspace/{evaluacionId}` | admin, profesor | covered | `frontend/src/config/routes.ts:43` |
| frontend_route | `/app/materias/{id}/boletin` | authenticated | covered | `frontend/src/config/routes.ts:32` |
| frontend_route | `/app/materias/{id}/calificar` | admin, profesor | covered | `frontend/src/config/routes.ts:30` |
| frontend_call | `DELETE:/calificaciones/modo-salon/{sesionId}` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:87` |
| frontend_call | `GET:/calificaciones/bandeja-docente` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:5` |
| frontend_call | `GET:/calificaciones/modo-salon/{sesionId}` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:75` |
| frontend_call | `GET:/calificaciones/{calificacionId}/desglose/historial` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:162` |
| frontend_call | `GET:/calificaciones/{calificacionId}/desglose` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:152` |
| frontend_call | `GET:/calificaciones/{calificacionId}/detalle` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:104` |
| frontend_call | `GET:/calificaciones/{calificacionId}/incidencias` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:138` |
| frontend_call | `GET:/estudiantes/{estudianteId}/boletin` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:90` |
| frontend_call | `GET:/estudiantes/{estudianteId}/resumen-academico` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:96` |
| frontend_call | `PATCH:/calificaciones/{calificacionId}/publicar` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:125` |
| frontend_call | `PATCH:/calificaciones/{id}/ajustar` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:35` |
| frontend_call | `PATCH:/calificaciones/{id}/confirmar` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:31` |
| frontend_call | `PATCH:/calificaciones/{id}/revision-manual` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:39` |
| frontend_call | `PATCH:/incidencias/{incidenciaId}/resolver` | admin, profesor | covered | `frontend/src/modules/calificaciones/api.ts:148` |
| frontend_call | `POST:/calificaciones/foto` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:56` |
| frontend_call | `POST:/calificaciones/lote/ajustar` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:117` |
| frontend_call | `POST:/calificaciones/lote/confirmar` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:112` |
| frontend_call | `POST:/calificaciones/lote/publicar` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:130` |
| frontend_call | `POST:/calificaciones/modo-salon/iniciar` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:69` |
| frontend_call | `POST:/calificaciones/modo-salon/{sesionId}/foto` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:83` |
| frontend_call | `POST:/calificaciones/{calificacionId}/incidencias` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:143` |
| frontend_call | `POST:/calificaciones/{calificacionId}/reintentar-foto` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:65` |
| frontend_call | `POST:/calificaciones/{calificacionId}/solicitar-reemplazo` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:60` |
| frontend_call | `PUT:/calificaciones/{calificacionId}/desglose` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:157` |
| table | `calificacion_ajustes` | system | covered | `backend/app/modules/calificaciones/breakdown_models.py:96` |
| table | `calificacion_componentes` | system | covered | `backend/app/modules/calificaciones/breakdown_models.py:59` |
| table | `calificacion_desgloses` | system | covered | `backend/app/modules/calificaciones/breakdown_models.py:15` |
| table | `calificacion_incidencias` | system | covered | `backend/app/modules/calificaciones/incidencia_models.py:14` |
| table | `calificaciones` | system | covered | `backend/app/modules/calificaciones/models.py:94` |
| table | `entregas` | system | covered | `backend/app/modules/calificaciones/models.py:19` |
| table | `salon_sesion_estudiantes` | system | covered | `backend/app/modules/calificaciones/models.py:161` |
| table | `salon_sesiones` | system | covered | `backend/app/modules/calificaciones/models.py:145` |

## Decisiones explícitas de permiso

- `frontend_call:PATCH:/incidencias/{incidenciaId}/resolver:frontend/src/modules/calificaciones/api.ts` — La llamada pertenece al workspace docente; el estudiante crea o consulta su solicitud por endpoints separados. ([issue](https://github.com/Andres-back/Calificator/issues/17)). Evidencia: `backend/tests/unit/test_student_review_request.py`.

## Hallazgos

- **medium · authorization_mismatch**: Permisos observables distintos para PATCH:/incidencias/{}/resolver: backend=['authenticated'], frontend=['admin', 'profesor'].
