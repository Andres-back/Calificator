# Inventario técnico: 007-entregas-estudiante

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 7

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `GET:/calificaciones/entregas/{entrega_id}/evidencia` | authenticated | covered | `backend/app/modules/calificaciones/router.py:1423` |
| endpoint | `GET:/presentaciones/{presentacion_id}/archivo/{fmt}` | authenticated | covered | `backend/app/modules/presentaciones/router.py:139` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/entregas` | authenticated | covered | `backend/app/modules/calificaciones/router.py:1194` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/entregas/archivo` | authenticated | covered | `backend/app/modules/calificaciones/router.py:1289` |
| frontend_route | `/app/evaluaciones/{id}/resolver` | estudiante | covered | `frontend/src/config/routes.ts:37` |
| frontend_call | `POST:/evaluaciones/{evaluacionId}/entregas/archivo` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:147` |
| frontend_call | `POST:/evaluaciones/{evaluacionId}/entregas` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:104` |

## Decisiones explícitas de permiso

Sin decisiones explícitas de permiso para este dominio.

## Hallazgos

Sin hallazgos específicos del dominio.
