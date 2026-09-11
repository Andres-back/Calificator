# Inventario técnico: 012-ia-jobs-produccion

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 29

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `GET:/jobs/pendientes` | authenticated | covered | `backend/app/modules/jobs/router.py:53` |
| endpoint | `GET:/jobs/{job_id}` | authenticated | covered | `backend/app/modules/jobs/router.py:115` |
| endpoint | `GET:/jobs/{job_id}/estado` | authenticated | missing | `backend/app/modules/jobs/router.py:167` |
| endpoint | `GET:/jobs/{job_id}/items` | authenticated | missing | `backend/app/modules/jobs/router.py:177` |
| endpoint | `POST:/jobs/{job_id}/cancelar` | authenticated | missing | `backend/app/modules/jobs/router.py:364` |
| endpoint | `POST:/jobs/{job_id}/reintentar` | authenticated | missing | `backend/app/modules/jobs/router.py:233` |
| frontend_call | `GET:/jobs/pendientes` | ambiguous | covered | `frontend/src/modules/calificaciones/gradingJobs.ts:90` |
| frontend_call | `GET:/jobs/{jobId}` | ambiguous | covered | `frontend/src/modules/calificaciones/gradingJobs.ts:156` |
| frontend_call | `GET:/jobs/{jobId}` | ambiguous | covered | `frontend/src/modules/evaluaciones/components/DigitalizationJobMonitor.tsx:114` |
| frontend_call | `POST:/jobs/{jobId}` | ambiguous | covered | `frontend/src/modules/evaluaciones/components/DigitalizationJobMonitor.tsx:223` |
| integration | `celery` | system | covered | `backend/app/workers/tasks_ai_config.py:1` |
| integration | `groq` | system | covered | `backend/app/services/ai_capability_registry.py:1` |
| integration | `ollama` | system | covered | `backend/app/services/ai_capability_registry.py:1` |
| integration | `openai` | system | covered | `backend/app/services/ai_capability_registry.py:1` |
| job | `tasks.assign_overdue_grades` | system | missing | `backend/app/workers/tasks_deadlines.py:46` |
| job | `tasks.cleanup_password_reset_requests` | system | missing | `backend/app/workers/tasks_password_recovery.py:156` |
| job | `tasks.digitalize_evaluation` | system | covered | `backend/app/workers/tasks_digitalization.py:390` |
| job | `tasks.export_report` | system | missing | `backend/app/workers/tasks_reports.py:5` |
| job | `tasks.generate_image` | system | covered | `backend/app/workers/tasks_images.py:5` |
| job | `tasks.generate_presentation` | system | covered | `backend/app/workers/tasks_presentations.py:33` |
| job | `tasks.get_ai_config_version` | system | missing | `backend/app/workers/tasks_ai_config.py:30` |
| job | `tasks.grade_batch` | system | covered | `backend/app/workers/tasks_grading.py:857` |
| job | `tasks.grade_delivery` | system | covered | `backend/app/workers/tasks_grading.py:911` |
| job | `tasks.ingest_rag` | system | missing | `backend/app/workers/tasks_rag.py:5` |
| job | `tasks.recover_expired_local_jobs` | system | missing | `backend/app/workers/tasks_ai_config.py:55` |
| job | `tasks.recover_stale_digitalization_jobs` | system | covered | `backend/app/workers/tasks_digitalization.py:453` |
| job | `tasks.recover_stale_grading_jobs` | system | covered | `backend/app/workers/tasks_grading.py:1018` |
| job | `tasks.recover_stale_presentation_jobs` | system | covered | `backend/app/workers/tasks_presentations.py:84` |
| job | `tasks.send_password_reset_email` | system | missing | `backend/app/workers/tasks_password_recovery.py:116` |

## Decisiones explícitas de permiso

Sin decisiones explícitas de permiso para este dominio.

## Hallazgos

- **low · missing_coverage**: 11 superficies de 012-ia-jobs-produccion no tienen evidencia de prueba observable.
- **medium · contract_mismatch**: 4 llamadas frontend no tienen endpoint backend canónico coincidente en el análisis estático.
