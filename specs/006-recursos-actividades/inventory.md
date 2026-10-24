# Inventario técnico: 006-recursos-actividades

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 55

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `DELETE:/herramientas/{material_id}` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:259` |
| endpoint | `GET:/biblioteca-motivos` | admin, profesor | covered | `backend/app/modules/motif_library/router.py:33` |
| endpoint | `GET:/biblioteca-motivos/archivos/{motif_id}/{variant}/{digest}` | public | covered | `backend/app/modules/motif_library/router.py:47` |
| endpoint | `GET:/biblioteca-motivos/colecciones` | admin, profesor | covered | `backend/app/modules/motif_library/router.py:28` |
| endpoint | `GET:/herramientas` | admin, estudiante, profesor | covered | `backend/app/modules/herramientas/router.py:53` |
| endpoint | `GET:/herramientas/catalogo` | admin, estudiante, profesor | covered | `backend/app/modules/herramientas/router.py:42` |
| endpoint | `GET:/herramientas/materias/{materia_id}/recursos` | admin, estudiante, profesor | covered | `backend/app/modules/herramientas/router.py:237` |
| endpoint | `GET:/herramientas/{material_id}` | admin, estudiante, profesor | covered | `backend/app/modules/herramientas/router.py:246` |
| endpoint | `GET:/herramientas/{material_id}/evaluaciones` | admin, estudiante, profesor | covered | `backend/app/modules/herramientas/router.py:367` |
| endpoint | `GET:/herramientas/{material_id}/pdf` | admin, estudiante, profesor | covered | `backend/app/modules/herramientas/router.py:272` |
| endpoint | `GET:/xali/evaluaciones/{evaluacion_id}/recursos` | admin, estudiante, profesor | covered | `backend/app/modules/xali/router.py:95` |
| endpoint | `PATCH:/herramientas/{material_id}` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:304` |
| endpoint | `PATCH:/herramientas/{material_id}/visibilidad` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:344` |
| endpoint | `POST:/herramientas/crucigrama` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:77` |
| endpoint | `POST:/herramientas/cuento` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:107` |
| endpoint | `POST:/herramientas/emparejar` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:97` |
| endpoint | `POST:/herramientas/examen` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:157` |
| endpoint | `POST:/herramientas/examen-from-chat` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:147` |
| endpoint | `POST:/herramientas/ficha` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:177` |
| endpoint | `POST:/herramientas/flashcards` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:217` |
| endpoint | `POST:/herramientas/guia` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:127` |
| endpoint | `POST:/herramientas/lectura-comprensiva` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:197` |
| endpoint | `POST:/herramientas/mapa-conceptual` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:207` |
| endpoint | `POST:/herramientas/para-colorear` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:117` |
| endpoint | `POST:/herramientas/plan-refuerzo` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:227` |
| endpoint | `POST:/herramientas/quiz-rapido` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:187` |
| endpoint | `POST:/herramientas/rubrica` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:167` |
| endpoint | `POST:/herramientas/sopa-letras` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:67` |
| endpoint | `POST:/herramientas/taller` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:137` |
| endpoint | `POST:/herramientas/unir-columnas` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:87` |
| endpoint | `POST:/herramientas/{material_id}/asignar-apoyo` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:322` |
| endpoint | `POST:/herramientas/{material_id}/convertir-evaluacion` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:377` |
| endpoint | `POST:/herramientas/{material_id}/duplicar` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:356` |
| endpoint | `POST:/herramientas/{material_id}/retirar-apoyo` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:335` |
| endpoint | `POST:/xali/evaluaciones/{evaluacion_id}/recursos` | admin, estudiante, profesor | covered | `backend/app/modules/xali/router.py:75` |
| frontend_route | `/app/herramientas` | admin, profesor | covered | `frontend/src/config/routes.ts:54` |
| frontend_route | `/app/herramientas/{id}` | admin, profesor | covered | `frontend/src/config/routes.ts:57` |
| frontend_route | `/app/materias/{id}/recursos` | authenticated | covered | `frontend/src/modules/materias/MateriaRecursos.tsx:67` |
| frontend_route | `/app/recursos/{id}` | estudiante | covered | `frontend/src/config/routes.ts:58` |
| frontend_call | `DELETE:/herramientas/{id}` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:45` |
| frontend_call | `GET:/biblioteca-motivos/colecciones` | admin, profesor | covered | `frontend/src/modules/motif_library/api.ts:6` |
| frontend_call | `GET:/biblioteca-motivos` | admin, profesor | covered | `frontend/src/modules/motif_library/api.ts:10` |
| frontend_call | `GET:/herramientas/catalogo` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:19` |
| frontend_call | `GET:/herramientas/materias/{materiaId}/recursos` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:30` |
| frontend_call | `GET:/herramientas/{id}/evaluaciones` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:99` |
| frontend_call | `GET:/herramientas/{id}` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:35` |
| frontend_call | `GET:/xali/evaluaciones/{evaluacionId}/recursos` | ambiguous | covered | `frontend/src/modules/xali/api.ts:25` |
| frontend_call | `PATCH:/herramientas/{id}/visibilidad` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:69` |
| frontend_call | `PATCH:/herramientas/{id}` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:54` |
| frontend_call | `POST:/herramientas/{endpoint}` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:40` |
| frontend_call | `POST:/herramientas/{id}/asignar-apoyo` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:59` |
| frontend_call | `POST:/herramientas/{id}/convertir-evaluacion` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:94` |
| frontend_call | `POST:/herramientas/{id}/duplicar` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:74` |
| frontend_call | `POST:/herramientas/{id}/retirar-apoyo` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:64` |
| frontend_call | `POST:/xali/evaluaciones/{evaluacionId}/recursos` | ambiguous | covered | `frontend/src/modules/xali/api.ts:21` |

