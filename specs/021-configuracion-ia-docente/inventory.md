# Inventario técnico: 021-configuracion-ia-docente

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 76

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `DELETE:/profesor/ai-credentials/{provider}` | authenticated | covered | `backend/app/modules/admin_ai_config/router.py:1124` |
| endpoint | `DELETE:/profesor/ollama-connectors/{connector_id}` | ambiguous | missing | `backend/app/modules/ollama_connector/router.py:54` |
| endpoint | `GET:/admin/ai-audit` | authenticated | covered | `backend/app/modules/admin_ai_config/router.py:792` |
| endpoint | `GET:/admin/ai-config` | authenticated | covered | `backend/app/modules/admin_ai_config/router.py:354` |
| endpoint | `GET:/admin/ai-config-hash` | authenticated | covered | `backend/app/modules/admin_ai_config/router.py:760` |
| endpoint | `GET:/admin/ai-settings` | authenticated | covered | `backend/app/modules/admin_ai_config/router.py:431` |
| endpoint | `GET:/admin/ai-usage` | authenticated | covered | `backend/app/modules/admin_ai_config/router.py:549` |
| endpoint | `GET:/profesor/ai-config` | authenticated | covered | `backend/app/modules/admin_ai_config/router.py:940` |
| endpoint | `GET:/profesor/ai-providers/ollama/models` | authenticated | missing | `backend/app/modules/admin_ai_config/router.py:1166` |
| endpoint | `GET:/profesor/ollama-connectors` | ambiguous | missing | `backend/app/modules/ollama_connector/router.py:46` |
| endpoint | `PATCH:/admin/ai-config` | authenticated | covered | `backend/app/modules/admin_ai_config/router.py:367` |
| endpoint | `PATCH:/admin/ai-providers/{provider_id}` | authenticated | covered | `backend/app/modules/admin_ai_config/router.py:714` |
| endpoint | `PATCH:/profesor/ai-config` | authenticated | covered | `backend/app/modules/admin_ai_config/router.py:821` |
| endpoint | `POST:/admin/ai-cache/clear` | authenticated | missing | `backend/app/modules/admin_ai_config/router.py:559` |
| endpoint | `POST:/admin/ai-providers/ollama/models/refresh` | authenticated | missing | `backend/app/modules/admin_ai_config/router.py:522` |
| endpoint | `POST:/admin/ai-providers/{provider}/test` | authenticated | missing | `backend/app/modules/admin_ai_config/router.py:488` |
| endpoint | `POST:/admin/ai-settings/restore-defaults` | authenticated | missing | `backend/app/modules/admin_ai_config/router.py:731` |
| endpoint | `POST:/admin/ai-settings/restore-previous` | authenticated | covered | `backend/app/modules/admin_ai_config/router.py:743` |
| endpoint | `POST:/connector/jobs/claim` | ambiguous | missing | `backend/app/modules/ollama_connector/router.py:80` |
| endpoint | `POST:/connector/jobs/{job_id}/complete` | ambiguous | missing | `backend/app/modules/ollama_connector/router.py:110` |
| endpoint | `POST:/connector/jobs/{job_id}/fail` | ambiguous | missing | `backend/app/modules/ollama_connector/router.py:121` |
| endpoint | `POST:/connector/jobs/{job_id}/heartbeat` | ambiguous | missing | `backend/app/modules/ollama_connector/router.py:99` |
| endpoint | `POST:/connector/pair` | ambiguous | missing | `backend/app/modules/ollama_connector/router.py:64` |
| endpoint | `POST:/profesor/ai-providers/ollama/models/refresh` | authenticated | missing | `backend/app/modules/admin_ai_config/router.py:1146` |
| endpoint | `POST:/profesor/ai-providers/{provider}/test` | authenticated | covered | `backend/app/modules/admin_ai_config/router.py:1201` |
| endpoint | `POST:/profesor/ollama-connectors/pairing` | ambiguous | missing | `backend/app/modules/ollama_connector/router.py:37` |
| endpoint | `PUT:/admin/ai-features` | authenticated | covered | `backend/app/modules/admin_ai_config/router.py:665` |
| endpoint | `PUT:/admin/ai-providers` | authenticated | covered | `backend/app/modules/admin_ai_config/router.py:637` |
| endpoint | `PUT:/admin/ai-settings/publish` | authenticated | covered | `backend/app/modules/admin_ai_config/router.py:572` |
| endpoint | `PUT:/connector/models` | ambiguous | missing | `backend/app/modules/ollama_connector/router.py:70` |
| endpoint | `PUT:/profesor/ai-config` | authenticated | covered | `backend/app/modules/admin_ai_config/router.py:1034` |
| endpoint | `PUT:/profesor/ai-credentials/{provider}` | authenticated | covered | `backend/app/modules/admin_ai_config/router.py:1099` |
| frontend_route | `/app/admin/configuracion-ia` | admin | covered | `frontend/src/config/routes.ts:57` |
| frontend_route | `/app/configuracion-ia` | authenticated | covered | `frontend/src/config/routes.ts:61` |
| frontend_call | `DELETE:/profesor/ai-credentials/{provider}` | ambiguous | covered | `frontend/src/modules/profesor_ai/api.ts:84` |
| frontend_call | `DELETE:/profesor/ollama-connectors/{connectorId}` | ambiguous | missing | `frontend/src/modules/profesor_ai/api.ts:116` |
| frontend_call | `GET:/admin/ai-audit` | admin | covered | `frontend/src/modules/admin/api.ts:252` |
| frontend_call | `GET:/admin/ai-config-hash` | admin | covered | `frontend/src/modules/admin/api.ts:242` |
| frontend_call | `GET:/admin/ai-settings` | admin | covered | `frontend/src/modules/admin/api.ts:136` |
| frontend_call | `GET:/admin/ai-usage` | admin | covered | `frontend/src/modules/admin/api.ts:247` |
| frontend_call | `GET:/admin/mail/config` | admin | covered | `frontend/src/modules/admin/mailApi.ts:41` |
| frontend_call | `GET:/admin/mail/recovery-status` | admin | covered | `frontend/src/modules/admin/mailApi.ts:56` |
| frontend_call | `GET:/profesor/ai-config` | ambiguous | covered | `frontend/src/modules/profesor_ai/api.ts:70` |
| frontend_call | `GET:/profesor/ai-providers/ollama/models` | ambiguous | missing | `frontend/src/modules/profesor_ai/api.ts:101` |
| frontend_call | `GET:/profesor/ollama-connectors` | ambiguous | missing | `frontend/src/modules/profesor_ai/api.ts:106` |
| frontend_call | `PATCH:/admin/ai-config` | admin | covered | `frontend/src/modules/admin/api.ts:141` |
| frontend_call | `PATCH:/admin/ai-providers/{id}` | admin | covered | `frontend/src/modules/admin/api.ts:223` |
| frontend_call | `POST:/admin/ai-cache/clear` | admin | covered | `frontend/src/modules/admin/api.ts:237` |
| frontend_call | `POST:/admin/ai-providers/ollama/models/refresh` | admin | covered | `frontend/src/modules/admin/api.ts:157` |
| frontend_call | `POST:/admin/ai-providers/{providerId}/test` | admin | covered | `frontend/src/modules/admin/api.ts:149` |
| frontend_call | `POST:/admin/ai-settings/restore-defaults` | admin | covered | `frontend/src/modules/admin/api.ts:232` |
| frontend_call | `POST:/admin/ai-settings/restore-previous` | admin | covered | `frontend/src/modules/admin/api.ts:228` |
| frontend_call | `POST:/admin/mail/test` | admin | covered | `frontend/src/modules/admin/mailApi.ts:51` |
| frontend_call | `POST:/profesor/ai-providers/ollama/models/refresh` | ambiguous | missing | `frontend/src/modules/profesor_ai/api.ts:96` |
| frontend_call | `POST:/profesor/ai-providers/{provider}/test` | ambiguous | covered | `frontend/src/modules/profesor_ai/api.ts:91` |
| frontend_call | `POST:/profesor/ollama-connectors/pairing` | ambiguous | missing | `frontend/src/modules/profesor_ai/api.ts:111` |
| frontend_call | `PUT:/admin/ai-features` | admin | covered | `frontend/src/modules/admin/api.ts:215` |
| frontend_call | `PUT:/admin/ai-providers` | admin | covered | `frontend/src/modules/admin/api.ts:198` |
| frontend_call | `PUT:/admin/ai-settings/publish` | admin | covered | `frontend/src/modules/admin/api.ts:167` |
| frontend_call | `PUT:/admin/mail/config` | admin | covered | `frontend/src/modules/admin/mailApi.ts:46` |
| frontend_call | `PUT:/profesor/ai-config` | ambiguous | covered | `frontend/src/modules/profesor_ai/api.ts:75` |
| frontend_call | `PUT:/profesor/ai-credentials/{provider}` | ambiguous | covered | `frontend/src/modules/profesor_ai/api.ts:80` |
| integration | `groq` | system | covered | `backend/app/services/ai_config_service.py:1` |
| integration | `ollama` | system | covered | `backend/app/services/ai_config_service.py:1` |
| integration | `openai` | system | covered | `backend/app/services/ai_config_service.py:1` |
| table | `ai_feature_routing` | system | missing | `backend/alembic/versions/202606290008_admin_ai_config_providers.py:41` |
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

