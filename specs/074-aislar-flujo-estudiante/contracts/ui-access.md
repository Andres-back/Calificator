# UI Access Contract

## Estudiante estándar

| Superficie | Resultado |
|---|---|
| `/app/materias` | Lista de materias matriculadas |
| `/app/materias/:id` | Vista general estudiantil |
| `evaluaciones`, `recursos`, `boletin` de la materia | Permitidos según permiso y matrícula |
| `calificar`, `asistencia`, `dba` o `criterios` de la materia | Acceso denegado |
| `/app/herramientas` y detalle editorial | Acceso denegado |
| `/app/presentaciones` | Biblioteca de presentaciones publicadas con lenguaje estudiantil |
| `/app/calificaciones` | Acceso denegado; resultados propios permanecen en boletín |

## Profesor o administrador

Conserva las superficies actuales siempre que tenga el permiso efectivo requerido.

## Usuario con rol personalizado

Puede abrir superficies elevadas únicamente cuando su rol personalizado está activo y posee el permiso efectivo requerido. Las operaciones continúan limitadas por sus permisos de lectura, creación, actualización, publicación o eliminación.

## Navegación de materia

- Compartidas: Vista general, Evaluaciones, Recursos y Boletín.
- Elevadas: Calificar, Asistencia y Criterios de aprendizaje/DBA.
- Una tarjeta de evaluación muestra `Calificar y revisar` solo en contexto elevado con permiso de revisión o calificación.

