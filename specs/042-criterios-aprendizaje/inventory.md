# Inventario técnico: 042-criterios-aprendizaje

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 35

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `DELETE:/criterios-aprendizaje/fuentes/{source_id}` | authenticated | covered | `backend/app/modules/criterios_aprendizaje/router.py:270` |
| endpoint | `GET:/criterios-aprendizaje/capacidades` | authenticated | covered | `backend/app/modules/criterios_aprendizaje/router.py:58` |
| endpoint | `GET:/criterios-aprendizaje/fuentes/{source_id}` | authenticated | covered | `backend/app/modules/criterios_aprendizaje/router.py:250` |
| endpoint | `GET:/criterios-aprendizaje/{set_id}` | authenticated | covered | `backend/app/modules/criterios_aprendizaje/router.py:109` |
| endpoint | `GET:/materias/{materia_id}/criterios-aprendizaje` | authenticated | covered | `backend/app/modules/criterios_aprendizaje/router.py:69` |
| endpoint | `PATCH:/criterios-aprendizaje/versiones/{version_id}` | authenticated | covered | `backend/app/modules/criterios_aprendizaje/router.py:121` |
| endpoint | `POST:/criterios-aprendizaje/versiones/{version_id}/aplicar` | authenticated | covered | `backend/app/modules/criterios_aprendizaje/router.py:310` |
| endpoint | `POST:/criterios-aprendizaje/versiones/{version_id}/aprobar` | authenticated | covered | `backend/app/modules/criterios_aprendizaje/router.py:136` |
| endpoint | `POST:/criterios-aprendizaje/versiones/{version_id}/fuentes/archivo` | authenticated | covered | `backend/app/modules/criterios_aprendizaje/router.py:192` |
| endpoint | `POST:/criterios-aprendizaje/versiones/{version_id}/fuentes/referencia` | authenticated | missing | `backend/app/modules/criterios_aprendizaje/router.py:233` |
| endpoint | `POST:/criterios-aprendizaje/versiones/{version_id}/fuentes/texto` | authenticated | covered | `backend/app/modules/criterios_aprendizaje/router.py:216` |
| endpoint | `POST:/criterios-aprendizaje/versiones/{version_id}/proponer` | authenticated | covered | `backend/app/modules/criterios_aprendizaje/router.py:284` |
| endpoint | `POST:/criterios-aprendizaje/{set_id}/archivar` | authenticated | covered | `backend/app/modules/criterios_aprendizaje/router.py:178` |
| endpoint | `POST:/criterios-aprendizaje/{set_id}/versiones` | authenticated | missing | `backend/app/modules/criterios_aprendizaje/router.py:157` |
| endpoint | `POST:/materias/{materia_id}/criterios-aprendizaje` | authenticated | covered | `backend/app/modules/criterios_aprendizaje/router.py:86` |
| frontend_route | `/app/materias/{id}/criterios` | authenticated | covered | `frontend/src/config/routes.ts:40` |
| frontend_call | `GET:/criterios-aprendizaje/capacidades` | ambiguous | covered | `frontend/src/modules/materias/criterios/api.ts:32` |
| frontend_call | `GET:/criterios-aprendizaje/{setId}` | ambiguous | covered | `frontend/src/modules/materias/criterios/api.ts:42` |
| frontend_call | `GET:/materias/{materiaId}/criterios-aprendizaje` | ambiguous | missing | `frontend/src/modules/materias/criterios/api.ts:37` |
| frontend_call | `PATCH:/criterios-aprendizaje/versiones/{versionId}` | ambiguous | covered | `frontend/src/modules/materias/criterios/api.ts:68` |
| frontend_call | `POST:/criterios-aprendizaje/versiones/{versionId}/aprobar` | ambiguous | missing | `frontend/src/modules/materias/criterios/api.ts:126` |
| frontend_call | `POST:/criterios-aprendizaje/versiones/{versionId}/fuentes/archivo` | ambiguous | missing | `frontend/src/modules/materias/criterios/api.ts:84` |
| frontend_call | `POST:/criterios-aprendizaje/versiones/{versionId}/fuentes/referencia` | ambiguous | missing | `frontend/src/modules/materias/criterios/api.ts:106` |
| frontend_call | `POST:/criterios-aprendizaje/versiones/{versionId}/fuentes/texto` | ambiguous | missing | `frontend/src/modules/materias/criterios/api.ts:95` |
| frontend_call | `POST:/criterios-aprendizaje/{setId}/archivar` | ambiguous | missing | `frontend/src/modules/materias/criterios/api.ts:142` |
| frontend_call | `POST:/criterios-aprendizaje/{setId}/versiones` | ambiguous | missing | `frontend/src/modules/materias/criterios/api.ts:134` |
| frontend_call | `POST:/materias/{materiaId}/criterios-aprendizaje` | ambiguous | missing | `frontend/src/modules/materias/criterios/api.ts:50` |
| job | `tasks.propose_learning_criteria` | system | covered | `backend/app/workers/tasks_learning_criteria.py:134` |
| job | `tasks.recover_stale_learning_criteria_jobs` | system | covered | `backend/app/workers/tasks_learning_criteria.py:175` |
| table | `grading_component_criteria` | system | covered | `backend/app/modules/criterios_aprendizaje/models.py:174` |
| table | `learning_criteria` | system | covered | `backend/app/modules/criterios_aprendizaje/models.py:81` |
| table | `learning_criterion_applications` | system | covered | `backend/app/modules/criterios_aprendizaje/models.py:153` |
| table | `learning_criterion_sets` | system | covered | `backend/app/modules/criterios_aprendizaje/models.py:19` |
| table | `learning_criterion_sources` | system | covered | `backend/app/modules/criterios_aprendizaje/models.py:110` |
| table | `learning_criterion_versions` | system | covered | `backend/app/modules/criterios_aprendizaje/models.py:53` |

## Decisiones explícitas de permiso

Sin decisiones explícitas de permiso para este dominio.

## Hallazgos

- **low · missing_coverage**: 10 superficies de 042-criterios-aprendizaje no tienen evidencia de prueba observable.
