# Inventario técnico: 011-reportes-analitica-impacto

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 74

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `GET:/analytics/ai-quality/concordancia` | admin, profesor | covered | `backend/app/modules/analytics/router.py:349` |
| endpoint | `GET:/analytics/ai-quality/confidence` | admin, profesor | covered | `backend/app/modules/analytics/router.py:394` |
| endpoint | `GET:/analytics/ai-quality/costs` | admin, profesor | covered | `backend/app/modules/analytics/router.py:468` |
| endpoint | `GET:/analytics/ai-quality/costs/provider-comparison` | admin, profesor | covered | `backend/app/modules/analytics/router.py:485` |
| endpoint | `GET:/analytics/ai-quality/errors` | admin, profesor | covered | `backend/app/modules/analytics/router.py:380` |
| endpoint | `GET:/analytics/ai-quality/latency` | admin, profesor | covered | `backend/app/modules/analytics/router.py:366` |
| endpoint | `GET:/analytics/ai-quality/usage` | admin, profesor | covered | `backend/app/modules/analytics/router.py:408` |
| endpoint | `GET:/analytics/criterios` | admin, profesor | covered | `backend/app/modules/analytics/router.py:222` |
| endpoint | `GET:/analytics/estudiantes` | admin, profesor | covered | `backend/app/modules/analytics/router.py:255` |
| endpoint | `GET:/analytics/estudiantes/{estudiante_id}` | admin, profesor | covered | `backend/app/modules/analytics/router.py:272` |
| endpoint | `GET:/analytics/evaluaciones` | admin, profesor | covered | `backend/app/modules/analytics/router.py:192` |
| endpoint | `GET:/analytics/evaluaciones/{evaluacion_id}` | admin, profesor | covered | `backend/app/modules/analytics/router.py:208` |
| endpoint | `GET:/analytics/export/criterios.csv` | admin, profesor | covered | `backend/app/modules/analytics/router.py:303` |
| endpoint | `GET:/analytics/export/estudiantes.csv` | admin, profesor | covered | `backend/app/modules/analytics/router.py:326` |
| endpoint | `GET:/analytics/overview` | admin, profesor | covered | `backend/app/modules/analytics/router.py:176` |
| endpoint | `GET:/analytics/preguntas` | admin, profesor | covered | `backend/app/modules/analytics/router.py:239` |
| endpoint | `GET:/analytics/sesiones-trabajo` | admin, estudiante, profesor | covered | `backend/app/modules/analytics/router.py:130` |
| endpoint | `GET:/analytics/sintesis` | admin, profesor | covered | `backend/app/modules/analytics/router.py:286` |
| endpoint | `GET:/impacto/cualitativo` | admin | missing | `backend/app/modules/impacto_tesis/router.py:532` |
| endpoint | `GET:/impacto/estudios` | authenticated | covered | `backend/app/modules/impacto_tesis/router.py:136` |
| endpoint | `GET:/impacto/estudios/disponibilidad` | authenticated | covered | `backend/app/modules/impacto_tesis/router.py:94` |
| endpoint | `GET:/impacto/estudios/{study_id}` | authenticated | covered | `backend/app/modules/impacto_tesis/router.py:146` |
| endpoint | `GET:/impacto/estudios/{study_id}/export` | authenticated | missing | `backend/app/modules/impacto_tesis/router.py:358` |
| endpoint | `GET:/impacto/estudios/{study_id}/indicadores` | authenticated | missing | `backend/app/modules/impacto_tesis/router.py:383` |
| endpoint | `GET:/impacto/estudios/{study_id}/observaciones` | authenticated | missing | `backend/app/modules/impacto_tesis/router.py:339` |
| endpoint | `GET:/impacto/kappa` | admin, profesor | missing | `backend/app/modules/impacto_tesis/router.py:454` |
| endpoint | `GET:/impacto/likert` | authenticated | missing | `backend/app/modules/impacto_tesis/router.py:524` |
| endpoint | `GET:/impacto/tiempo-ahorrado` | admin, profesor | missing | `backend/app/modules/impacto_tesis/router.py:427` |
| endpoint | `GET:/reportes/estudiante/{estudiante_id}` | admin, estudiante, profesor | missing | `backend/app/modules/reportes/router.py:46` |
| endpoint | `GET:/reportes/materia/{materia_id}` | admin, profesor | missing | `backend/app/modules/reportes/router.py:17` |
| endpoint | `GET:/reportes/profesor/resumen` | admin, profesor | covered | `backend/app/modules/reportes/router.py:80` |
| endpoint | `POST:/analytics/evento` | admin, estudiante, profesor | covered | `backend/app/modules/analytics/router.py:85` |
| endpoint | `POST:/analytics/sesiones-trabajo` | admin, profesor | covered | `backend/app/modules/analytics/router.py:106` |
| endpoint | `POST:/analytics/sesiones-trabajo/{session_id}/eventos` | admin, profesor | covered | `backend/app/modules/analytics/router.py:151` |
| endpoint | `POST:/impacto/encuestas` | authenticated | missing | `backend/app/modules/impacto_tesis/router.py:489` |
| endpoint | `POST:/impacto/estudios` | authenticated | covered | `backend/app/modules/impacto_tesis/router.py:104` |
| endpoint | `POST:/impacto/estudios/{study_id}/activar` | authenticated | missing | `backend/app/modules/impacto_tesis/router.py:209` |
| endpoint | `POST:/impacto/estudios/{study_id}/cerrar` | authenticated | missing | `backend/app/modules/impacto_tesis/router.py:242` |
| endpoint | `POST:/impacto/estudios/{study_id}/concesiones` | authenticated | missing | `backend/app/modules/impacto_tesis/router.py:158` |
| endpoint | `POST:/impacto/estudios/{study_id}/concesiones/revocar` | authenticated | missing | `backend/app/modules/impacto_tesis/router.py:184` |
| endpoint | `POST:/impacto/estudios/{study_id}/observaciones` | authenticated | missing | `backend/app/modules/impacto_tesis/router.py:258` |
| endpoint | `POST:/impacto/estudios/{study_id}/retencion/aplicar` | authenticated | missing | `backend/app/modules/impacto_tesis/router.py:394` |
| endpoint | `POST:/reportes/export/pdf` | admin, profesor | missing | `backend/app/modules/reportes/router.py:105` |
| frontend_route | `/app/analytics` | admin, profesor | covered | `frontend/src/config/routes.ts:62` |
| frontend_route | `/app/reportes` | admin, profesor | covered | `frontend/src/config/routes.ts:56` |
| frontend_call | `GET:/analytics/ai-quality/concordancia` | admin, profesor | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:425` |
| frontend_call | `GET:/analytics/ai-quality/confidence` | admin, profesor | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:549` |
| frontend_call | `GET:/analytics/ai-quality/costs/provider-comparison` | admin, profesor | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:620` |
| frontend_call | `GET:/analytics/ai-quality/costs` | admin, profesor | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:616` |
| frontend_call | `GET:/analytics/ai-quality/errors` | admin, profesor | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:584` |
| frontend_call | `GET:/analytics/ai-quality/latency` | admin, profesor | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:548` |
| frontend_call | `GET:/analytics/criterios` | admin, profesor | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:246` |
| frontend_call | `GET:/analytics/estudiantes/{selected}` | admin, profesor | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:482` |
| frontend_call | `GET:/analytics/estudiantes` | admin, profesor | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:473` |
| frontend_call | `GET:/analytics/evaluaciones` | admin, profesor | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:179` |
| frontend_call | `GET:/analytics/overview` | admin, profesor | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:178` |
| frontend_call | `GET:/analytics/preguntas` | admin, profesor | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:247` |
| frontend_call | `GET:/analytics/sesiones-trabajo` | admin, profesor | covered | `frontend/src/lib/analytics.ts:129` |
| frontend_call | `GET:/analytics/sintesis` | admin, profesor | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:248` |
| frontend_call | `GET:/impacto/estudios/disponibilidad` | ambiguous | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:1032` |
| frontend_call | `GET:/impacto/estudios/{effectiveId}/indicadores` | ambiguous | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:874` |
| frontend_call | `GET:/impacto/estudios/{effectiveId}` | ambiguous | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:869` |
| frontend_call | `GET:/impacto/estudios/{id}/export` | ambiguous | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:920` |
| frontend_call | `GET:/impacto/estudios` | ambiguous | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:864` |
| frontend_call | `GET:/reportes/profesor/resumen` | admin, profesor | covered | `frontend/src/modules/reportes/api.ts:5` |
| frontend_call | `POST:/analytics/evento` | admin, profesor | covered | `frontend/src/lib/analytics.ts:139` |
| frontend_call | `POST:/analytics/sesiones-trabajo/{sessionId}/eventos` | admin, profesor | missing | `frontend/src/lib/analytics.ts:113` |
| frontend_call | `POST:/analytics/sesiones-trabajo` | admin, profesor | covered | `frontend/src/lib/analytics.ts:95` |
| frontend_call | `POST:/impacto/estudios/{id}/{action}` | ambiguous | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:906` |
| frontend_call | `POST:/impacto/estudios` | ambiguous | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:894` |
| table | `analytics_eventos` | system | covered | `backend/app/modules/analytics/models.py:14` |
| table | `analytics_work_sessions` | system | covered | `backend/app/modules/analytics/models.py:32` |
| table | `impacto_observations` | system | covered | `backend/app/modules/impacto_tesis/models.py:43` |
| table | `impacto_studies` | system | covered | `backend/app/modules/impacto_tesis/models.py:14` |

## Decisiones explícitas de permiso

- `backend:POST:/analytics/evento` — El catálogo cerrado autoriza eventos por rol y deriva identidad de la sesión antes de persistir. ([issue](https://github.com/Andres-back/Calificator/issues/17)). Evidencia: `backend/tests/unit/test_analytics_events.py`, `frontend/src/lib/analytics.test.ts`.

## Hallazgos

- **low · missing_coverage**: 18 superficies de 011-reportes-analitica-impacto no tienen evidencia de prueba observable.
- **medium · contract_mismatch**: 4 llamadas frontend no tienen endpoint backend canónico coincidente en el análisis estático.
