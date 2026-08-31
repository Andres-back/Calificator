# Inventario técnico: 006-recursos-actividades

> Archivo generado por `python scripts/build_system_inventory.py --write`. No editar manualmente.

**Superficies propietarias:** 48

| Tipo | Firma | Actores | Cobertura | Fuente |
|---|---|---|---|---|
| endpoint | `DELETE:/herramientas/{material_id}` | authenticated | covered | `backend/app/modules/herramientas/router.py:248` |
| endpoint | `GET:/herramientas` | authenticated | covered | `backend/app/modules/herramientas/router.py:42` |
| endpoint | `GET:/herramientas/materias/{materia_id}/recursos` | admin, estudiante, profesor | covered | `backend/app/modules/herramientas/router.py:226` |
| endpoint | `GET:/herramientas/{material_id}` | admin, estudiante, profesor | covered | `backend/app/modules/herramientas/router.py:235` |
| endpoint | `GET:/herramientas/{material_id}/evaluaciones` | authenticated | covered | `backend/app/modules/herramientas/router.py:356` |
| endpoint | `GET:/herramientas/{material_id}/pdf` | authenticated | covered | `backend/app/modules/herramientas/router.py:261` |
| endpoint | `GET:/xali/evaluaciones/{evaluacion_id}/recursos` | estudiante | covered | `backend/app/modules/xali/router.py:91` |
| endpoint | `PATCH:/herramientas/{material_id}` | authenticated | covered | `backend/app/modules/herramientas/router.py:293` |
| endpoint | `PATCH:/herramientas/{material_id}/visibilidad` | authenticated | covered | `backend/app/modules/herramientas/router.py:333` |
| endpoint | `POST:/herramientas/crucigrama` | authenticated | covered | `backend/app/modules/herramientas/router.py:66` |
| endpoint | `POST:/herramientas/cuento` | authenticated | covered | `backend/app/modules/herramientas/router.py:96` |
| endpoint | `POST:/herramientas/emparejar` | authenticated | covered | `backend/app/modules/herramientas/router.py:86` |
| endpoint | `POST:/herramientas/examen` | authenticated | covered | `backend/app/modules/herramientas/router.py:146` |
| endpoint | `POST:/herramientas/examen-from-chat` | authenticated | covered | `backend/app/modules/herramientas/router.py:136` |
| endpoint | `POST:/herramientas/ficha` | authenticated | covered | `backend/app/modules/herramientas/router.py:166` |
| endpoint | `POST:/herramientas/flashcards` | authenticated | covered | `backend/app/modules/herramientas/router.py:206` |
| endpoint | `POST:/herramientas/guia` | authenticated | covered | `backend/app/modules/herramientas/router.py:116` |
| endpoint | `POST:/herramientas/lectura-comprensiva` | authenticated | covered | `backend/app/modules/herramientas/router.py:186` |
| endpoint | `POST:/herramientas/mapa-conceptual` | authenticated | covered | `backend/app/modules/herramientas/router.py:196` |
| endpoint | `POST:/herramientas/para-colorear` | authenticated | covered | `backend/app/modules/herramientas/router.py:106` |
| endpoint | `POST:/herramientas/plan-refuerzo` | authenticated | covered | `backend/app/modules/herramientas/router.py:216` |
| endpoint | `POST:/herramientas/quiz-rapido` | authenticated | covered | `backend/app/modules/herramientas/router.py:176` |
| endpoint | `POST:/herramientas/rubrica` | authenticated | covered | `backend/app/modules/herramientas/router.py:156` |
| endpoint | `POST:/herramientas/sopa-letras` | authenticated | covered | `backend/app/modules/herramientas/router.py:56` |
| endpoint | `POST:/herramientas/taller` | authenticated | covered | `backend/app/modules/herramientas/router.py:126` |
| endpoint | `POST:/herramientas/unir-columnas` | authenticated | covered | `backend/app/modules/herramientas/router.py:76` |
| endpoint | `POST:/herramientas/{material_id}/asignar-apoyo` | authenticated | covered | `backend/app/modules/herramientas/router.py:311` |
| endpoint | `POST:/herramientas/{material_id}/convertir-evaluacion` | authenticated | covered | `backend/app/modules/herramientas/router.py:366` |
| endpoint | `POST:/herramientas/{material_id}/duplicar` | authenticated | covered | `backend/app/modules/herramientas/router.py:345` |
| endpoint | `POST:/herramientas/{material_id}/retirar-apoyo` | authenticated | covered | `backend/app/modules/herramientas/router.py:324` |
| endpoint | `POST:/xali/evaluaciones/{evaluacion_id}/recursos` | estudiante | covered | `backend/app/modules/xali/router.py:71` |
| frontend_route | `/app/herramientas` | admin, profesor | covered | `frontend/src/config/routes.ts:47` |
| frontend_route | `/app/herramientas/{id}` | admin, profesor | covered | `frontend/src/config/routes.ts:50` |
| frontend_route | `/app/materias/{id}/recursos` | authenticated | covered | `frontend/src/config/routes.ts:29` |
| frontend_route | `/app/recursos/{id}` | estudiante | covered | `frontend/src/config/routes.ts:51` |
| frontend_call | `DELETE:/herramientas/{id}` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:27` |
| frontend_call | `GET:/herramientas/materias/{materiaId}/recursos` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:12` |
| frontend_call | `GET:/herramientas/{id}/evaluaciones` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:81` |
| frontend_call | `GET:/herramientas/{id}` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:17` |
| frontend_call | `GET:/xali/evaluaciones/{evaluacionId}/recursos` | ambiguous | covered | `frontend/src/modules/xali/api.ts:25` |
| frontend_call | `PATCH:/herramientas/{id}/visibilidad` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:51` |
| frontend_call | `PATCH:/herramientas/{id}` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:36` |
| frontend_call | `POST:/herramientas/{endpoint}` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:22` |
| frontend_call | `POST:/herramientas/{id}/asignar-apoyo` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:41` |
| frontend_call | `POST:/herramientas/{id}/convertir-evaluacion` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:76` |
| frontend_call | `POST:/herramientas/{id}/duplicar` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:56` |
| frontend_call | `POST:/herramientas/{id}/retirar-apoyo` | admin, profesor | covered | `frontend/src/modules/herramientas/api.ts:46` |
| frontend_call | `POST:/xali/evaluaciones/{evaluacionId}/recursos` | ambiguous | covered | `frontend/src/modules/xali/api.ts:21` |

