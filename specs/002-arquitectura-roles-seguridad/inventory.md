# Inventario técnico: 002-arquitectura-roles-seguridad

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 27

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `GET:/admin/mail/config` | ambiguous | covered | `backend/app/modules/admin_mail/router.py:51` |
| endpoint | `GET:/admin/mail/recovery-status` | ambiguous | covered | `backend/app/modules/admin_mail/router.py:141` |
| endpoint | `GET:/docs` | public | missing | `backend/app/main.py:44` |
| endpoint | `GET:/health` | public | missing | `backend/app/main.py:40` |
| endpoint | `GET:/openapi.json` | public | missing | `backend/app/main.py:56` |
| endpoint | `GET:/redoc` | public | missing | `backend/app/main.py:50` |
| endpoint | `POST:/admin/mail/test` | ambiguous | covered | `backend/app/modules/admin_mail/router.py:88` |
| endpoint | `PUT:/admin/mail/config` | ambiguous | covered | `backend/app/modules/admin_mail/router.py:60` |
| frontend_route | `/` | public | covered | `frontend/src/config/routes.ts:8` |
| frontend_route | `/app` | authenticated | covered | `frontend/src/config/routes.ts:15` |
| frontend_route | `/app/403` | authenticated | covered | `frontend/src/config/routes.ts:16` |
| frontend_route | `/app/404` | authenticated | covered | `frontend/src/config/routes.ts:17` |
| frontend_route | `/app/admin/correo` | admin | covered | `frontend/src/config/routes.ts:60` |
| frontend_route | `/registro` | public | covered | `frontend/src/config/routes.ts:10` |
| integration | `cloudflare` | system | covered | `backend/app/core/config.py:1` |
| integration | `open_code` | system | covered | `backend/app/core/config.py:1` |
| integration | `redis` | system | covered | `backend/app/core/config.py:1` |
| table | `ai_config_audit_logs` | system | missing | `backend/alembic/versions/202606290008_admin_ai_config_providers.py:72` |
| table | `ai_configuration_versions` | system | covered | `backend/alembic/versions/202608250004_ai_configuration_history.py:19` |
| table | `ai_global_config` | system | missing | `backend/alembic/versions/202606290002_phases_3_to_8.py:213` |
| table | `ai_global_limits` | system | missing | `backend/alembic/versions/202606290008_admin_ai_config_providers.py:53` |
| table | `ai_jobs` | system | missing | `backend/alembic/versions/202606290002_phases_3_to_8.py:174` |
| table | `ai_usage_events` | system | covered | `backend/alembic/versions/202607280002a_create_ai_usage_events.py:22` |
| table | `ai_usage_logs` | system | covered | `backend/alembic/versions/202606290002_phases_3_to_8.py:193` |
| table | `chat_messages` | system | missing | `backend/alembic/versions/202606290002_phases_3_to_8.py:158` |
| table | `evaluation_blueprints` | system | missing | `backend/alembic/versions/202606290001_initial_phase_1_2.py:121` |
| table | `materiales_generados` | system | covered | `backend/alembic/versions/202606290002_phases_3_to_8.py:121` |

## Decisiones explícitas de permiso

Sin decisiones explícitas de permiso para este dominio.

## Hallazgos

- **low · orphan_candidate**: 19 superficies no alcanzables o históricas se conservan como candidatas a retiro.
- **low · missing_coverage**: 10 superficies de 002-arquitectura-roles-seguridad no tienen evidencia de prueba observable.
