# Inventario técnico: 009-xali-rag-refuerzos

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 25

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `DELETE:/rag/sources/{source_id}` | admin, profesor | missing | `backend/app/modules/rag/router.py:83` |
| endpoint | `DELETE:/xali/history` | authenticated | covered | `backend/app/modules/xali/router.py:113` |
| endpoint | `GET:/rag/sources` | admin, profesor | missing | `backend/app/modules/rag/router.py:67` |
| endpoint | `GET:/xali/evaluaciones-entregadas` | estudiante | covered | `backend/app/modules/xali/router.py:43` |
| endpoint | `GET:/xali/history` | authenticated | covered | `backend/app/modules/xali/router.py:104` |
| endpoint | `GET:/xali/refuerzos/{refuerzo_id}` | admin, profesor | covered | `backend/app/modules/xali/refuerzo_router.py:39` |
| endpoint | `PATCH:/xali/refuerzos/{refuerzo_id}` | admin, profesor | covered | `backend/app/modules/xali/refuerzo_router.py:53` |
| endpoint | `POST:/rag/ingest` | admin, profesor | missing | `backend/app/modules/rag/router.py:40` |
| endpoint | `POST:/rag/search` | authenticated | missing | `backend/app/modules/rag/router.py:51` |
| endpoint | `POST:/rag/sources` | admin, profesor | missing | `backend/app/modules/rag/router.py:27` |
| endpoint | `POST:/xali/chat` | authenticated | covered | `backend/app/modules/xali/router.py:26` |
| endpoint | `POST:/xali/evaluaciones/{evaluacion_id}/chat` | estudiante | covered | `backend/app/modules/xali/router.py:52` |
| endpoint | `POST:/xali/refuerzos/generar` | admin, profesor | covered | `backend/app/modules/xali/refuerzo_router.py:19` |
| frontend_route | `/app/xali` | admin | covered | `frontend/src/config/routes.ts:50` |
| frontend_call | `DELETE:/xali/history` | ambiguous | covered | `frontend/src/modules/xali/api.ts:29` |
| frontend_call | `GET:/xali/evaluaciones-entregadas` | ambiguous | covered | `frontend/src/modules/xali/api.ts:13` |
| frontend_call | `GET:/xali/history` | ambiguous | covered | `frontend/src/modules/xali/api.ts:5` |
| frontend_call | `PATCH:/xali/refuerzos/{id}` | ambiguous | covered | `frontend/src/modules/analytics/XaliRefuerzoModal.tsx:75` |
| frontend_call | `POST:/xali/chat` | ambiguous | covered | `frontend/src/modules/xali/api.ts:9` |
| frontend_call | `POST:/xali/evaluaciones/{evaluacionId}/chat` | ambiguous | covered | `frontend/src/modules/xali/api.ts:17` |
| frontend_call | `POST:/xali/refuerzos/generar` | ambiguous | covered | `frontend/src/modules/analytics/XaliRefuerzoModal.tsx:53` |
| table | `rag_chunks` | system | covered | `backend/app/modules/rag/models.py:38` |
| table | `rag_sources` | system | missing | `backend/app/modules/rag/models.py:15` |
| table | `xali_refuerzos` | system | covered | `backend/app/modules/xali/refuerzo_models.py:14` |
| table | `xali_student_resources` | system | covered | `backend/app/modules/xali/student_resource_models.py:14` |

## Decisiones explícitas de permiso

Sin decisiones explícitas de permiso para este dominio.

## Hallazgos

- **low · missing_coverage**: 6 superficies de 009-xali-rag-refuerzos no tienen evidencia de prueba observable.
