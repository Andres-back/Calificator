# Inventario técnico: 021-configuracion-ia-docente

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 56

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `DELETE:/profesor/ai-credentials/{provider}` | profesor | covered | `backend/app/modules/admin_ai_config/router.py:946` |
| endpoint | `GET:/admin/ai-audit` | admin | covered | `backend/app/modules/admin_ai_config/router.py:686` |
| endpoint | `GET:/admin/ai-config` | admin | covered | `backend/app/modules/admin_ai_config/router.py:269` |
| endpoint | `GET:/admin/ai-config-hash` | admin | covered | `backend/app/modules/admin_ai_config/router.py:654` |
| endpoint | `GET:/admin/ai-settings` | admin | covered | `backend/app/modules/admin_ai_config/router.py:344` |
| endpoint | `GET:/admin/ai-usage` | admin | covered | `backend/app/modules/admin_ai_config/router.py:443` |
| endpoint | `GET:/profesor/ai-config` | profesor | covered | `backend/app/modules/admin_ai_config/router.py:808` |
| endpoint | `PATCH:/admin/ai-config` | admin | covered | `backend/app/modules/admin_ai_config/router.py:282` |
| endpoint | `PATCH:/admin/ai-providers/{provider_id}` | admin | covered | `backend/app/modules/admin_ai_config/router.py:608` |
| endpoint | `PATCH:/profesor/ai-config` | profesor | covered | `backend/app/modules/admin_ai_config/router.py:715` |
| endpoint | `POST:/admin/ai-cache/clear` | admin | missing | `backend/app/modules/admin_ai_config/router.py:453` |
| endpoint | `POST:/admin/ai-providers/{provider}/test` | admin | missing | `backend/app/modules/admin_ai_config/router.py:401` |
| endpoint | `POST:/admin/ai-settings/restore-defaults` | admin | missing | `backend/app/modules/admin_ai_config/router.py:625` |
| endpoint | `POST:/admin/ai-settings/restore-previous` | admin | covered | `backend/app/modules/admin_ai_config/router.py:637` |
| endpoint | `POST:/profesor/ai-providers/{provider}/test` | profesor | covered | `backend/app/modules/admin_ai_config/router.py:963` |
| endpoint | `PUT:/admin/ai-features` | admin | covered | `backend/app/modules/admin_ai_config/router.py:559` |
| endpoint | `PUT:/admin/ai-providers` | admin | covered | `backend/app/modules/admin_ai_config/router.py:531` |
| endpoint | `PUT:/admin/ai-settings/publish` | admin | covered | `backend/app/modules/admin_ai_config/router.py:466` |
| endpoint | `PUT:/profesor/ai-config` | profesor | covered | `backend/app/modules/admin_ai_config/router.py:856` |
| endpoint | `PUT:/profesor/ai-credentials/{provider}` | profesor | covered | `backend/app/modules/admin_ai_config/router.py:921` |
| frontend_route | `/app/admin/configuracion-ia` | admin | covered | `frontend/src/config/routes.ts:57` |
| frontend_route | `/app/configuracion-ia` | authenticated | covered | `frontend/src/config/routes.ts:60` |
| frontend_call | `DELETE:/profesor/ai-credentials/{provider}` | ambiguous | covered | `frontend/src/modules/profesor_ai/api.ts:57` |
| frontend_call | `GET:/admin/ai-audit` | admin | covered | `frontend/src/modules/admin/api.ts:244` |
| frontend_call | `GET:/admin/ai-config-hash` | admin | covered | `frontend/src/modules/admin/api.ts:234` |
| frontend_call | `GET:/admin/ai-settings` | admin | covered | `frontend/src/modules/admin/api.ts:133` |
| frontend_call | `GET:/admin/ai-usage` | admin | covered | `frontend/src/modules/admin/api.ts:239` |
| frontend_call | `GET:/admin/mail/config` | admin | covered | `frontend/src/modules/admin/mailApi.ts:41` |
| frontend_call | `GET:/admin/mail/recovery-status` | admin | covered | `frontend/src/modules/admin/mailApi.ts:56` |
| frontend_call | `GET:/admin/users` | admin | covered | `frontend/src/modules/admin/usersApi.ts:15` |
| frontend_call | `GET:/profesor/ai-config` | ambiguous | covered | `frontend/src/modules/profesor_ai/api.ts:43` |
| frontend_call | `PATCH:/admin/ai-config` | admin | covered | `frontend/src/modules/admin/api.ts:138` |
| frontend_call | `PATCH:/admin/ai-providers/{id}` | admin | covered | `frontend/src/modules/admin/api.ts:215` |
| frontend_call | `PATCH:/admin/users/{id}/solicitud-docente` | admin | covered | `frontend/src/modules/admin/usersApi.ts:25` |
| frontend_call | `PATCH:/admin/users/{id}` | admin | covered | `frontend/src/modules/admin/usersApi.ts:20` |
| frontend_call | `POST:/admin/ai-cache/clear` | admin | covered | `frontend/src/modules/admin/api.ts:229` |
| frontend_call | `POST:/admin/ai-providers/{providerId}/test` | admin | covered | `frontend/src/modules/admin/api.ts:146` |
| frontend_call | `POST:/admin/ai-settings/restore-defaults` | admin | covered | `frontend/src/modules/admin/api.ts:224` |
| frontend_call | `POST:/admin/ai-settings/restore-previous` | admin | covered | `frontend/src/modules/admin/api.ts:220` |
| frontend_call | `POST:/admin/mail/test` | admin | covered | `frontend/src/modules/admin/mailApi.ts:51` |
| frontend_call | `POST:/profesor/ai-providers/{provider}/test` | ambiguous | covered | `frontend/src/modules/profesor_ai/api.ts:64` |
| frontend_call | `PUT:/admin/ai-features` | admin | covered | `frontend/src/modules/admin/api.ts:207` |
| frontend_call | `PUT:/admin/ai-providers` | admin | covered | `frontend/src/modules/admin/api.ts:190` |
| frontend_call | `PUT:/admin/ai-settings/publish` | admin | covered | `frontend/src/modules/admin/api.ts:159` |
| frontend_call | `PUT:/admin/mail/config` | admin | covered | `frontend/src/modules/admin/mailApi.ts:46` |
| frontend_call | `PUT:/profesor/ai-config` | ambiguous | covered | `frontend/src/modules/profesor_ai/api.ts:48` |
| frontend_call | `PUT:/profesor/ai-credentials/{provider}` | ambiguous | covered | `frontend/src/modules/profesor_ai/api.ts:53` |
| integration | `groq` | system | covered | `backend/app/services/ai_config_service.py:1` |
| integration | `ollama` | system | covered | `backend/app/services/ai_config_service.py:1` |
| integration | `openai` | system | covered | `backend/app/services/ai_config_service.py:1` |
| table | `ai_feature_routing` | system | missing | `backend/alembic/versions/202606290008_admin_ai_config_providers.py:41` |
| table | `ai_provider_models` | system | covered | `backend/alembic/versions/202608250001_teacher_ai_configuration.py:35` |
| table | `ai_provider_settings` | system | missing | `backend/alembic/versions/202606290008_admin_ai_config_providers.py:20` |
| table | `profesor_ai_configs` | system | covered | `backend/alembic/versions/202606290002_phases_3_to_8.py:227` |
| table | `profesor_ai_credentials` | system | covered | `backend/alembic/versions/202608250001_teacher_ai_configuration.py:72` |
| table | `profesor_ai_feature_preferences` | system | covered | `backend/alembic/versions/202608250001_teacher_ai_configuration.py:94` |

## Decisiones explícitas de permiso

Sin decisiones explícitas de permiso para este dominio.

## Hallazgos

- **low · missing_coverage**: 5 superficies de 021-configuracion-ia-docente no tienen evidencia de prueba observable.
- **low · orphan_candidate**: 18 superficies no alcanzables o históricas se conservan como candidatas a retiro.
