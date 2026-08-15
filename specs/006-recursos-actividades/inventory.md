# Inventario técnico: 006-recursos-actividades

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 46

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `DELETE:/herramientas/{material_id}` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:246` |
| endpoint | `GET:/herramientas` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:42` |
| endpoint | `GET:/herramientas/materias/{materia_id}/recursos` | admin, estudiante, profesor | covered | `backend/app/modules/herramientas/router.py:226` |
| endpoint | `GET:/herramientas/{material_id}` | admin, estudiante, profesor | covered | `backend/app/modules/herramientas/router.py:234` |
| endpoint | `GET:/herramientas/{material_id}/evaluaciones` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:341` |
| endpoint | `GET:/herramientas/{material_id}/pdf` | authenticated | covered | `backend/app/modules/herramientas/router.py:259` |
| endpoint | `GET:/xali/evaluaciones/{evaluacion_id}/recursos` | estudiante | covered | `backend/app/modules/xali/router.py:87` |
| endpoint | `PATCH:/herramientas/{material_id}` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:290` |
| endpoint | `POST:/herramientas/crucigrama` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:66` |
| endpoint | `POST:/herramientas/cuento` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:96` |
| endpoint | `POST:/herramientas/emparejar` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:86` |
| endpoint | `POST:/herramientas/examen` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:146` |
| endpoint | `POST:/herramientas/examen-from-chat` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:136` |
| endpoint | `POST:/herramientas/ficha` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:166` |
| endpoint | `POST:/herramientas/flashcards` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:206` |
| endpoint | `POST:/herramientas/guia` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:116` |
| endpoint | `POST:/herramientas/lectura-comprensiva` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:186` |
| endpoint | `POST:/herramientas/mapa-conceptual` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:196` |
| endpoint | `POST:/herramientas/para-colorear` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:106` |
| endpoint | `POST:/herramientas/plan-refuerzo` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:216` |
| endpoint | `POST:/herramientas/quiz-rapido` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:176` |
| endpoint | `POST:/herramientas/rubrica` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:156` |
| endpoint | `POST:/herramientas/sopa-letras` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:56` |
| endpoint | `POST:/herramientas/taller` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:126` |
| endpoint | `POST:/herramientas/unir-columnas` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:76` |
| endpoint | `POST:/herramientas/{material_id}/asignar-apoyo` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:308` |
| endpoint | `POST:/herramientas/{material_id}/convertir-evaluacion` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:351` |
| endpoint | `POST:/herramientas/{material_id}/duplicar` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:330` |
| endpoint | `POST:/herramientas/{material_id}/retirar-apoyo` | admin, profesor | covered | `backend/app/modules/herramientas/router.py:321` |
| endpoint | `POST:/xali/evaluaciones/{evaluacion_id}/recursos` | estudiante | covered | `backend/app/modules/xali/router.py:68` |
| frontend_route | `/app/herramientas` | admin | covered | `frontend/src/config/routes.ts:43` |
| frontend_route | `/app/herramientas/{id}` | admin | covered | `frontend/src/config/routes.ts:46` |
| frontend_route | `/app/materias/{id}/recursos` | admin, profesor | covered | `frontend/src/config/routes.ts:25` |
| frontend_route | `/app/recursos/{id}` | estudiante | covered | `frontend/src/config/routes.ts:47` |
| frontend_call | `DELETE:/herramientas/{id}` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:27` |
| frontend_call | `GET:/herramientas/materias/{materiaId}/recursos` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:12` |
| frontend_call | `GET:/herramientas/{id}/evaluaciones` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:76` |
| frontend_call | `GET:/herramientas/{id}` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:17` |
| frontend_call | `GET:/xali/evaluaciones/{evaluacionId}/recursos` | ambiguous | covered | `frontend/src/modules/xali/api.ts:25` |
| frontend_call | `PATCH:/herramientas/{id}` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:36` |
| frontend_call | `POST:/herramientas/{endpoint}` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:22` |
| frontend_call | `POST:/herramientas/{id}/asignar-apoyo` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:41` |
| frontend_call | `POST:/herramientas/{id}/convertir-evaluacion` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:71` |
| frontend_call | `POST:/herramientas/{id}/duplicar` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:51` |
| frontend_call | `POST:/herramientas/{id}/retirar-apoyo` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:46` |
| frontend_call | `POST:/xali/evaluaciones/{evaluacionId}/recursos` | ambiguous | covered | `frontend/src/modules/xali/api.ts:21` |

## Decisiones explícitas de permiso

- `backend:GET:/herramientas/materias/{materia_id}/recursos` — El servicio valida gestión docente o matrícula activa y filtra recursos publicados para estudiantes. ([issue](https://github.com/Andres-back/Calificator/issues/17)). Evidencia: `backend/tests/unit/test_authorization_contracts.py`.
- `backend:GET:/herramientas/{material_id}` — El servicio limita profesor y administrador por autor, y estudiante por publicación, asignación y matrícula. ([issue](https://github.com/Andres-back/Calificator/issues/17)). Evidencia: `backend/tests/unit/test_authorization_contracts.py`.

## Hallazgos

Sin hallazgos específicos del dominio.
