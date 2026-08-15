# Contrato de autorización por superficie

| Superficie | Actores efectivos | Condición adicional | Denegación comprobada |
|------------|--------------------|---------------------|-----------------------|
| `GET /materias/{id}/asistencia` | profesor, admin | profesor gestiona la materia | estudiante y profesor ajeno |
| `PUT /materias/{id}/asistencia` | profesor, admin | profesor gestiona la materia | estudiante y profesor ajeno; sin escritura |
| `GET /materias/{id}/dba` | profesor, estudiante, admin | profesor gestiona o estudiante tiene matrícula activa | estudiante no matriculado y profesor ajeno |
| `GET /herramientas/materias/{id}/recursos` | profesor, estudiante, admin | gestión docente o matrícula activa; estudiante solo publicados | no matriculado, no publicado, profesor ajeno |
| `GET /herramientas/{id}` | profesor, estudiante, admin | autor docente o asignación visible y matrícula activa | objeto ajeno/no asignado; soluciones ocultas |
| `GET /presentaciones` | profesor, estudiante, admin | profesor solo propias; estudiante solo publicadas de materias activas | presentación ajena/no publicada |
| `GET /presentaciones/{id}/estado` | profesor, estudiante, admin | misma lectura autorizada de presentación | no matriculado, no publicada, profesor ajeno |
| `GET /presentaciones/{id}/preview` | profesor, estudiante, admin | misma lectura autorizada de presentación | no matriculado, no publicada, profesor ajeno |
| `POST /analytics/evento` | profesor, estudiante, admin | evento permitido para rol; referencias bajo ámbito | evento/rol/referencia/metadata inválidos |
| `PATCH /incidencias/{id}/resolver` | profesor, admin | gestión de evaluación vinculada | estudiante y profesor ajeno; sin transición |

## Alcance exacto del administrador

- Asistencia y DBA: cualquier materia existente.
- Listado de recursos por materia: cualquier materia existente.
- Recurso individual por identificador: solo cuando el administrador figura como autor; se preserva la limitación actual.
- Listado, estado y vista previa de presentaciones: cualquier presentación existente.
- Resolución de incidencias: cualquier evaluación vinculada existente.
- Analítica: únicamente los eventos y referencias admitidos para `admin` por el catálogo cerrado.

## Reglas comunes

- Sesión ausente: autenticación requerida.
- Rol correcto sin propiedad: denegación.
- Interfaz oculta no equivale a autorización.
- Las lecturas estudiantiles solo devuelven contenido publicado y saneado.
- Resolver incidencias es distinto de crear una solicitud estudiantil.
- Una denegación no produce cambios persistentes.
- Los endpoints heredados conservan sus códigos públicos; solo analítica aplica el contrato nuevo de [analytics-errors.md](./analytics-errors.md).
