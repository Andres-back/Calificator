# Inventario técnico: 007-entregas-estudiante

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 8

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `GET:/calificaciones/entregas/{entrega_id}/evidencia` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:1467` |
| endpoint | `GET:/calificaciones/entregas/{entrega_id}/evidencia/paginas/{numero}` | admin, estudiante, profesor | covered | `backend/app/modules/calificaciones/router.py:1524` |
| endpoint | `GET:/presentaciones/{presentacion_id}/archivo/{fmt}` | admin, estudiante, profesor | covered | `backend/app/modules/presentaciones/router.py:157` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/entregas` | admin, estudiante | covered | `backend/app/modules/calificaciones/router.py:1234` |
| endpoint | `POST:/evaluaciones/{evaluacion_id}/entregas/archivo` | admin, estudiante | covered | `backend/app/modules/calificaciones/router.py:1326` |
| frontend_route | `/app/evaluaciones/{id}/resolver` | estudiante | covered | `frontend/src/config/routes.ts:44` |
| frontend_call | `POST:/evaluaciones/{evaluacionId}/entregas/archivo` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:225` |
| frontend_call | `POST:/evaluaciones/{evaluacionId}/entregas` | ambiguous | covered | `frontend/src/modules/evaluaciones/api.ts:150` |

## Decisiones explícitas de permiso

Sin decisiones explícitas de permiso para este dominio.

## Hallazgos

Sin hallazgos específicos del dominio.
