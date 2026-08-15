# Inventario técnico: 004-dba-asistencia-curriculo

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 26

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `DELETE:/dba-personalizados/{dba_id}` | authenticated | covered | `backend/app/modules/dba/router.py:115` |
| endpoint | `GET:/dba` | authenticated | covered | `backend/app/modules/dba/router.py:28` |
| endpoint | `GET:/materias/{materia_id}/asistencia` | admin, profesor | covered | `backend/app/modules/asistencia/router.py:17` |
| endpoint | `GET:/materias/{materia_id}/asistencia/reporte` | authenticated | covered | `backend/app/modules/asistencia/router.py:28` |
| endpoint | `GET:/materias/{materia_id}/dba` | admin, estudiante, profesor | covered | `backend/app/modules/dba/router.py:131` |
| endpoint | `GET:/materias/{materia_id}/dba-personalizados` | authenticated | missing | `backend/app/modules/dba/router.py:60` |
| endpoint | `PATCH:/dba-personalizados/{dba_id}` | authenticated | covered | `backend/app/modules/dba/router.py:99` |
| endpoint | `POST:/dba/importar` | admin | covered | `backend/app/modules/dba/router.py:38` |
| endpoint | `POST:/materias/{materia_id}/dba-personalizados` | authenticated | missing | `backend/app/modules/dba/router.py:75` |
| endpoint | `POST:/materias/{materia_id}/dba-personalizados/upload-document` | authenticated | missing | `backend/app/modules/dba/router.py:148` |
| endpoint | `PUT:/materias/{materia_id}/asistencia` | admin, profesor | covered | `backend/app/modules/asistencia/router.py:40` |
| frontend_route | `/app/materias/{id}/asistencia` | admin, profesor | covered | `frontend/src/config/routes.ts:27` |
| frontend_route | `/app/materias/{id}/dba` | admin, profesor | covered | `frontend/src/config/routes.ts:29` |
| frontend_call | `DELETE:/dba-personalizados/{id}` | ambiguous | covered | `frontend/src/modules/materias/dbaApi.ts:33` |
| frontend_call | `GET:/dba` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:151` |
| frontend_call | `GET:/materias/{materiaId}/asistencia/reporte` | ambiguous | covered | `frontend/src/modules/materias/asistenciaApi.ts:81` |
| frontend_call | `GET:/materias/{materiaId}/asistencia` | admin, profesor | covered | `frontend/src/modules/materias/asistenciaApi.ts:70` |
| frontend_call | `GET:/materias/{materiaId}/dba-personalizados` | ambiguous | covered | `frontend/src/modules/materias/dbaApi.ts:13` |
| frontend_call | `GET:/materias/{materiaId}/dba` | admin, profesor | covered | `frontend/src/modules/materias/dbaApi.ts:18` |
| frontend_call | `PATCH:/dba-personalizados/{id}` | ambiguous | covered | `frontend/src/modules/materias/dbaApi.ts:28` |
| frontend_call | `POST:/materias/{materiaId}/dba-personalizados/upload-document` | ambiguous | covered | `frontend/src/modules/materias/dbaApi.ts:58` |
| frontend_call | `POST:/materias/{materiaId}/dba-personalizados` | ambiguous | covered | `frontend/src/modules/materias/dbaApi.ts:23` |
| frontend_call | `PUT:/materias/{materiaId}/asistencia` | admin, profesor | covered | `frontend/src/modules/materias/asistenciaApi.ts:92` |
| table | `asistencia_registros` | system | covered | `backend/app/modules/asistencia/models.py:13` |
| table | `dba_catalog` | system | missing | `backend/app/modules/dba/models.py:12` |
| table | `dba_personalizados` | system | missing | `backend/app/modules/dba/models.py:35` |

## Decisiones explícitas de permiso

- `backend:GET:/materias/{materia_id}/asistencia` — El router delega en ensure_can_manage_materia antes de consultar registros. ([issue](https://github.com/Andres-back/Calificator/issues/17)). Evidencia: `backend/tests/unit/test_authorization_contracts.py`.
- `backend:GET:/materias/{materia_id}/dba` — El router delega lectura de materia; estudiante requiere matrícula activa y los actores docentes conservan su ámbito. ([issue](https://github.com/Andres-back/Calificator/issues/17)). Evidencia: `backend/tests/unit/test_authorization_contracts.py`.
- `backend:PUT:/materias/{materia_id}/asistencia` — El router delega en ensure_can_manage_materia antes de guardar y las denegaciones no escriben. ([issue](https://github.com/Andres-back/Calificator/issues/17)). Evidencia: `backend/tests/unit/test_authorization_contracts.py`.

## Hallazgos

- **low · missing_coverage**: 5 superficies de 004-dba-asistencia-curriculo no tienen evidencia de prueba observable.
