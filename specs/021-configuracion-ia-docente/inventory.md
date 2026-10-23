# Inventario técnico: 021-configuracion-ia-docente

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 91

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `DELETE:/profesor/ai-credentials/{provider}` | admin, profesor | covered | `backend/app/modules/admin_ai_config/router.py:1267` |
| endpoint | `DELETE:/profesor/ollama-connectors/{connector_id}` | admin, profesor | missing | `backend/app/modules/ollama_connector/router.py:54` |
| endpoint | `GET:/admin/ai-audit` | admin | covered | `backend/app/modules/admin_ai_config/router.py:917` |
| endpoint | `GET:/admin/ai-config` | admin | covered | `backend/app/modules/admin_ai_config/router.py:291` |
| endpoint | `GET:/admin/ai-config-hash` | admin | covered | `backend/app/modules/admin_ai_config/router.py:885` |
| endpoint | `GET:/admin/ai-control-center` | admin | covered | `backend/app/modules/admin_ai_config/router.py:448` |
| endpoint | `GET:/admin/ai-control-center/effective` | admin | missing | `backend/app/modules/admin_ai_config/router.py:480` |
| endpoint | `GET:/admin/ai-control-center/usage` | admin | covered | `backend/app/modules/admin_ai_config/router.py:457` |
| endpoint | `GET:/admin/ai-settings` | admin | covered | `backend/app/modules/admin_ai_config/router.py:368` |
| endpoint | `GET:/admin/ai-usage` | admin | covered | `backend/app/modules/admin_ai_config/router.py:714` |
| endpoint | `GET:/profesor/ai-config` | admin, profesor | covered | `backend/app/modules/admin_ai_config/router.py:1065` |
| endpoint | `GET:/profesor/ai-providers/ollama/models` | admin, profesor | missing | `backend/app/modules/admin_ai_config/router.py:1309` |
| endpoint | `GET:/profesor/ollama-connectors` | admin, profesor | missing | `backend/app/modules/ollama_connector/router.py:46` |
| endpoint | `PATCH:/admin/ai-config` | admin | covered | `backend/app/modules/admin_ai_config/router.py:304` |
| endpoint | `PATCH:/admin/ai-providers/{provider_id}` | admin | covered | `backend/app/modules/admin_ai_config/router.py:828` |
| endpoint | `PATCH:/profesor/ai-config` | admin, profesor | covered | `backend/app/modules/admin_ai_config/router.py:946` |
| endpoint | `POST:/admin/ai-api/connections` | admin | covered | `backend/app/modules/admin_ai_config/router.py:544` |
| endpoint | `POST:/admin/ai-api/connections/{provider_id}/credential` | admin | missing | `backend/app/modules/admin_ai_config/router.py:556` |
| endpoint | `POST:/admin/ai-api/models/discover` | admin | covered | `backend/app/modules/admin_ai_config/router.py:581` |
| endpoint | `POST:/admin/ai-api/models/probe` | admin | covered | `backend/app/modules/admin_ai_config/router.py:574` |
| endpoint | `POST:/admin/ai-cache/clear` | admin | missing | `backend/app/modules/admin_ai_config/router.py:724` |
| endpoint | `POST:/admin/ai-control-center/validate` | admin | covered | `backend/app/modules/admin_ai_config/router.py:509` |
| endpoint | `POST:/admin/ai-providers/{provider}/models/refresh` | admin | missing | `backend/app/modules/admin_ai_config/router.py:673` |
| endpoint | `POST:/admin/ai-providers/{provider}/test` | admin | missing | `backend/app/modules/admin_ai_config/router.py:630` |
| endpoint | `POST:/admin/ai-settings/restore-defaults` | admin | missing | `backend/app/modules/admin_ai_config/router.py:854` |
| endpoint | `POST:/admin/ai-settings/restore-previous` | admin | covered | `backend/app/modules/admin_ai_config/router.py:867` |
| endpoint | `POST:/connector/jobs/claim` | ambiguous | missing | `backend/app/modules/ollama_connector/router.py:80` |
| endpoint | `POST:/connector/jobs/{job_id}/complete` | ambiguous | missing | `backend/app/modules/ollama_connector/router.py:110` |
| endpoint | `POST:/connector/jobs/{job_id}/fail` | ambiguous | missing | `backend/app/modules/ollama_connector/router.py:121` |
| endpoint | `POST:/connector/jobs/{job_id}/heartbeat` | ambiguous | missing | `backend/app/modules/ollama_connector/router.py:99` |
| endpoint | `POST:/connector/pair` | ambiguous | missing | `backend/app/modules/ollama_connector/router.py:64` |
| endpoint | `POST:/profesor/ai-providers/ollama/models/refresh` | admin, profesor | missing | `backend/app/modules/admin_ai_config/router.py:1289` |
| endpoint | `POST:/profesor/ai-providers/{provider}/test` | admin, profesor | covered | `backend/app/modules/admin_ai_config/router.py:1344` |
| endpoint | `POST:/profesor/ollama-connectors/pairing` | admin, profesor | missing | `backend/app/modules/ollama_connector/router.py:37` |
| endpoint | `PUT:/admin/ai-control-center/publish` | admin | covered | `backend/app/modules/admin_ai_config/router.py:592` |
| endpoint | `PUT:/admin/ai-features` | admin | covered | `backend/app/modules/admin_ai_config/router.py:778` |
| endpoint | `PUT:/admin/ai-providers` | admin | covered | `backend/app/modules/admin_ai_config/router.py:748` |
| endpoint | `PUT:/admin/ai-settings/publish` | admin | covered | `backend/app/modules/admin_ai_config/router.py:737` |
| endpoint | `PUT:/connector/models` | ambiguous | missing | `backend/app/modules/ollama_connector/router.py:70` |
| endpoint | `PUT:/profesor/ai-config` | admin, profesor | covered | `backend/app/modules/admin_ai_config/router.py:1177` |
| endpoint | `PUT:/profesor/ai-credentials/{provider}` | admin, profesor | covered | `backend/app/modules/admin_ai_config/router.py:1242` |
| frontend_route | `/app/admin/configuracion-ia` | admin | covered | `frontend/src/config/routes.ts:64` |
| frontend_route | `/app/configuracion-ia` | authenticated | covered | `frontend/src/config/routes.ts:68` |
| frontend_call | `DELETE:/profesor/ai-credentials/{provider}` | ambiguous | covered | `frontend/src/modules/profesor_ai/api.ts:84` |
| frontend_call | `DELETE:/profesor/ollama-connectors/{connectorId}` | ambiguous | missing | `frontend/src/modules/profesor_ai/api.ts:116` |
| frontend_call | `GET:/admin/ai-audit` | admin | covered | `frontend/src/modules/admin/api.ts:452` |
| frontend_call | `GET:/admin/ai-config-hash` | admin | covered | `frontend/src/modules/admin/api.ts:442` |
| frontend_call | `GET:/admin/ai-control-center/usage` | admin | covered | `frontend/src/modules/admin/api.ts:300` |
| frontend_call | `GET:/admin/ai-control-center` | admin | covered | `frontend/src/modules/admin/api.ts:287` |
| frontend_call | `GET:/admin/ai-settings` | admin | covered | `frontend/src/modules/admin/api.ts:282` |
| frontend_call | `GET:/admin/ai-usage` | admin | covered | `frontend/src/modules/admin/api.ts:447` |
| frontend_call | `GET:/admin/mail/config` | admin | covered | `frontend/src/modules/admin/mailApi.ts:41` |
| frontend_call | `GET:/admin/mail/recovery-status` | admin | covered | `frontend/src/modules/admin/mailApi.ts:56` |
| frontend_call | `GET:/profesor/ai-config` | ambiguous | covered | `frontend/src/modules/profesor_ai/api.ts:70` |
| frontend_call | `GET:/profesor/ai-providers/ollama/models` | ambiguous | missing | `frontend/src/modules/profesor_ai/api.ts:101` |
| frontend_call | `GET:/profesor/ollama-connectors` | ambiguous | missing | `frontend/src/modules/profesor_ai/api.ts:106` |
| frontend_call | `PATCH:/admin/ai-config` | admin | covered | `frontend/src/modules/admin/api.ts:341` |
| frontend_call | `PATCH:/admin/ai-providers/{id}` | admin | covered | `frontend/src/modules/admin/api.ts:423` |
| frontend_call | `POST:/admin/ai-api/models/discover` | admin | covered | `frontend/src/modules/admin/api.ts:175` |
| frontend_call | `POST:/admin/ai-api/models/probe` | admin | covered | `frontend/src/modules/admin/api.ts:182` |
| frontend_call | `POST:/admin/ai-cache/clear` | admin | covered | `frontend/src/modules/admin/api.ts:437` |
| frontend_call | `POST:/admin/ai-control-center/validate` | admin | covered | `frontend/src/modules/admin/api.ts:313` |
| frontend_call | `POST:/admin/ai-providers/{providerId}/models/refresh` | admin | covered | `frontend/src/modules/admin/api.ts:357` |
| frontend_call | `POST:/admin/ai-providers/{providerId}/test` | admin | covered | `frontend/src/modules/admin/api.ts:349` |
| frontend_call | `POST:/admin/ai-settings/restore-defaults` | admin | covered | `frontend/src/modules/admin/api.ts:432` |
| frontend_call | `POST:/admin/ai-settings/restore-previous` | admin | covered | `frontend/src/modules/admin/api.ts:428` |
| frontend_call | `POST:/admin/mail/test` | admin | covered | `frontend/src/modules/admin/mailApi.ts:51` |
| frontend_call | `POST:/profesor/ai-providers/ollama/models/refresh` | ambiguous | missing | `frontend/src/modules/profesor_ai/api.ts:96` |
| frontend_call | `POST:/profesor/ai-providers/{provider}/test` | ambiguous | covered | `frontend/src/modules/profesor_ai/api.ts:91` |
| frontend_call | `POST:/profesor/ollama-connectors/pairing` | ambiguous | missing | `frontend/src/modules/profesor_ai/api.ts:111` |
| frontend_call | `PUT:/admin/ai-control-center/publish` | admin | covered | `frontend/src/modules/admin/api.ts:330` |
| frontend_call | `PUT:/admin/ai-features` | admin | covered | `frontend/src/modules/admin/api.ts:415` |
| frontend_call | `PUT:/admin/ai-providers` | admin | covered | `frontend/src/modules/admin/api.ts:398` |
| frontend_call | `PUT:/admin/ai-settings/publish` | admin | covered | `frontend/src/modules/admin/api.ts:367` |
| frontend_call | `PUT:/admin/mail/config` | admin | covered | `frontend/src/modules/admin/mailApi.ts:46` |
| frontend_call | `PUT:/profesor/ai-config` | ambiguous | covered | `frontend/src/modules/profesor_ai/api.ts:75` |
| frontend_call | `PUT:/profesor/ai-credentials/{provider}` | ambiguous | covered | `frontend/src/modules/profesor_ai/api.ts:80` |
| integration | `ollama` | system | covered | `backend/app/services/ai_api_connections.py:1` |
| table | `ai_api_credentials` | system | covered | `backend/alembic/versions/202610230001_ai_api_profiles.py:35` |
| table | `ai_api_model_checks` | system | missing | `backend/alembic/versions/202610230001_ai_api_profiles.py:54` |
| table | `ai_feature_routing` | system | covered | `backend/alembic/versions/202606290008_admin_ai_config_providers.py:41` |
| table | `ai_provider_models` | system | covered | `backend/alembic/versions/202608250001_teacher_ai_configuration.py:35` |
| table | `ai_provider_settings` | system | missing | `backend/alembic/versions/202606290008_admin_ai_config_providers.py:20` |
| table | `ollama_connector_jobs` | system | missing | `backend/app/modules/ollama_connector/models.py:56` |
| table | `ollama_connector_models` | system | missing | `backend/app/modules/ollama_connector/models.py:44` |
| table | `ollama_connectors` | system | missing | `backend/app/modules/ollama_connector/models.py:12` |
| table | `ollama_pairing_codes` | system | missing | `backend/app/modules/ollama_connector/models.py:31` |
| table | `profesor_ai_configs` | system | covered | `backend/alembic/versions/202606290002_phases_3_to_8.py:227` |
| table | `profesor_ai_credentials` | system | covered | `backend/alembic/versions/202608250001_teacher_ai_configuration.py:72` |
| table | `profesor_ai_feature_preferences` | system | covered | `backend/alembic/versions/202608250001_teacher_ai_configuration.py:94` |
| table | `profesor_ai_provider_models` | system | missing | `backend/alembic/versions/202608300002_ollama_connectors.py:28` |

## Decisiones explícitas de permiso

Sin decisiones explícitas de permiso para este dominio.

## Hallazgos

- **low · orphan_candidate**: 25 superficies no alcanzables o históricas se conservan como candidatas a retiro.
- **low · missing_coverage**: 29 superficies de 021-configuracion-ia-docente no tienen evidencia de prueba observable.
