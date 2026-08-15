# Inventario técnico: 002-arquitectura-roles-seguridad

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 24

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `GET:/docs` | public | missing | `backend/app/main.py:44` |
| endpoint | `GET:/health` | public | missing | `backend/app/main.py:40` |
| endpoint | `GET:/openapi.json` | public | missing | `backend/app/main.py:56` |
| endpoint | `GET:/redoc` | public | missing | `backend/app/main.py:50` |
| frontend_route | `/` | public | covered | `frontend/src/router.tsx:133` |
| frontend_route | `/app` | authenticated | covered | `frontend/src/config/routes.ts:11` |
| frontend_route | `/app/403` | estudiante | covered | `frontend/src/config/routes.ts:12` |
| frontend_route | `/app/404` | estudiante | covered | `frontend/src/config/routes.ts:13` |
| frontend_route | `/app/admin/configuracion-ia` | admin | covered | `frontend/src/config/routes.ts:53` |
| integration | `cloudflare` | system | covered | `backend/app/core/config.py:1` |
| integration | `open_code` | system | covered | `backend/app/core/config.py:1` |
| integration | `redis` | system | covered | `backend/app/core/config.py:1` |
| table | `ai_config_audit_logs` | system | missing | `backend/alembic/versions/202606290008_admin_ai_config_providers.py:72` |
| table | `ai_feature_routing` | system | missing | `backend/alembic/versions/202606290008_admin_ai_config_providers.py:41` |
| table | `ai_global_config` | system | missing | `backend/alembic/versions/202606290002_phases_3_to_8.py:213` |
| table | `ai_global_limits` | system | missing | `backend/alembic/versions/202606290008_admin_ai_config_providers.py:53` |
| table | `ai_jobs` | system | missing | `backend/alembic/versions/202606290002_phases_3_to_8.py:174` |
| table | `ai_provider_settings` | system | missing | `backend/alembic/versions/202606290008_admin_ai_config_providers.py:20` |
| table | `ai_usage_events` | system | covered | `backend/alembic/versions/202607280002a_create_ai_usage_events.py:22` |
| table | `ai_usage_logs` | system | covered | `backend/alembic/versions/202606290002_phases_3_to_8.py:193` |
| table | `chat_messages` | system | missing | `backend/alembic/versions/202606290002_phases_3_to_8.py:158` |
| table | `evaluation_blueprints` | system | missing | `backend/alembic/versions/202606290001_initial_phase_1_2.py:121` |
| table | `materiales_generados` | system | covered | `backend/alembic/versions/202606290002_phases_3_to_8.py:121` |
| table | `profesor_ai_configs` | system | missing | `backend/alembic/versions/202606290002_phases_3_to_8.py:227` |

## Decisiones explícitas de permiso

Sin decisiones explícitas de permiso para este dominio.

## Hallazgos

- **low · orphan_candidate**: 12 superficies no alcanzables o históricas se conservan como candidatas a retiro.
- **low · missing_coverage**: 13 superficies de 002-arquitectura-roles-seguridad no tienen evidencia de prueba observable.
