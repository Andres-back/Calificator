# Inventario técnico: 029-roles-permisos-modulares

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 37

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `DELETE:/admin/roles/{role_id}` | admin | covered | `backend/app/modules/authorization/router.py:71` |
| endpoint | `DELETE:/admin/users/{user_id}` | admin | covered | `backend/app/modules/users/router.py:131` |
| endpoint | `GET:/admin/authorization/audit` | admin | covered | `backend/app/modules/authorization/router.py:25` |
| endpoint | `GET:/admin/authorization/modules` | admin | covered | `backend/app/modules/authorization/router.py:20` |
| endpoint | `GET:/admin/roles` | admin | covered | `backend/app/modules/authorization/router.py:46` |
| endpoint | `GET:/admin/roles/{role_id}` | admin | covered | `backend/app/modules/authorization/router.py:56` |
| endpoint | `GET:/admin/users` | admin | covered | `backend/app/modules/users/router.py:39` |
| endpoint | `GET:/admin/users/{user_id}/authorization/explain/{permission_key:path}` | admin | covered | `backend/app/modules/authorization/router.py:36` |
| endpoint | `GET:/admin/users/{user_id}/deletion-impact` | admin | covered | `backend/app/modules/users/router.py:122` |
| endpoint | `GET:/users/me/authorization` | authenticated | covered | `backend/app/modules/authorization/router.py:15` |
| endpoint | `PATCH:/admin/roles/{role_id}` | admin | covered | `backend/app/modules/authorization/router.py:61` |
| endpoint | `PATCH:/admin/users/{user_id}` | admin | covered | `backend/app/modules/users/router.py:99` |
| endpoint | `PATCH:/admin/users/{user_id}/solicitud-docente` | admin | covered | `backend/app/modules/users/router.py:111` |
| endpoint | `POST:/admin/roles` | admin | covered | `backend/app/modules/authorization/router.py:51` |
| endpoint | `POST:/admin/roles/{role_id}/duplicate` | admin | covered | `backend/app/modules/authorization/router.py:66` |
| endpoint | `POST:/admin/users` | admin | covered | `backend/app/modules/users/router.py:64` |
| frontend_route | `/app/admin/roles` | admin | covered | `frontend/src/config/routes.ts:59` |
| frontend_route | `/app/admin/usuarios` | admin | covered | `frontend/src/config/routes.ts:58` |
| frontend_call | `DELETE:/admin/roles/{id}` | admin | covered | `frontend/src/modules/admin/authorizationApi.ts:92` |
| frontend_call | `DELETE:/admin/users/{id}` | admin | covered | `frontend/src/modules/admin/usersApi.ts:54` |
| frontend_call | `GET:/admin/authorization/audit` | admin | covered | `frontend/src/modules/admin/authorizationApi.ts:96` |
| frontend_call | `GET:/admin/authorization/modules` | admin | covered | `frontend/src/modules/admin/authorizationApi.ts:67` |
| frontend_call | `GET:/admin/roles` | admin | covered | `frontend/src/modules/admin/authorizationApi.ts:72` |
| frontend_call | `GET:/admin/users/{id}` | admin | covered | `frontend/src/modules/admin/usersApi.ts:49` |
| frontend_call | `GET:/admin/users` | admin | covered | `frontend/src/modules/admin/usersApi.ts:34` |
| frontend_call | `GET:/users/me/authorization` | ambiguous | covered | `frontend/src/modules/admin/authorizationApi.ts:62` |
| frontend_call | `PATCH:/admin/roles/{id}` | admin | covered | `frontend/src/modules/admin/authorizationApi.ts:82` |
| frontend_call | `PATCH:/admin/users/{id}/solicitud-docente` | admin | covered | `frontend/src/modules/admin/usersApi.ts:58` |
| frontend_call | `PATCH:/admin/users/{id}` | admin | covered | `frontend/src/modules/admin/usersApi.ts:44` |
| frontend_call | `POST:/admin/roles/{id}` | admin | covered | `frontend/src/modules/admin/authorizationApi.ts:87` |
| frontend_call | `POST:/admin/roles` | admin | covered | `frontend/src/modules/admin/authorizationApi.ts:77` |
| frontend_call | `POST:/admin/users` | admin | covered | `frontend/src/modules/admin/usersApi.ts:39` |
| table | `audit_events` | system | covered | `backend/app/modules/authorization/models.py:75` |
| table | `authorization_permissions` | system | covered | `backend/app/modules/authorization/models.py:32` |
| table | `authorization_role_permissions` | system | covered | `backend/app/modules/authorization/models.py:45` |
| table | `authorization_roles` | system | covered | `backend/app/modules/authorization/models.py:12` |
| table | `authorization_user_roles` | system | covered | `backend/app/modules/authorization/models.py:57` |

## Decisiones explícitas de permiso

Sin decisiones explícitas de permiso para este dominio.

## Hallazgos

- **medium · contract_mismatch**: 2 llamadas frontend no tienen endpoint backend canónico coincidente en el análisis estático.
