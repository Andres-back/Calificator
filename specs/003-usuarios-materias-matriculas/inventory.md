# Inventario técnico: 003-usuarios-materias-matriculas

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 59

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `DELETE:/materias/{materia_id}/importaciones-estudiantes/{lote_id}` | authenticated | missing | `backend/app/modules/importacion_estudiantes/router.py:89` |
| endpoint | `GET:/auth/me` | authenticated | covered | `backend/app/modules/auth/router.py:168` |
| endpoint | `GET:/materias` | admin, estudiante, profesor | covered | `backend/app/modules/materias/router.py:24` |
| endpoint | `GET:/materias/{materia_id}` | admin, estudiante, profesor | covered | `backend/app/modules/materias/router.py:33` |
| endpoint | `GET:/materias/{materia_id}/estudiantes` | admin, estudiante, profesor | covered | `backend/app/modules/materias/router.py:66` |
| endpoint | `GET:/materias/{materia_id}/estudiantes-existentes` | authenticated | missing | `backend/app/modules/importacion_estudiantes/router.py:121` |
| endpoint | `GET:/materias/{materia_id}/evaluaciones` | admin, estudiante, profesor | covered | `backend/app/modules/evaluaciones/router.py:226` |
| endpoint | `GET:/materias/{materia_id}/importaciones-estudiantes` | authenticated | missing | `backend/app/modules/importacion_estudiantes/router.py:65` |
| endpoint | `GET:/materias/{materia_id}/importaciones-estudiantes/{lote_id}` | authenticated | missing | `backend/app/modules/importacion_estudiantes/router.py:71` |
| endpoint | `GET:/matriculas/mis-materias` | admin, estudiante, profesor | covered | `backend/app/modules/matriculas/router.py:25` |
| endpoint | `GET:/users/me` | authenticated | covered | `backend/app/modules/users/router.py:25` |
| endpoint | `PATCH:/materias/{materia_id}` | admin, profesor | covered | `backend/app/modules/materias/router.py:43` |
| endpoint | `PATCH:/matriculas/{matricula_id}/estado` | admin, profesor | covered | `backend/app/modules/matriculas/router.py:35` |
| endpoint | `PATCH:/users/me` | authenticated | covered | `backend/app/modules/users/router.py:30` |
| endpoint | `POST:/auth/initial-password` | authenticated | covered | `backend/app/modules/auth/router.py:173` |
| endpoint | `POST:/auth/login` | ambiguous | covered | `backend/app/modules/auth/router.py:33` |
| endpoint | `POST:/auth/logout` | ambiguous | covered | `backend/app/modules/auth/router.py:161` |
| endpoint | `POST:/auth/password-recovery/request` | ambiguous | covered | `backend/app/modules/auth/router.py:62` |
| endpoint | `POST:/auth/password-recovery/reset` | ambiguous | covered | `backend/app/modules/auth/router.py:117` |
| endpoint | `POST:/auth/password-recovery/validate` | ambiguous | covered | `backend/app/modules/auth/router.py:96` |
| endpoint | `POST:/auth/refresh` | ambiguous | covered | `backend/app/modules/auth/router.py:147` |
| endpoint | `POST:/auth/register` | ambiguous | covered | `backend/app/modules/auth/router.py:50` |
| endpoint | `POST:/materias` | admin, profesor | covered | `backend/app/modules/materias/router.py:15` |
| endpoint | `POST:/materias/{materia_id}/estudiantes-existentes/matricular` | authenticated | missing | `backend/app/modules/importacion_estudiantes/router.py:127` |
| endpoint | `POST:/materias/{materia_id}/estudiantes/{student_id}/clave-temporal` | authenticated | missing | `backend/app/modules/importacion_estudiantes/router.py:134` |
| endpoint | `POST:/materias/{materia_id}/importaciones-estudiantes` | authenticated | missing | `backend/app/modules/importacion_estudiantes/router.py:26` |
| endpoint | `POST:/materias/{materia_id}/importaciones-estudiantes/{lote_id}/confirmar` | authenticated | missing | `backend/app/modules/importacion_estudiantes/router.py:107` |
| endpoint | `POST:/materias/{materia_id}/regenerar-codigo` | admin, profesor | covered | `backend/app/modules/materias/router.py:55` |
| endpoint | `POST:/matriculas/unirse` | admin, estudiante | covered | `backend/app/modules/matriculas/router.py:15` |
| endpoint | `PUT:/materias/{materia_id}/importaciones-estudiantes/{lote_id}` | authenticated | missing | `backend/app/modules/importacion_estudiantes/router.py:79` |
| frontend_route | `/app/materias` | authenticated | covered | `frontend/src/config/routes.ts:29` |
| frontend_route | `/app/materias/{id}` | authenticated | covered | `frontend/src/config/routes.ts:33` |
| frontend_route | `/login` | public | covered | `frontend/src/config/routes.ts:9` |
| frontend_call | `DELETE:/materias/{materiaId}/importaciones-estudiantes/{batchId}` | ambiguous | covered | `frontend/src/modules/materias/rosterImportApi.ts:58` |
| frontend_call | `GET:/auth/me` | ambiguous | covered | `frontend/src/stores/auth.ts:24` |
| frontend_call | `GET:/materias/{id}/estudiantes` | ambiguous | covered | `frontend/src/modules/materias/api.ts:21` |
| frontend_call | `GET:/materias/{id}` | ambiguous | covered | `frontend/src/modules/materias/api.ts:17` |
| frontend_call | `GET:/materias/{materiaId}/estudiantes-existentes` | ambiguous | covered | `frontend/src/modules/materias/rosterImportApi.ts:69` |
| frontend_call | `GET:/materias/{materiaId}/evaluaciones` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:51` |
| frontend_call | `GET:/materias/{materiaId}/importaciones-estudiantes/{batchId}` | ambiguous | covered | `frontend/src/modules/materias/rosterImportApi.ts:50` |
| frontend_call | `GET:/materias/{materiaId}/importaciones-estudiantes` | ambiguous | covered | `frontend/src/modules/materias/rosterImportApi.ts:54` |
| frontend_call | `GET:/materias` | ambiguous | covered | `frontend/src/modules/materias/api.ts:13` |
| frontend_call | `PATCH:/materias/{id}` | ambiguous | covered | `frontend/src/modules/materias/api.ts:37` |
| frontend_call | `POST:/auth/initial-password` | ambiguous | covered | `frontend/src/modules/auth/InitialPasswordPage.tsx:19` |
| frontend_call | `POST:/auth/login` | ambiguous | covered | `frontend/src/stores/auth.ts:54` |
| frontend_call | `POST:/auth/logout` | ambiguous | covered | `frontend/src/stores/auth.ts:74` |
| frontend_call | `POST:/auth/password-recovery/request` | ambiguous | covered | `frontend/src/modules/auth/passwordRecoveryApi.ts:7` |
| frontend_call | `POST:/auth/password-recovery/reset` | ambiguous | covered | `frontend/src/modules/auth/passwordRecoveryApi.ts:24` |
| frontend_call | `POST:/auth/register` | ambiguous | covered | `frontend/src/stores/auth.ts:64` |
| frontend_call | `POST:/materias/{id}/regenerar-codigo` | ambiguous | covered | `frontend/src/modules/materias/api.ts:33` |
| frontend_call | `POST:/materias/{materiaId}/importaciones-estudiantes/{batchId}/confirmar` | ambiguous | covered | `frontend/src/modules/materias/rosterImportApi.ts:65` |
| frontend_call | `POST:/materias` | ambiguous | covered | `frontend/src/modules/materias/api.ts:25` |
| frontend_call | `POST:/matriculas/unirse` | ambiguous | covered | `frontend/src/modules/materias/api.ts:29` |
| frontend_call | `PUT:/materias/{materiaId}/importaciones-estudiantes/{batchId}` | ambiguous | covered | `frontend/src/modules/materias/rosterImportApi.ts:61` |
| table | `mail_global_config` | system | covered | `backend/app/modules/auth/models.py:77` |
| table | `materias` | system | covered | `backend/app/modules/materias/models.py:19` |
| table | `matriculas` | system | covered | `backend/app/modules/matriculas/models.py:18` |
| table | `password_reset_requests` | system | covered | `backend/app/modules/auth/models.py:25` |
| table | `users` | system | covered | `backend/app/modules/users/models.py:13` |

## Decisiones explícitas de permiso

Sin decisiones explícitas de permiso para este dominio.

## Hallazgos

- **low · missing_coverage**: 9 superficies de 003-usuarios-materias-matriculas no tienen evidencia de prueba observable.
