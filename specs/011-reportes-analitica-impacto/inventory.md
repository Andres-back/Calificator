# Inventario técnico: 011-reportes-analitica-impacto

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 45

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `GET:/analytics/ai-quality/concordancia` | admin, profesor | covered | `backend/app/modules/analytics/router.py:219` |
| endpoint | `GET:/analytics/ai-quality/confidence` | admin, profesor | covered | `backend/app/modules/analytics/router.py:264` |
| endpoint | `GET:/analytics/ai-quality/costs` | admin, profesor | covered | `backend/app/modules/analytics/router.py:336` |
| endpoint | `GET:/analytics/ai-quality/costs/provider-comparison` | admin, profesor | covered | `backend/app/modules/analytics/router.py:353` |
| endpoint | `GET:/analytics/ai-quality/errors` | admin, profesor | covered | `backend/app/modules/analytics/router.py:250` |
| endpoint | `GET:/analytics/ai-quality/latency` | admin, profesor | covered | `backend/app/modules/analytics/router.py:236` |
| endpoint | `GET:/analytics/ai-quality/usage` | admin, profesor | covered | `backend/app/modules/analytics/router.py:278` |
| endpoint | `GET:/analytics/criterios` | admin, profesor | covered | `backend/app/modules/analytics/router.py:92` |
| endpoint | `GET:/analytics/estudiantes` | admin, profesor | covered | `backend/app/modules/analytics/router.py:125` |
| endpoint | `GET:/analytics/estudiantes/{estudiante_id}` | admin, profesor | covered | `backend/app/modules/analytics/router.py:142` |
| endpoint | `GET:/analytics/evaluaciones` | admin, profesor | covered | `backend/app/modules/analytics/router.py:62` |
| endpoint | `GET:/analytics/evaluaciones/{evaluacion_id}` | admin, profesor | covered | `backend/app/modules/analytics/router.py:78` |
| endpoint | `GET:/analytics/export/criterios.csv` | admin, profesor | covered | `backend/app/modules/analytics/router.py:173` |
| endpoint | `GET:/analytics/export/estudiantes.csv` | admin, profesor | covered | `backend/app/modules/analytics/router.py:196` |
| endpoint | `GET:/analytics/overview` | admin, profesor | covered | `backend/app/modules/analytics/router.py:46` |
| endpoint | `GET:/analytics/preguntas` | admin, profesor | covered | `backend/app/modules/analytics/router.py:109` |
| endpoint | `GET:/analytics/sintesis` | admin, profesor | covered | `backend/app/modules/analytics/router.py:156` |
| endpoint | `GET:/impacto/cualitativo` | admin | missing | `backend/app/modules/impacto_tesis/router.py:92` |
| endpoint | `GET:/impacto/kappa` | admin, profesor | missing | `backend/app/modules/impacto_tesis/router.py:45` |
| endpoint | `GET:/impacto/likert` | authenticated | missing | `backend/app/modules/impacto_tesis/router.py:84` |
| endpoint | `GET:/impacto/tiempo-ahorrado` | admin, profesor | missing | `backend/app/modules/impacto_tesis/router.py:18` |
| endpoint | `GET:/reportes/estudiante/{estudiante_id}` | authenticated | missing | `backend/app/modules/reportes/router.py:47` |
| endpoint | `GET:/reportes/materia/{materia_id}` | admin, profesor | missing | `backend/app/modules/reportes/router.py:18` |
| endpoint | `GET:/reportes/profesor/resumen` | admin, profesor | covered | `backend/app/modules/reportes/router.py:79` |
| endpoint | `POST:/analytics/evento` | authenticated | covered | `backend/app/modules/analytics/router.py:27` |
| endpoint | `POST:/impacto/encuestas` | authenticated | missing | `backend/app/modules/impacto_tesis/router.py:73` |
| endpoint | `POST:/reportes/export/pdf` | admin, profesor | missing | `backend/app/modules/reportes/router.py:104` |
| frontend_route | `/app/analytics` | admin, profesor | covered | `frontend/src/config/routes.ts:54` |
| frontend_route | `/app/reportes` | admin, profesor | covered | `frontend/src/config/routes.ts:52` |
| frontend_call | `GET:/analytics/ai-quality/concordancia` | admin, profesor | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:341` |
| frontend_call | `GET:/analytics/ai-quality/confidence` | admin, profesor | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:465` |
| frontend_call | `GET:/analytics/ai-quality/costs/provider-comparison` | admin, profesor | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:536` |
| frontend_call | `GET:/analytics/ai-quality/costs` | admin, profesor | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:532` |
| frontend_call | `GET:/analytics/ai-quality/errors` | admin, profesor | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:500` |
| frontend_call | `GET:/analytics/ai-quality/latency` | admin, profesor | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:464` |
| frontend_call | `GET:/analytics/criterios` | admin, profesor | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:162` |
| frontend_call | `GET:/analytics/estudiantes/{selected}` | admin, profesor | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:398` |
| frontend_call | `GET:/analytics/estudiantes` | admin, profesor | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:389` |
| frontend_call | `GET:/analytics/evaluaciones` | admin, profesor | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:124` |
| frontend_call | `GET:/analytics/overview` | admin, profesor | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:123` |
| frontend_call | `GET:/analytics/preguntas` | admin, profesor | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:163` |
| frontend_call | `GET:/analytics/sintesis` | admin, profesor | covered | `frontend/src/modules/analytics/AnalyticsPage.tsx:164` |
| frontend_call | `GET:/reportes/profesor/resumen` | admin, profesor | covered | `frontend/src/modules/reportes/api.ts:5` |
| frontend_call | `POST:/analytics/evento` | admin, profesor | missing | `frontend/src/lib/analytics.ts:20` |
| table | `analytics_eventos` | system | covered | `backend/app/modules/analytics/models.py:14` |

## Hallazgos

- **low · missing_coverage**: 9 superficies de 011-reportes-analitica-impacto no tienen evidencia de prueba observable.
- **medium · authorization_mismatch**: Permisos observables distintos para POST:/analytics/evento: backend=['authenticated'], frontend=['admin', 'profesor'].
