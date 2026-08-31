# Inventario de permisos y consumidores

Este inventario vincula cada capacidad administrable con su defensa de servidor y su superficie principal en la interfaz. Las reglas de propiedad, matrícula y estado continúan ejecutándose después del permiso modular.

| Módulo | Permisos | Router backend responsable | Superficie frontend |
|---|---|---|---|
| Usuarios | `users.read`, `users.create`, `users.update`, `users.delete` | `modules/users/router.py` | Administración > Usuarios |
| Roles | `roles.read`, `roles.manage` | `modules/authorization/router.py` | Administración > Roles y permisos |
| Configuración | `admin_settings.manage`, `admin_ai.manage`, `ai_settings.personal` | `modules/admin_mail/router.py`, `modules/admin_ai_config/router.py` | Correo, IA institucional, Mi configuración IA |
| Materias | `subjects.read`, `subjects.create`, `subjects.update`, `subjects.enroll` | `modules/materias/router.py`, `modules/matriculas/router.py` | Materias, detalle de materia, inscripción |
| DBA | `dba.read`, `dba.manage` | `modules/dba/router.py` | Materia > DBA |
| Asistencia | `attendance.read`, `attendance.manage` | `modules/asistencia/router.py` | Materia > Asistencia |
| Evaluaciones | `evaluations.read`, `evaluations.create`, `evaluations.update`, `evaluations.delete`, `evaluations.publish`, `evaluations.submit` | `modules/evaluaciones/router.py` | Evaluaciones, editor, resolver |
| Recursos | `resources.read`, `resources.create`, `resources.update`, `resources.delete`, `resources.assign` | `modules/herramientas/router.py`, `modules/imagenes/router.py` | Recursos, generador, detalle y asignación |
| Presentaciones | `presentations.read`, `presentations.create`, `presentations.update`, `presentations.delete` | `modules/presentaciones/router.py` | Presentaciones |
| Entregas | `submissions.read`, `submissions.review` | `modules/calificaciones/router.py` | Bandeja, evidencia y revisión |
| Calificación | `grading.read`, `grading.grade`, `grading.publish` | `modules/calificaciones/router.py` | Calificar, workspace e historial |
| Boletín | `gradebook.read` | `modules/calificaciones/router.py` | Boletín docente y resultados del estudiante |
| Reportes | `reports.read` | `modules/reportes/router.py`, `modules/analytics/router.py`, `modules/impacto_tesis/router.py` | Reportes y analítica |
| Xali | `xali.use` | `modules/xali/router.py`, `modules/xali/refuerzo_router.py`, `modules/rag/router.py` | Asistente Xali |

## Compatibilidad histórica

- Sin rol personalizado, `admin`, `profesor` y `estudiante` conservan sus matrices anteriores.
- Con rol personalizado, el conjunto elegido sustituye la matriz del perfil; no sustituye propiedad ni matrícula.
- El Administrador principal recibe el catálogo completo y es la única cuenta que puede conceder permisos críticos.
- Una mutación de contraseña, estado, perfil, rol o permisos incrementa `auth_version` e invalida sesiones anteriores.

## Riesgo y dependencias

- Críticos: retirar usuarios, gestionar roles, correo institucional e IA institucional. Solo los concede un Administrador principal.
- Sensibles: lectura de usuarios, IA personal, eliminación académica, entregas, notas y reportes.
- `roles.manage` es obligatorio para asignar un rol personalizado; `users.create` o `users.update` por sí solos no permiten elevar accesos.
- `grading.publish` no implica `grading.grade`; publicar y modificar una nota son decisiones separadas.
- El menú y las rutas frontend reflejan los permisos efectivos, pero el backend conserva la autoridad final.

## Retiro de comprobaciones históricas

La adopción es progresiva. Un `require_role` solo se elimina cuando la misma ruta tiene un permiso modular y sus controles de propiedad siguen cubiertos. Durante la transición se conserva la defensa histórica en servicios donde todavía dependa del perfil operativo.
