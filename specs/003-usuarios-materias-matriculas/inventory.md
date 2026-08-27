# Inventario técnico: 003-usuarios-materias-matriculas

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 47

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `DELETE:/admin/users/{user_id}` | admin | covered | `backend/app/modules/users/router.py:91` |
| endpoint | `GET:/admin/users` | admin | covered | `backend/app/modules/users/router.py:37` |
| endpoint | `GET:/auth/me` | authenticated | covered | `backend/app/modules/auth/router.py:166` |
| endpoint | `GET:/materias` | authenticated | covered | `backend/app/modules/materias/router.py:25` |
| endpoint | `GET:/materias/{materia_id}` | authenticated | covered | `backend/app/modules/materias/router.py:33` |
| endpoint | `GET:/materias/{materia_id}/estudiantes` | authenticated | covered | `backend/app/modules/materias/router.py:63` |
| endpoint | `GET:/materias/{materia_id}/evaluaciones` | authenticated | covered | `backend/app/modules/evaluaciones/router.py:215` |
| endpoint | `GET:/matriculas/mis-materias` | authenticated | covered | `backend/app/modules/matriculas/router.py:24` |
| endpoint | `GET:/users/me` | authenticated | covered | `backend/app/modules/users/router.py:23` |
| endpoint | `PATCH:/admin/users/{user_id}` | admin | covered | `backend/app/modules/users/router.py:70` |
| endpoint | `PATCH:/admin/users/{user_id}/solicitud-docente` | admin | covered | `backend/app/modules/users/router.py:81` |
| endpoint | `PATCH:/materias/{materia_id}` | authenticated | covered | `backend/app/modules/materias/router.py:42` |
| endpoint | `PATCH:/matriculas/{matricula_id}/estado` | authenticated | covered | `backend/app/modules/matriculas/router.py:33` |
| endpoint | `PATCH:/users/me` | authenticated | covered | `backend/app/modules/users/router.py:28` |
| endpoint | `POST:/admin/users` | admin | covered | `backend/app/modules/users/router.py:59` |
| endpoint | `POST:/auth/login` | ambiguous | covered | `backend/app/modules/auth/router.py:31` |
| endpoint | `POST:/auth/logout` | ambiguous | covered | `backend/app/modules/auth/router.py:159` |
| endpoint | `POST:/auth/password-recovery/request` | ambiguous | covered | `backend/app/modules/auth/router.py:60` |
| endpoint | `POST:/auth/password-recovery/reset` | ambiguous | covered | `backend/app/modules/auth/router.py:115` |
| endpoint | `POST:/auth/password-recovery/validate` | ambiguous | covered | `backend/app/modules/auth/router.py:94` |
| endpoint | `POST:/auth/refresh` | ambiguous | covered | `backend/app/modules/auth/router.py:145` |
| endpoint | `POST:/auth/register` | ambiguous | covered | `backend/app/modules/auth/router.py:48` |
| endpoint | `POST:/materias` | profesor | covered | `backend/app/modules/materias/router.py:16` |
| endpoint | `POST:/materias/{materia_id}/regenerar-codigo` | authenticated | covered | `backend/app/modules/materias/router.py:53` |
| endpoint | `POST:/matriculas/unirse` | authenticated | covered | `backend/app/modules/matriculas/router.py:15` |
| frontend_route | `/app/materias` | estudiante | covered | `frontend/src/config/routes.ts:23` |
| frontend_route | `/app/materias/{id}` | admin, profesor | covered | `frontend/src/config/routes.ts:27` |
| frontend_route | `/login` | public | covered | `frontend/src/config/routes.ts:9` |
| frontend_call | `GET:/auth/me` | ambiguous | covered | `frontend/src/stores/auth.ts:49` |
| frontend_call | `GET:/materias/{id}/estudiantes` | ambiguous | covered | `frontend/src/modules/materias/api.ts:21` |
| frontend_call | `GET:/materias/{id}` | ambiguous | covered | `frontend/src/modules/materias/api.ts:17` |
| frontend_call | `GET:/materias/{materiaId}/evaluaciones` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:51` |
| frontend_call | `GET:/materias` | ambiguous | covered | `frontend/src/modules/materias/api.ts:13` |
| frontend_call | `PATCH:/materias/{id}` | ambiguous | covered | `frontend/src/modules/materias/api.ts:37` |
| frontend_call | `POST:/auth/login` | ambiguous | covered | `frontend/src/stores/auth.ts:37` |
| frontend_call | `POST:/auth/logout` | ambiguous | covered | `frontend/src/stores/auth.ts:57` |
| frontend_call | `POST:/auth/password-recovery/request` | ambiguous | covered | `frontend/src/modules/auth/passwordRecoveryApi.ts:7` |
| frontend_call | `POST:/auth/password-recovery/reset` | ambiguous | covered | `frontend/src/modules/auth/passwordRecoveryApi.ts:24` |
| frontend_call | `POST:/auth/register` | ambiguous | covered | `frontend/src/stores/auth.ts:47` |
| frontend_call | `POST:/materias/{id}/regenerar-codigo` | ambiguous | covered | `frontend/src/modules/materias/api.ts:33` |
| frontend_call | `POST:/materias` | ambiguous | covered | `frontend/src/modules/materias/api.ts:25` |
| frontend_call | `POST:/matriculas/unirse` | ambiguous | covered | `frontend/src/modules/materias/api.ts:29` |
| table | `mail_global_config` | system | covered | `backend/app/modules/auth/models.py:77` |
| table | `materias` | system | covered | `backend/app/modules/materias/models.py:13` |
| table | `matriculas` | system | covered | `backend/app/modules/matriculas/models.py:13` |
| table | `password_reset_requests` | system | covered | `backend/app/modules/auth/models.py:25` |
| table | `users` | system | covered | `backend/app/modules/users/models.py:13` |

## Decisiones explícitas de permiso

Sin decisiones explícitas de permiso para este dominio.

## Hallazgos

Sin hallazgos específicos del dominio.
