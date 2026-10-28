# Inventario técnico: 008-calificaciones

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 82

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `DELETE:/calificaciones/modo-salon/{sesion_id}` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1152` |
| endpoint | `GET:/calificaciones/bandeja-docente` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1671` |
| endpoint | `GET:/calificaciones/capacidades-evidencia` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:133` |
| endpoint | `GET:/calificaciones/modo-salon/{sesion_id}` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:962` |
| endpoint | `GET:/calificaciones/modo-salon/{sesion_id}/estudiantes` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:986` |
| endpoint | `GET:/calificaciones/sugerir-bordes/{solicitud_id}` | authenticated | covered | `backend/app/modules/calificaciones/evidence_scan_suggestion_router.py:76` |
| endpoint | `GET:/calificaciones/{calificacion_id}/desglose` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:1792` |
| endpoint | `GET:/calificaciones/{calificacion_id}/desglose/historial` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:1828` |
| endpoint | `GET:/calificaciones/{calificacion_id}/detalle` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:1598` |
| endpoint | `GET:/calificaciones/{calificacion_id}/incidencias` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1745` |
| endpoint | `GET:/calificaciones/{calificacion_id}/revisiones` | admin, profesor | covered | `backend/app/modules/calificaciones/revision_router.py:131` |
| endpoint | `GET:/calificaciones/{calificacion_id}/revisiones/{revision_id}/evidencia` | authenticated | covered | `backend/app/modules/calificaciones/revision_router.py:210` |
| endpoint | `GET:/calificaciones/{calificacion_id}/revisiones/{revision_id}/evidencia/paginas/{numero}` | authenticated | covered | `backend/app/modules/calificaciones/revision_router.py:243` |
| endpoint | `GET:/estudiantes/{estudiante_id}/boletin` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:888` |
| endpoint | `GET:/estudiantes/{estudiante_id}/resumen-academico` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:867` |
| endpoint | `GET:/evaluaciones/{evaluation_id}/devoluciones/lotes/{request_id}` | authenticated | covered | `backend/app/modules/feedback_sharing/router.py:107` |
| endpoint | `PATCH:/calificaciones/modo-salon/{sesion_id}/estudiantes/{estudiante_id}` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1032` |
| endpoint | `PATCH:/calificaciones/{calificacion_id}/ajustar` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:773` |
| endpoint | `PATCH:/calificaciones/{calificacion_id}/confirmar` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:756` |
| endpoint | `PATCH:/calificaciones/{calificacion_id}/publicar` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1619` |
| endpoint | `PATCH:/calificaciones/{calificacion_id}/revision-manual` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:790` |
| endpoint | `PATCH:/incidencias/{incidencia_id}/resolver` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1761` |
| endpoint | `POST:/calificaciones/foto` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:157` |
| endpoint | `POST:/calificaciones/lote` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:440` |
| endpoint | `POST:/calificaciones/lote/ajustar` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1658` |
| endpoint | `POST:/calificaciones/lote/asincrono` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:553` |
| endpoint | `POST:/calificaciones/lote/confirmar` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1648` |
| endpoint | `POST:/calificaciones/lote/publicar` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1638` |
| endpoint | `POST:/calificaciones/modo-salon/iniciar` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:921` |
| endpoint | `POST:/calificaciones/modo-salon/{sesion_id}/foto` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1075` |
| endpoint | `POST:/calificaciones/sugerir-bordes` | authenticated | covered | `backend/app/modules/calificaciones/evidence_scan_suggestion_router.py:39` |
| endpoint | `POST:/calificaciones/{calificacion_id}/incidencias` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1724` |
| endpoint | `POST:/calificaciones/{calificacion_id}/recalificar` | admin, profesor | covered | `backend/app/modules/calificaciones/revision_router.py:70` |
| endpoint | `POST:/calificaciones/{calificacion_id}/reintentar-foto` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:324` |
| endpoint | `POST:/calificaciones/{calificacion_id}/solicitar-reemplazo` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:395` |
| endpoint | `POST:/evaluaciones/{evaluation_id}/devoluciones/accesos/copiar` | authenticated | covered | `backend/app/modules/feedback_sharing/router.py:113` |
| endpoint | `POST:/evaluaciones/{evaluation_id}/devoluciones/aceptar-publicar` | authenticated | covered | `backend/app/modules/feedback_sharing/router.py:99` |
| endpoint | `PUT:/calificaciones/{calificacion_id}/desglose` | admin, profesor | covered | `backend/app/modules/calificaciones/router.py:1807` |
| frontend_route | `/app/calificaciones` | authenticated | covered | `frontend/src/config/routes.ts:48` |
| frontend_route | `/app/calificaciones/boletin` | estudiante | covered | `frontend/src/config/routes.ts:47` |
| frontend_route | `/app/materias/{id}/boletin` | authenticated | covered | `frontend/src/config/routes.ts:39` |
| frontend_route | `/app/materias/{id}/calificar` | admin, profesor | covered | `frontend/src/config/routes.ts:37` |
| frontend_call | `DELETE:/calificaciones/modo-salon/{sesionId}` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:158` |
| frontend_call | `GET:/calificaciones/bandeja-docente` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:5` |
| frontend_call | `GET:/calificaciones/capacidades-evidencia` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:54` |
| frontend_call | `GET:/calificaciones/modo-salon/{sesionId}` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:126` |
| frontend_call | `GET:/calificaciones/sugerir-bordes/{id}` | ambiguous | covered | `frontend/src/components/evidence/cornerAssistance.ts:83` |
| frontend_call | `GET:/calificaciones/{calificacionId}/desglose/historial` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:233` |
| frontend_call | `GET:/calificaciones/{calificacionId}/desglose` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:223` |
| frontend_call | `GET:/calificaciones/{calificacionId}/detalle` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:175` |
| frontend_call | `GET:/calificaciones/{calificacionId}/incidencias` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:209` |
| frontend_call | `GET:/calificaciones/{id}/revisiones` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:99` |
| frontend_call | `GET:/estudiantes/{estudianteId}/boletin` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:161` |
| frontend_call | `GET:/estudiantes/{estudianteId}/resumen-academico` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:167` |
| frontend_call | `PATCH:/calificaciones/{calificacionId}/publicar` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:196` |
| frontend_call | `PATCH:/calificaciones/{id}/ajustar` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:40` |
| frontend_call | `PATCH:/calificaciones/{id}/confirmar` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:36` |
| frontend_call | `PATCH:/calificaciones/{id}/revision-manual` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:44` |
| frontend_call | `PATCH:/incidencias/{incidenciaId}/resolver` | admin, profesor | covered | `frontend/src/modules/calificaciones/api.ts:219` |
| frontend_call | `POST:/calificaciones/foto` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:78` |
| frontend_call | `POST:/calificaciones/lote/ajustar` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:188` |
| frontend_call | `POST:/calificaciones/lote/asincrono` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:154` |
| frontend_call | `POST:/calificaciones/lote/confirmar` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:183` |
| frontend_call | `POST:/calificaciones/lote/publicar` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:201` |
| frontend_call | `POST:/calificaciones/modo-salon/iniciar` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:120` |
| frontend_call | `POST:/calificaciones/modo-salon/{sesionId}/foto` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:134` |
| frontend_call | `POST:/calificaciones/sugerir-bordes` | ambiguous | covered | `frontend/src/components/evidence/cornerAssistance.ts:75` |
| frontend_call | `POST:/calificaciones/{calificacionId}/incidencias` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:214` |
| frontend_call | `POST:/calificaciones/{calificacionId}/reintentar-foto` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:87` |
| frontend_call | `POST:/calificaciones/{calificacionId}/solicitar-reemplazo` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:82` |
| frontend_call | `POST:/calificaciones/{id}/recalificar` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:116` |
| frontend_call | `PUT:/calificaciones/{calificacionId}/desglose` | ambiguous | covered | `frontend/src/modules/calificaciones/api.ts:228` |
| table | `calificacion_ajustes` | system | covered | `backend/app/modules/calificaciones/breakdown_models.py:96` |
| table | `calificacion_componentes` | system | covered | `backend/app/modules/calificaciones/breakdown_models.py:59` |
| table | `calificacion_desgloses` | system | covered | `backend/app/modules/calificaciones/breakdown_models.py:15` |
| table | `calificacion_incidencias` | system | covered | `backend/app/modules/calificaciones/incidencia_models.py:14` |
| table | `calificacion_revisiones` | system | covered | `backend/app/modules/calificaciones/models.py:155` |
| table | `calificaciones` | system | covered | `backend/app/modules/calificaciones/models.py:104` |
| table | `entregas` | system | covered | `backend/app/modules/calificaciones/models.py:19` |
| table | `feedback_delivery_batches` | system | covered | `backend/app/modules/feedback_sharing/models.py:83` |
| table | `salon_sesion_estudiantes` | system | covered | `backend/app/modules/calificaciones/models.py:190` |
| table | `salon_sesiones` | system | covered | `backend/app/modules/calificaciones/models.py:174` |

## Decisiones explícitas de permiso

- `frontend_call:PATCH:/incidencias/{incidenciaId}/resolver:frontend/src/modules/calificaciones/api.ts` — La llamada pertenece al workspace docente; el estudiante crea o consulta su solicitud por endpoints separados. ([issue](https://github.com/Andres-back/Calificator/issues/17)). Evidencia: `backend/tests/unit/test_student_review_request.py`.

## Hallazgos

- **low · orphan_candidate**: 28 superficies no alcanzables o históricas se conservan como candidatas a retiro.
