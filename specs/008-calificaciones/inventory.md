# Inventario técnico: 008-calificaciones

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 65

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `DELETE:/calificaciones/modo-salon/{sesion_id}` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1068` |
| endpoint | `GET:/calificaciones/bandeja-docente` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1526` |
| endpoint | `GET:/calificaciones/modo-salon/{sesion_id}` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:880` |
| endpoint | `GET:/calificaciones/modo-salon/{sesion_id}/estudiantes` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:904` |
| endpoint | `GET:/calificaciones/{calificacion_id}/desglose` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:1647` |
| endpoint | `GET:/calificaciones/{calificacion_id}/desglose/historial` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:1683` |
| endpoint | `GET:/calificaciones/{calificacion_id}/detalle` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:1453` |
| endpoint | `GET:/calificaciones/{calificacion_id}/incidencias` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1600` |
| endpoint | `GET:/estudiantes/{estudiante_id}/boletin` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:806` |
| endpoint | `GET:/estudiantes/{estudiante_id}/resumen-academico` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:785` |
| endpoint | `PATCH:/calificaciones/modo-salon/{sesion_id}/estudiantes/{estudiante_id}` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:950` |
| endpoint | `PATCH:/calificaciones/{calificacion_id}/ajustar` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:693` |
| endpoint | `PATCH:/calificaciones/{calificacion_id}/confirmar` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:676` |
| endpoint | `PATCH:/calificaciones/{calificacion_id}/publicar` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1474` |
| endpoint | `PATCH:/calificaciones/{calificacion_id}/revision-manual` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:710` |
| endpoint | `PATCH:/incidencias/{incidencia_id}/resolver` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1616` |
| endpoint | `POST:/calificaciones/foto` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:117` |
| endpoint | `POST:/calificaciones/lote` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:372` |
| endpoint | `POST:/calificaciones/lote/ajustar` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1513` |
| endpoint | `POST:/calificaciones/lote/asincrono` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:478` |
| endpoint | `POST:/calificaciones/lote/confirmar` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1503` |
| endpoint | `POST:/calificaciones/lote/publicar` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1493` |
| endpoint | `POST:/calificaciones/modo-salon/iniciar` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:839` |
| endpoint | `POST:/calificaciones/modo-salon/{sesion_id}/foto` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:993` |
| endpoint | `POST:/calificaciones/{calificacion_id}/incidencias` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1579` |
| endpoint | `POST:/calificaciones/{calificacion_id}/reintentar-foto` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:257` |
| endpoint | `POST:/calificaciones/{calificacion_id}/solicitar-reemplazo` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:327` |
| endpoint | `PUT:/calificaciones/{calificacion_id}/desglose` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1662` |
| frontend_route | `/app/calificaciones` | authenticated | covered | `frontend/src/config/routes.ts:47` |
| frontend_route | `/app/calificaciones/boletin` | estudiante | covered | `frontend/src/config/routes.ts:46` |
| frontend_route | `/app/materias/{id}/boletin` | authenticated | covered | `frontend/src/config/routes.ts:38` |
| frontend_route | `/app/materias/{id}/calificar` | admin, profesor | covered | `frontend/src/config/routes.ts:36` |
| frontend_call | `DELETE:/calificaciones/modo-salon/{sesionId}` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:112` |
| frontend_call | `GET:/calificaciones/bandeja-docente` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:5` |
| frontend_call | `GET:/calificaciones/modo-salon/{sesionId}` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:80` |
| frontend_call | `GET:/calificaciones/{calificacionId}/desglose/historial` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:187` |
| frontend_call | `GET:/calificaciones/{calificacionId}/desglose` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:177` |
| frontend_call | `GET:/calificaciones/{calificacionId}/detalle` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:129` |
| frontend_call | `GET:/calificaciones/{calificacionId}/incidencias` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:163` |
| frontend_call | `GET:/estudiantes/{estudianteId}/boletin` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:115` |
| frontend_call | `GET:/estudiantes/{estudianteId}/resumen-academico` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:121` |
| frontend_call | `PATCH:/calificaciones/{calificacionId}/publicar` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:150` |
| frontend_call | `PATCH:/calificaciones/{id}/ajustar` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:40` |
| frontend_call | `PATCH:/calificaciones/{id}/confirmar` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:36` |
| frontend_call | `PATCH:/calificaciones/{id}/revision-manual` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:44` |
| frontend_call | `PATCH:/incidencias/{incidenciaId}/resolver` | admin, profesor | covered | `frontend/src/modules/calificaciones/api.ts:173` |
| frontend_call | `POST:/calificaciones/foto` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:61` |
| frontend_call | `POST:/calificaciones/lote/ajustar` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:142` |
| frontend_call | `POST:/calificaciones/lote/asincrono` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:108` |
| frontend_call | `POST:/calificaciones/lote/confirmar` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:137` |
| frontend_call | `POST:/calificaciones/lote/publicar` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:155` |
| frontend_call | `POST:/calificaciones/modo-salon/iniciar` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:74` |
| frontend_call | `POST:/calificaciones/modo-salon/{sesionId}/foto` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:88` |
| frontend_call | `POST:/calificaciones/{calificacionId}/incidencias` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:168` |
| frontend_call | `POST:/calificaciones/{calificacionId}/reintentar-foto` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:70` |
| frontend_call | `POST:/calificaciones/{calificacionId}/solicitar-reemplazo` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:65` |
| frontend_call | `PUT:/calificaciones/{calificacionId}/desglose` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:182` |
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

Sin hallazgos específicos del dominio.
