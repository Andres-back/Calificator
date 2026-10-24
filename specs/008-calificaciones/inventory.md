# Inventario técnico: 008-calificaciones

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 75

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `DELETE:/calificaciones/modo-salon/{sesion_id}` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1098` |
| endpoint | `GET:/calificaciones/bandeja-docente` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1582` |
| endpoint | `GET:/calificaciones/modo-salon/{sesion_id}` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:909` |
| endpoint | `GET:/calificaciones/modo-salon/{sesion_id}/estudiantes` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:933` |
| endpoint | `GET:/calificaciones/{calificacion_id}/desglose` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:1703` |
| endpoint | `GET:/calificaciones/{calificacion_id}/desglose/historial` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:1739` |
| endpoint | `GET:/calificaciones/{calificacion_id}/detalle` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:1509` |
| endpoint | `GET:/calificaciones/{calificacion_id}/incidencias` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1656` |
| endpoint | `GET:/calificaciones/{calificacion_id}/revisiones` | admin, profesor | covered | `backend/app/modules/calificaciones/revision_router.py:106` |
| endpoint | `GET:/calificaciones/{calificacion_id}/revisiones/{revision_id}/evidencia` | admin, profesor | covered | `backend/app/modules/calificaciones/revision_router.py:148` |
| endpoint | `GET:/estudiantes/{estudiante_id}/boletin` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:835` |
| endpoint | `GET:/estudiantes/{estudiante_id}/resumen-academico` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:814` |
| endpoint | `GET:/evaluaciones/{evaluation_id}/devoluciones/lotes/{request_id}` | authenticated | covered | `backend/app/modules/feedback_sharing/router.py:100` |
| endpoint | `PATCH:/calificaciones/modo-salon/{sesion_id}/estudiantes/{estudiante_id}` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:979` |
| endpoint | `PATCH:/calificaciones/{calificacion_id}/ajustar` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:720` |
| endpoint | `PATCH:/calificaciones/{calificacion_id}/confirmar` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:703` |
| endpoint | `PATCH:/calificaciones/{calificacion_id}/publicar` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1530` |
| endpoint | `PATCH:/calificaciones/{calificacion_id}/revision-manual` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:737` |
| endpoint | `PATCH:/incidencias/{incidencia_id}/resolver` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1672` |
| endpoint | `POST:/calificaciones/foto` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:125` |
| endpoint | `POST:/calificaciones/lote` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:388` |
| endpoint | `POST:/calificaciones/lote/ajustar` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1569` |
| endpoint | `POST:/calificaciones/lote/asincrono` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:501` |
| endpoint | `POST:/calificaciones/lote/confirmar` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1559` |
| endpoint | `POST:/calificaciones/lote/publicar` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1549` |
| endpoint | `POST:/calificaciones/modo-salon/iniciar` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:868` |
| endpoint | `POST:/calificaciones/modo-salon/{sesion_id}/foto` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1022` |
| endpoint | `POST:/calificaciones/{calificacion_id}/incidencias` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1635` |
| endpoint | `POST:/calificaciones/{calificacion_id}/recalificar` | admin, profesor | covered | `backend/app/modules/calificaciones/revision_router.py:62` |
| endpoint | `POST:/calificaciones/{calificacion_id}/reintentar-foto` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:273` |
| endpoint | `POST:/calificaciones/{calificacion_id}/solicitar-reemplazo` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:343` |
| endpoint | `POST:/evaluaciones/{evaluation_id}/devoluciones/accesos/copiar` | authenticated | covered | `backend/app/modules/feedback_sharing/router.py:106` |
| endpoint | `POST:/evaluaciones/{evaluation_id}/devoluciones/aceptar-publicar` | authenticated | covered | `backend/app/modules/feedback_sharing/router.py:92` |
| endpoint | `PUT:/calificaciones/{calificacion_id}/desglose` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1718` |
| frontend_route | `/app/calificaciones` | authenticated | covered | `frontend/src/config/routes.ts:48` |
| frontend_route | `/app/calificaciones/boletin` | estudiante | covered | `frontend/src/config/routes.ts:47` |
| frontend_route | `/app/materias/{id}/boletin` | authenticated | covered | `frontend/src/config/routes.ts:39` |
| frontend_route | `/app/materias/{id}/calificar` | admin, profesor | covered | `frontend/src/config/routes.ts:37` |
| frontend_call | `DELETE:/calificaciones/modo-salon/{sesionId}` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:138` |
| frontend_call | `GET:/calificaciones/bandeja-docente` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:5` |
| frontend_call | `GET:/calificaciones/modo-salon/{sesionId}` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:106` |
| frontend_call | `GET:/calificaciones/{calificacionId}/desglose/historial` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:213` |
| frontend_call | `GET:/calificaciones/{calificacionId}/desglose` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:203` |
| frontend_call | `GET:/calificaciones/{calificacionId}/detalle` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:155` |
| frontend_call | `GET:/calificaciones/{calificacionId}/incidencias` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:189` |
| frontend_call | `GET:/calificaciones/{id}/revisiones` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:81` |
| frontend_call | `GET:/estudiantes/{estudianteId}/boletin` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:141` |
| frontend_call | `GET:/estudiantes/{estudianteId}/resumen-academico` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:147` |
| frontend_call | `PATCH:/calificaciones/{calificacionId}/publicar` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:176` |
| frontend_call | `PATCH:/calificaciones/{id}/ajustar` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:40` |
| frontend_call | `PATCH:/calificaciones/{id}/confirmar` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:36` |
| frontend_call | `PATCH:/calificaciones/{id}/revision-manual` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:44` |
| frontend_call | `PATCH:/incidencias/{incidenciaId}/resolver` | admin, profesor | covered | `frontend/src/modules/calificaciones/api.ts:199` |
| frontend_call | `POST:/calificaciones/foto` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:61` |
| frontend_call | `POST:/calificaciones/lote/ajustar` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:168` |
| frontend_call | `POST:/calificaciones/lote/asincrono` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:134` |
| frontend_call | `POST:/calificaciones/lote/confirmar` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:163` |
| frontend_call | `POST:/calificaciones/lote/publicar` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:181` |
| frontend_call | `POST:/calificaciones/modo-salon/iniciar` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:100` |
| frontend_call | `POST:/calificaciones/modo-salon/{sesionId}/foto` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:114` |
| frontend_call | `POST:/calificaciones/{calificacionId}/incidencias` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:194` |
| frontend_call | `POST:/calificaciones/{calificacionId}/reintentar-foto` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:70` |
| frontend_call | `POST:/calificaciones/{calificacionId}/solicitar-reemplazo` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:65` |
| frontend_call | `POST:/calificaciones/{id}/recalificar` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:96` |
| frontend_call | `PUT:/calificaciones/{calificacionId}/desglose` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:208` |
| table | `calificacion_ajustes` | system | covered | `backend/app/modules/calificaciones/breakdown_models.py:96` |
| table | `calificacion_componentes` | system | covered | `backend/app/modules/calificaciones/breakdown_models.py:59` |
| table | `calificacion_desgloses` | system | covered | `backend/app/modules/calificaciones/breakdown_models.py:15` |
| table | `calificacion_incidencias` | system | covered | `backend/app/modules/calificaciones/incidencia_models.py:14` |
| table | `calificacion_revisiones` | system | covered | `backend/app/modules/calificaciones/models.py:148` |
| table | `calificaciones` | system | covered | `backend/app/modules/calificaciones/models.py:97` |
| table | `entregas` | system | covered | `backend/app/modules/calificaciones/models.py:19` |
| table | `feedback_delivery_batches` | system | covered | `backend/app/modules/feedback_sharing/models.py:83` |
| table | `salon_sesion_estudiantes` | system | covered | `backend/app/modules/calificaciones/models.py:183` |
| table | `salon_sesiones` | system | covered | `backend/app/modules/calificaciones/models.py:167` |

## Decisiones explícitas de permiso

- `frontend_call:PATCH:/incidencias/{incidenciaId}/resolver:frontend/src/modules/calificaciones/api.ts` — La llamada pertenece al workspace docente; el estudiante crea o consulta su solicitud por endpoints separados. ([issue](https://github.com/Andres-back/Calificator/issues/17)). Evidencia: `backend/tests/unit/test_student_review_request.py`.

## Hallazgos

- **low · orphan_candidate**: 25 superficies no alcanzables o históricas se conservan como candidatas a retiro.
