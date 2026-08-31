# Inventario técnico: 012-ia-jobs-produccion

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 19

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `GET:/jobs/{job_id}` | authenticated | covered | `backend/app/modules/jobs/router.py:28` |
| endpoint | `GET:/jobs/{job_id}/estado` | authenticated | missing | `backend/app/modules/jobs/router.py:45` |
| endpoint | `POST:/jobs/{job_id}/cancelar` | authenticated | missing | `backend/app/modules/jobs/router.py:55` |
| frontend_call | `GET:/jobs/{jobId}` | ambiguous | covered | `frontend/src/modules/calificaciones/GradingJobMonitor.tsx:42` |
| frontend_call | `GET:/jobs/{jobId}` | ambiguous | covered | `frontend/src/modules/evaluaciones/components/DigitalizationJobMonitor.tsx:96` |
| integration | `celery` | system | covered | `backend/app/workers/tasks_ai_config.py:1` |
| job | `tasks.assign_overdue_grades` | system | missing | `backend/app/workers/tasks_deadlines.py:46` |
| job | `tasks.cleanup_password_reset_requests` | system | missing | `backend/app/workers/tasks_password_recovery.py:156` |
| job | `tasks.digitalize_evaluation` | system | missing | `backend/app/workers/tasks_digitalization.py:255` |
| job | `tasks.export_report` | system | missing | `backend/app/workers/tasks_reports.py:5` |
| job | `tasks.generate_image` | system | missing | `backend/app/workers/tasks_images.py:5` |
| job | `tasks.generate_presentation` | system | missing | `backend/app/workers/tasks_presentations.py:33` |
| job | `tasks.get_ai_config_version` | system | missing | `backend/app/workers/tasks_ai_config.py:30` |
| job | `tasks.grade_batch` | system | covered | `backend/app/workers/tasks_grading.py:691` |
| job | `tasks.ingest_rag` | system | missing | `backend/app/workers/tasks_rag.py:5` |
| job | `tasks.recover_expired_local_jobs` | system | missing | `backend/app/workers/tasks_ai_config.py:55` |
| job | `tasks.recover_stale_grading_jobs` | system | missing | `backend/app/workers/tasks_grading.py:782` |
| job | `tasks.recover_stale_presentation_jobs` | system | missing | `backend/app/workers/tasks_presentations.py:84` |
| job | `tasks.send_password_reset_email` | system | missing | `backend/app/workers/tasks_password_recovery.py:116` |

## Decisiones explícitas de permiso

Sin decisiones explícitas de permiso para este dominio.

## Hallazgos

- **low · missing_coverage**: 14 superficies de 012-ia-jobs-produccion no tienen evidencia de prueba observable.
