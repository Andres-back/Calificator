# Inventario técnico: 010-presentaciones-imagenes

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 21

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `DELETE:/presentaciones/{presentacion_id}` | admin, profesor | covered | `backend/app/modules/presentaciones/router.py:167` |
| endpoint | `GET:/imagenes-generadas` | admin, profesor | missing | `backend/app/modules/imagenes/router.py:73` |
| endpoint | `GET:/presentaciones` | admin, estudiante, profesor | covered | `backend/app/modules/presentaciones/router.py:46` |
| endpoint | `GET:/presentaciones/assets/{asset_id}` | authenticated | covered | `backend/app/modules/presentaciones/router.py:54` |
| endpoint | `GET:/presentaciones/{presentacion_id}` | authenticated | covered | `backend/app/modules/presentaciones/router.py:72` |
| endpoint | `GET:/presentaciones/{presentacion_id}/estado` | admin, estudiante, profesor | covered | `backend/app/modules/presentaciones/router.py:81` |
| endpoint | `GET:/presentaciones/{presentacion_id}/preview` | admin, estudiante, profesor | covered | `backend/app/modules/presentaciones/router.py:91` |
| endpoint | `GET:/presentaciones/{presentacion_id}/preview/{slide_number}.png` | authenticated | covered | `backend/app/modules/presentaciones/router.py:101` |
| endpoint | `PATCH:/imagenes-generadas/{imagen_id}` | admin, profesor | missing | `backend/app/modules/imagenes/router.py:114` |
| endpoint | `POST:/imagenes/generar` | admin, profesor | missing | `backend/app/modules/imagenes/router.py:27` |
| endpoint | `POST:/presentaciones` | admin, profesor | covered | `backend/app/modules/presentaciones/router.py:31` |
| endpoint | `POST:/presentaciones/{presentacion_id}/exportar` | admin, profesor | covered | `backend/app/modules/presentaciones/router.py:120` |
| frontend_route | `/app/presentaciones` | admin, profesor | covered | `frontend/src/config/routes.ts:55` |
| frontend_call | `DELETE:/presentaciones/{id}` | admin, profesor | covered | `frontend/src/modules/presentaciones/api.ts:60` |
| frontend_call | `GET:/presentaciones/{id}/estado` | admin, profesor | covered | `frontend/src/modules/presentaciones/api.ts:28` |
| frontend_call | `GET:/presentaciones/{id}/preview` | admin, profesor | covered | `frontend/src/modules/presentaciones/api.ts:56` |
| frontend_call | `GET:/presentaciones` | admin, profesor | covered | `frontend/src/modules/presentaciones/api.ts:20` |
| frontend_call | `POST:/presentaciones/{id}/exportar` | admin, profesor | covered | `frontend/src/modules/presentaciones/api.ts:33` |
| frontend_call | `POST:/presentaciones` | admin, profesor | covered | `frontend/src/modules/presentaciones/api.ts:24` |
| table | `imagenes_generadas` | system | missing | `backend/app/modules/imagenes/models.py:14` |
| table | `presentaciones` | system | covered | `backend/app/modules/presentaciones/models.py:14` |

## Decisiones explícitas de permiso

- `backend:GET:/presentaciones` — El servicio lista todo para admin, solo propias para profesor y solo publicadas de matrículas activas para estudiante. ([issue](https://github.com/Andres-back/Calificator/issues/17)). Evidencia: `backend/tests/unit/test_presentaciones_router.py`.
- `backend:GET:/presentaciones/{presentacion_id}/estado` — La ruta exige ensure_can_read_presentacion antes de construir el estado. ([issue](https://github.com/Andres-back/Calificator/issues/17)). Evidencia: `backend/tests/unit/test_presentaciones_router.py`.
- `backend:GET:/presentaciones/{presentacion_id}/preview` — La ruta exige ensure_can_read_presentacion antes de construir la vista previa. ([issue](https://github.com/Andres-back/Calificator/issues/17)). Evidencia: `backend/tests/unit/test_presentaciones_router.py`.

## Hallazgos

- **low · missing_coverage**: 4 superficies de 010-presentaciones-imagenes no tienen evidencia de prueba observable.
