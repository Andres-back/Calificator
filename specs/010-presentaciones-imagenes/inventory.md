# Inventario técnico: 010-presentaciones-imagenes

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 21

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `DELETE:/presentaciones/{presentacion_id}` | admin, profesor | covered | `backend/app/modules/presentaciones/router.py:167` |
| endpoint | `GET:/imagenes-generadas` | admin, profesor | missing | `backend/app/modules/imagenes/router.py:67` |
| endpoint | `GET:/presentaciones` | authenticated | covered | `backend/app/modules/presentaciones/router.py:46` |
| endpoint | `GET:/presentaciones/assets/{asset_id}` | authenticated | covered | `backend/app/modules/presentaciones/router.py:54` |
| endpoint | `GET:/presentaciones/{presentacion_id}` | authenticated | covered | `backend/app/modules/presentaciones/router.py:72` |
| endpoint | `GET:/presentaciones/{presentacion_id}/estado` | authenticated | covered | `backend/app/modules/presentaciones/router.py:81` |
| endpoint | `GET:/presentaciones/{presentacion_id}/preview` | authenticated | covered | `backend/app/modules/presentaciones/router.py:91` |
| endpoint | `GET:/presentaciones/{presentacion_id}/preview/{slide_number}.png` | authenticated | covered | `backend/app/modules/presentaciones/router.py:101` |
| endpoint | `PATCH:/imagenes-generadas/{imagen_id}` | admin, profesor | missing | `backend/app/modules/imagenes/router.py:108` |
| endpoint | `POST:/imagenes/generar` | admin, profesor | missing | `backend/app/modules/imagenes/router.py:27` |
| endpoint | `POST:/presentaciones` | admin, profesor | covered | `backend/app/modules/presentaciones/router.py:31` |
| endpoint | `POST:/presentaciones/{presentacion_id}/exportar` | admin, profesor | covered | `backend/app/modules/presentaciones/router.py:120` |
| frontend_route | `/app/presentaciones` | admin, profesor | covered | `frontend/src/config/routes.ts:51` |
| frontend_call | `DELETE:/presentaciones/{id}` | admin, profesor | covered | `frontend/src/modules/presentaciones/api.ts:60` |
| frontend_call | `GET:/presentaciones/{id}/estado` | admin, profesor | covered | `frontend/src/modules/presentaciones/api.ts:28` |
| frontend_call | `GET:/presentaciones/{id}/preview` | admin, profesor | covered | `frontend/src/modules/presentaciones/api.ts:56` |
| frontend_call | `GET:/presentaciones` | admin, profesor | covered | `frontend/src/modules/presentaciones/api.ts:20` |
| frontend_call | `POST:/presentaciones/{id}/exportar` | admin, profesor | covered | `frontend/src/modules/presentaciones/api.ts:33` |
| frontend_call | `POST:/presentaciones` | admin, profesor | covered | `frontend/src/modules/presentaciones/api.ts:24` |
| table | `imagenes_generadas` | system | missing | `backend/app/modules/imagenes/models.py:14` |
| table | `presentaciones` | system | covered | `backend/app/modules/presentaciones/models.py:14` |

## Hallazgos

- **medium · authorization_mismatch**: Permisos observables distintos para GET:/presentaciones/{}/preview: backend=['authenticated'], frontend=['admin', 'profesor'].
- **medium · authorization_mismatch**: Permisos observables distintos para GET:/presentaciones: backend=['authenticated'], frontend=['admin', 'profesor'].
- **medium · authorization_mismatch**: Permisos observables distintos para GET:/presentaciones/{}/estado: backend=['authenticated'], frontend=['admin', 'profesor'].
- **low · missing_coverage**: 4 superficies de 010-presentaciones-imagenes no tienen evidencia de prueba observable.
