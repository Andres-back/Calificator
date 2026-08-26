# Inventario técnico: 012-ia-jobs-produccion

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 14

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `GET:/jobs/{job_id}` | authenticated | missing | `backend/app/modules/jobs/router.py:28` |
| endpoint | `GET:/jobs/{job_id}/estado` | authenticated | missing | `backend/app/modules/jobs/router.py:45` |
| endpoint | `POST:/jobs/{job_id}/cancelar` | authenticated | missing | `backend/app/modules/jobs/router.py:55` |
| frontend_call | `GET:/jobs/{jobId}` | ambiguous | covered | `frontend/src/modules/calificaciones/GradingJobMonitor.tsx:42` |
| frontend_call | `GET:/jobs/{jobId}` | ambiguous | missing | `frontend/src/modules/evaluaciones/components/DigitalizationJobMonitor.tsx:96` |
| integration | `celery` | system | missing | `backend/app/workers/tasks_ai_config.py:1` |
| job | `tasks.assign_overdue_grades` | system | missing | `backend/app/workers/tasks_deadlines.py:46` |
| job | `tasks.digitalize_evaluation` | system | missing | `backend/app/workers/tasks_digitalization.py:255` |
| job | `tasks.export_report` | system | missing | `backend/app/workers/tasks_reports.py:5` |
| job | `tasks.generate_image` | system | missing | `backend/app/workers/tasks_images.py:5` |
| job | `tasks.generate_presentation` | system | missing | `backend/app/workers/tasks_presentations.py:32` |
| job | `tasks.get_ai_config_version` | system | missing | `backend/app/workers/tasks_ai_config.py:28` |
| job | `tasks.grade_batch` | system | missing | `backend/app/workers/tasks_grading.py:637` |
| job | `tasks.ingest_rag` | system | missing | `backend/app/workers/tasks_rag.py:5` |

## Decisiones explícitas de permiso

Sin decisiones explícitas de permiso para este dominio.

## Hallazgos

- **low · missing_coverage**: 13 superficies de 012-ia-jobs-produccion no tienen evidencia de prueba observable.