## Decisiones explícitas de permiso

- `backend:GET:/biblioteca-motivos` — El catálogo de selección exige sesión y rol docente o administrador; estudiantes y anónimos están denegados. ([issue](https://github.com/Andres-back/Calificator/issues/259)). Evidencia: `backend/tests/integration/test_motif_library_permissions.py`, `frontend/e2e/motif-editors.spec.ts`.
- `backend:GET:/biblioteca-motivos/archivos/{motif_id}/{variant}/{digest}` — Arte estático curado público por diseño; ID, variante, digest, raíz interna e integridad son comprobados. No sirve imágenes privadas. ([issue](https://github.com/Andres-back/Calificator/issues/259)). Evidencia: `backend/tests/integration/test_motif_library_permissions.py`, `frontend/e2e/motif-editors.spec.ts`.
- `backend:GET:/biblioteca-motivos/colecciones` — La dependencia de selección valida explícitamente roles docentes; no contiene documentos o datos de alumnos. ([issue](https://github.com/Andres-back/Calificator/issues/259)). Evidencia: `backend/tests/integration/test_motif_library_permissions.py`, `frontend/e2e/motif-editors.spec.ts`.
- `backend:GET:/herramientas/materias/{materia_id}/recursos` — El servicio valida gestión docente o matrícula activa y filtra recursos publicados para estudiantes. ([issue](https://github.com/Andres-back/Calificator/issues/17)). Evidencia: `backend/tests/unit/test_authorization_contracts.py`.
- `backend:GET:/herramientas/{material_id}` — El servicio limita profesor y administrador por autor, y estudiante por publicación, asignación y matrícula. ([issue](https://github.com/Andres-back/Calificator/issues/17)). Evidencia: `backend/tests/unit/test_authorization_contracts.py`.
- `frontend_call:GET:/biblioteca-motivos/colecciones:frontend/src/modules/motif_library/api.ts` — Consulta de colecciones desde contextos de edición docente; el backend vuelve a validar el rol. ([issue](https://github.com/Andres-back/Calificator/issues/259)). Evidencia: `backend/tests/integration/test_motif_library_permissions.py`, `frontend/e2e/motif-editors.spec.ts`.
- `frontend_call:GET:/biblioteca-motivos:frontend/src/modules/motif_library/api.ts` — Selector compartido de los tres editores docentes; las imágenes estáticas públicas se sirven por ruta separada. ([issue](https://github.com/Andres-back/Calificator/issues/259)). Evidencia: `backend/tests/integration/test_motif_library_permissions.py`, `frontend/e2e/motif-editors.spec.ts`.

## Hallazgos

Sin hallazgos específicos del dominio.