- **medium · authorization_mismatch**: Permisos observables distintos para GET:/admin/ai-config-hash: backend=['authenticated'], frontend=['admin'].
- **medium · authorization_mismatch**: Permisos observables distintos para GET:/admin/ai-audit: backend=['authenticated'], frontend=['admin'].
- **medium · authorization_mismatch**: Permisos observables distintos para POST:/admin/ai-settings/restore-previous: backend=['authenticated'], frontend=['admin'].
- **medium · authorization_mismatch**: Permisos observables distintos para PUT:/admin/ai-providers: backend=['authenticated'], frontend=['admin'].
- **medium · authorization_mismatch**: Permisos observables distintos para POST:/admin/ai-providers/{}/test: backend=['authenticated'], frontend=['admin'].
- **low · missing_coverage**: 27 superficies de 021-configuracion-ia-docente no tienen evidencia de prueba observable.
- **medium · authorization_mismatch**: Permisos observables distintos para PUT:/admin/ai-features: backend=['authenticated'], frontend=['admin'].
- **medium · authorization_mismatch**: Permisos observables distintos para POST:/admin/ai-providers/ollama/models/refresh: backend=['authenticated'], frontend=['admin'].
- **medium · authorization_mismatch**: Permisos observables distintos para PATCH:/admin/ai-config: backend=['authenticated'], frontend=['admin'].
- **medium · authorization_mismatch**: Permisos observables distintos para POST:/admin/ai-settings/restore-defaults: backend=['authenticated'], frontend=['admin'].
- **medium · authorization_mismatch**: Permisos observables distintos para PATCH:/admin/ai-providers/{}: backend=['authenticated'], frontend=['admin'].
- **low · orphan_candidate**: 19 superficies no alcanzables o históricas se conservan como candidatas a retiro.
- **medium · authorization_mismatch**: Permisos observables distintos para POST:/admin/ai-cache/clear: backend=['authenticated'], frontend=['admin'].
- **medium · authorization_mismatch**: Permisos observables distintos para PUT:/admin/ai-settings/publish: backend=['authenticated'], frontend=['admin'].
- **medium · authorization_mismatch**: Permisos observables distintos para GET:/admin/ai-usage: backend=['authenticated'], frontend=['admin'].
- **medium · authorization_mismatch**: Permisos observables distintos para GET:/admin/ai-settings: backend=['authenticated'], frontend=['admin'].
