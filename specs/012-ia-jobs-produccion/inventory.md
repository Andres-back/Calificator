# Inventario técnico: 012-ia-jobs-produccion

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 41

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `GET:/admin/ai-audit` | admin | covered | `backend/app/modules/admin_ai_config/router.py:528` |
| endpoint | `GET:/admin/ai-config` | admin | covered | `backend/app/modules/admin_ai_config/router.py:239` |
| endpoint | `GET:/admin/ai-config-hash` | admin | covered | `backend/app/modules/admin_ai_config/router.py:496` |
| endpoint | `GET:/admin/ai-settings` | admin | covered | `backend/app/modules/admin_ai_config/router.py:314` |
| endpoint | `GET:/admin/ai-usage` | admin | covered | `backend/app/modules/admin_ai_config/router.py:403` |
| endpoint | `GET:/jobs/{job_id}` | authenticated | missing | `backend/app/modules/jobs/router.py:28` |
| endpoint | `GET:/jobs/{job_id}/estado` | authenticated | missing | `backend/app/modules/jobs/router.py:37` |
| endpoint | `PATCH:/admin/ai-config` | admin | covered | `backend/app/modules/admin_ai_config/router.py:252` |
| endpoint | `PATCH:/admin/ai-providers/{provider_id}` | admin | covered | `backend/app/modules/admin_ai_config/router.py:467` |
| endpoint | `PATCH:/profesor/ai-config` | admin, profesor | missing | `backend/app/modules/admin_ai_config/router.py:557` |
| endpoint | `POST:/admin/ai-cache/clear` | admin | missing | `backend/app/modules/admin_ai_config/router.py:413` |
| endpoint | `POST:/admin/ai-providers/{provider}/test` | admin | missing | `backend/app/modules/admin_ai_config/router.py:367` |
| endpoint | `POST:/admin/ai-settings/restore-defaults` | admin | missing | `backend/app/modules/admin_ai_config/router.py:484` |
| endpoint | `POST:/jobs/{job_id}/cancelar` | authenticated | missing | `backend/app/modules/jobs/router.py:47` |
| endpoint | `PUT:/admin/ai-features` | admin | missing | `backend/app/modules/admin_ai_config/router.py:454` |
| endpoint | `PUT:/admin/ai-providers` | admin | covered | `backend/app/modules/admin_ai_config/router.py:426` |
| frontend_call | `GET:/admin/ai-audit` | admin | covered | `frontend/src/modules/admin/api.ts:183` |
| frontend_call | `GET:/admin/ai-config-hash` | admin | covered | `frontend/src/modules/admin/api.ts:173` |
| frontend_call | `GET:/admin/ai-settings` | admin | covered | `frontend/src/modules/admin/api.ts:115` |
| frontend_call | `GET:/admin/ai-usage` | admin | covered | `frontend/src/modules/admin/api.ts:178` |
| frontend_call | `GET:/jobs/{jobId}` | ambiguous | covered | `frontend/src/modules/calificaciones/GradingJobMonitor.tsx:42` |
| frontend_call | `GET:/jobs/{jobId}` | ambiguous | missing | `frontend/src/modules/evaluaciones/components/DigitalizationJobMonitor.tsx:77` |
| frontend_call | `PATCH:/admin/ai-config` | admin | covered | `frontend/src/modules/admin/api.ts:120` |
| frontend_call | `PATCH:/admin/ai-providers/{id}` | admin | covered | `frontend/src/modules/admin/api.ts:158` |
| frontend_call | `POST:/admin/ai-cache/clear` | admin | covered | `frontend/src/modules/admin/api.ts:168` |
| frontend_call | `POST:/admin/ai-providers/{providerId}/test` | admin | covered | `frontend/src/modules/admin/api.ts:125` |
| frontend_call | `POST:/admin/ai-settings/restore-defaults` | admin | covered | `frontend/src/modules/admin/api.ts:163` |
| frontend_call | `PUT:/admin/ai-features` | admin | covered | `frontend/src/modules/admin/api.ts:153` |
| frontend_call | `PUT:/admin/ai-providers` | admin | covered | `frontend/src/modules/admin/api.ts:141` |
| integration | `celery` | system | missing | `backend/app/workers/tasks_ai_config.py:1` |
| integration | `groq` | system | covered | `backend/app/services/ai_config_service.py:1` |
| integration | `ollama` | system | covered | `backend/app/services/ai_config_service.py:1` |
| integration | `openai` | system | covered | `backend/app/services/ai_config_service.py:1` |
| job | `tasks.assign_overdue_grades` | system | missing | `backend/app/workers/tasks_deadlines.py:46` |
| job | `tasks.digitalize_evaluation` | system | missing | `backend/app/workers/tasks_digitalization.py:202` |
| job | `tasks.export_report` | system | missing | `backend/app/workers/tasks_reports.py:5` |
| job | `tasks.generate_image` | system | missing | `backend/app/workers/tasks_images.py:5` |
| job | `tasks.generate_presentation` | system | missing | `backend/app/workers/tasks_presentations.py:32` |
| job | `tasks.get_ai_config_version` | system | missing | `backend/app/workers/tasks_ai_config.py:28` |
| job | `tasks.grade_batch` | system | missing | `backend/app/workers/tasks_grading.py:556` |
| job | `tasks.ingest_rag` | system | missing | `backend/app/workers/tasks_rag.py:5` |

## Hallazgos

- **low · missing_coverage**: 18 superficies de 012-ia-jobs-produccion no tienen evidencia de prueba observable.
