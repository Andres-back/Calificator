# Inventario técnico: 002-arquitectura-roles-seguridad

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 48

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `GET:/admin/mail/config` | ambiguous | covered | `backend/app/modules/admin_mail/router.py:49` |
| endpoint | `GET:/admin/mail/recovery-status` | ambiguous | covered | `backend/app/modules/admin_mail/router.py:139` |
| endpoint | `GET:/devoluciones/disponibilidad` | authenticated | covered | `backend/app/modules/feedback_sharing/router.py:47` |
| endpoint | `GET:/docs` | public | missing | `backend/app/main.py:44` |
| endpoint | `GET:/health` | public | missing | `backend/app/main.py:40` |
| endpoint | `GET:/openapi.json` | public | missing | `backend/app/main.py:56` |
| endpoint | `GET:/public/devolucion` | ambiguous | covered | `backend/app/modules/feedback_sharing/public_router.py:53` |
| endpoint | `GET:/public/devolucion/conversacion` | ambiguous | covered | `backend/app/modules/feedback_sharing/public_router.py:48` |
| endpoint | `GET:/public/devolucion/evidencia/{page}` | ambiguous | covered | `backend/app/modules/feedback_sharing/public_router.py:61` |
| endpoint | `GET:/public/devolucion/preguntas/{request_id}` | ambiguous | covered | `backend/app/modules/feedback_sharing/public_router.py:43` |
| endpoint | `GET:/redoc` | public | missing | `backend/app/main.py:50` |
| endpoint | `POST:/admin/mail/test` | ambiguous | covered | `backend/app/modules/admin_mail/router.py:86` |
| endpoint | `POST:/devoluciones/accesos/{access_id}/desactivar` | authenticated | covered | `backend/app/modules/feedback_sharing/router.py:32` |
| endpoint | `POST:/devoluciones/accesos/{access_id}/reactivar` | authenticated | covered | `backend/app/modules/feedback_sharing/router.py:37` |
| endpoint | `POST:/devoluciones/accesos/{access_id}/renovar` | authenticated | covered | `backend/app/modules/feedback_sharing/router.py:42` |
| endpoint | `POST:/public/devolucion/preguntas` | ambiguous | covered | `backend/app/modules/feedback_sharing/public_router.py:32` |
| endpoint | `PUT:/admin/mail/config` | ambiguous | covered | `backend/app/modules/admin_mail/router.py:58` |
| frontend_route | `/` | public | covered | `frontend/src/config/routes.ts:8` |
| frontend_route | `/app` | authenticated | covered | `frontend/src/config/routes.ts:21` |
| frontend_route | `/app/403` | authenticated | covered | `frontend/src/config/routes.ts:23` |
| frontend_route | `/app/404` | authenticated | covered | `frontend/src/config/routes.ts:24` |
| frontend_route | `/app/admin/correo` | admin | covered | `frontend/src/config/routes.ts:67` |
| frontend_route | `/app/cambiar-clave-inicial` | authenticated | covered | `frontend/src/config/routes.ts:18` |
| frontend_route | `/devolucion` | ambiguous | covered | `frontend/src/router.tsx:59` |
| frontend_route | `/registro` | public | covered | `frontend/src/config/routes.ts:10` |
| frontend_call | `GET:/devoluciones/disponibilidad` | ambiguous | covered | `frontend/src/modules/feedback_sharing/api.ts:40` |
| frontend_call | `POST:/devoluciones/accesos/{id}/{action}` | ambiguous | covered | `frontend/src/modules/feedback_sharing/api.ts:77` |
| integration | `cloudflare` | system | covered | `backend/app/core/config.py:1` |
| integration | `open_code` | system | covered | `backend/app/core/config.py:1` |
| integration | `redis` | system | covered | `backend/app/core/config.py:1` |
| table | `ai_config_audit_logs` | system | missing | `backend/alembic/versions/202606290008_admin_ai_config_providers.py:72` |
| table | `ai_configuration_versions` | system | covered | `backend/alembic/versions/202608250004_ai_configuration_history.py:19` |
| table | `ai_global_config` | system | missing | `backend/alembic/versions/202606290002_phases_3_to_8.py:213` |
| table | `ai_global_limits` | system | missing | `backend/alembic/versions/202606290008_admin_ai_config_providers.py:53` |
| table | `ai_jobs` | system | covered | `backend/alembic/versions/202606290002_phases_3_to_8.py:174` |
| table | `ai_tool_settings` | system | missing | `backend/alembic/versions/202609100001_admin_tool_ai_control.py:36` |
| table | `ai_usage_events` | system | missing | `backend/alembic/versions/202607280002a_create_ai_usage_events.py:22` |
| table | `ai_usage_logs` | system | missing | `backend/alembic/versions/202606290002_phases_3_to_8.py:193` |
| table | `chat_messages` | system | covered | `backend/alembic/versions/202606290002_phases_3_to_8.py:158` |
| table | `evaluation_blueprints` | system | missing | `backend/alembic/versions/202606290001_initial_phase_1_2.py:121` |
| table | `feedback_accesses` | system | covered | `backend/app/modules/feedback_sharing/models.py:58` |
| table | `feedback_chat_quotas` | system | covered | `backend/app/modules/feedback_sharing/models.py:100` |
| table | `feedback_chat_requests` | system | covered | `backend/app/modules/feedback_sharing/models.py:108` |
| table | `feedback_delivery_reviews` | system | covered | `backend/app/modules/feedback_sharing/models.py:14` |
| table | `feedback_publications` | system | covered | `backend/app/modules/feedback_sharing/models.py:33` |
| table | `importacion_estudiantes_filas` | system | missing | `backend/app/modules/importacion_estudiantes/models.py:33` |
| table | `importacion_estudiantes_lotes` | system | missing | `backend/app/modules/importacion_estudiantes/models.py:11` |
| table | `materiales_generados` | system | covered | `backend/alembic/versions/202606290002_phases_3_to_8.py:121` |

## Decisiones explícitas de permiso

Sin decisiones explícitas de permiso para este dominio.

## Hallazgos

- **low · orphan_candidate**: 28 superficies no alcanzables o históricas se conservan como candidatas a retiro.
- **low · missing_coverage**: 13 superficies de 002-arquitectura-roles-seguridad no tienen evidencia de prueba observable.
- **medium · contract_mismatch**: 6 llamadas frontend no tienen endpoint backend canónico coincidente en el análisis estático.