## Decisiones explícitas de permiso

- `backend:GET:/herramientas/materias/{materia_id}/recursos` — El servicio valida gestión docente o matrícula activa y filtra recursos publicados para estudiantes. ([issue](https://github.com/Andres-back/Calificator/issues/17)). Evidencia: `backend/tests/unit/test_authorization_contracts.py`.
- `backend:GET:/herramientas/{material_id}` — El servicio limita profesor y administrador por autor, y estudiante por publicación, asignación y matrícula. ([issue](https://github.com/Andres-back/Calificator/issues/17)). Evidencia: `backend/tests/unit/test_authorization_contracts.py`.

## Hallazgos

- **medium · authorization_mismatch**: Permisos observables distintos para POST:/herramientas/{}/convertir-evaluacion: backend=['authenticated'], frontend=['admin', 'profesor'].
- **medium · authorization_mismatch**: Permisos observables distintos para POST:/herramientas/{}/retirar-apoyo: backend=['authenticated'], frontend=['admin', 'profesor'].
- **medium · authorization_mismatch**: Permisos observables distintos para POST:/herramientas/{}/asignar-apoyo: backend=['authenticated'], frontend=['admin', 'profesor'].
- **medium · authorization_mismatch**: Permisos observables distintos para PATCH:/herramientas/{}: backend=['authenticated'], frontend=['admin', 'profesor'].
- **medium · authorization_mismatch**: Permisos observables distintos para DELETE:/herramientas/{}: backend=['authenticated'], frontend=['admin', 'profesor'].
- **medium · authorization_mismatch**: Permisos observables distintos para GET:/herramientas/{}/evaluaciones: backend=['authenticated'], frontend=['admin', 'profesor'].
- **medium · authorization_mismatch**: Permisos observables distintos para PATCH:/herramientas/{}/visibilidad: backend=['authenticated'], frontend=['admin', 'profesor'].
- **medium · authorization_mismatch**: Permisos observables distintos para POST:/herramientas/{}/duplicar: backend=['authenticated'], frontend=['admin', 'profesor'].
