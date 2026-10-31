# Contrato frontend y compatibilidad

## Rutas

- Contextual docente: `/app/materias/:materiaId/evaluaciones/:evaluacionId/revision`; requiere staff efectivo, subjects.read y grading.read o grading.grade. Reutiliza workspace fuera del layoutMateria. No aumenta derechos backend.
- Global `/app/calificaciones`: sin evaluación muestra bandeja solo con submissions.review y acceso a elegir evaluación; con contexto antiguo mantiene revisión compatible. `workspace`, `workspace/:evaluacionId`, `foto`, `materias/:id/calificar` conservan parámetros mediante adaptador. No eliminar rutas.
- `calificaciones/boletin` y `materias/:id/boletin`: conservan sus capacidades existentes; resultados de estudiante intactos.
- Parámetros reconocidos existentes preservados por constructor, sin asumir UUID ficticios en test. IDs de ruta no sustituyen una autorización backend; evaluación/materia discordantes bloquean lectura de alumnos/acciones/contexto.
- Matcher común usado por AppShell/Topbar/analytics para ancho, monitores y etiqueta; no depender de igualdad literal con una sola URL.

## Navegación y permisos

Regreso primario único: estudiante→lista; lista contextual→evaluaciones. Retorno libro seguro secundario, sin flecha simultánea. Ruta directa tiene destino determinista. Selectores/cambios respetan los blockers actuales y cancelación de solicitudes; no cambiar ruta por efecto de fondo mientras hay borrador.

Perfiles grading sin subjects.read no reciben linkscontextuales imposibles; se conserva global y selectorcompatible. El menú Pendientes depende de grading.read o grading.grade para acceso; obtener datos de bandeja exige submissions.review. Si no, selección sin consulta prohibida. Estudiante estándar rechazado en revisión como ahora.

## Contenido

Copy propio único: Retroalimentación / Nota sugerida / Nota final / Recursos. Títulos de resultados del estudiante conservan sentido; no renombrar datos/eventos/rutas o reescribir comentarios guardados. `GradeAnalysisDetails` recibe el mismo desglose docente y muestra detalles por identidad de pregunta, sin fetch/escrituras.

Ayuda general cerrada: colores de prioridad no garantía/acierto, nota sugerida frente a final, material consultado si existe, imagen preparada/original. Mensajes concretos de inconsistencia, baja confianza, falta de evidencia, pendientes,403/409, error, cola y cambios sin guardar permanecen visibles y con sus acciones.

Individual: no dos compartir simultáneos en el mismo paso. Barra existente conserva compartir/imprimir; panel de enlaces conserva copiar y reintentar. Botones se bloquean por busy/dirty/permisos como actualmente. Consultar/abrir ayuda no emite ni publica enlaces.

## Validación

Contrato con pruebas de rutas completas, permisos denegados, retorno externo, error/parcial/muestra limitada, consulta única; regresiones de borrador y nota137. Capturas384/1440, dos temas, scroll desde centro/márgenes, contenido largo y200%letra. Ninguna imagen/dato real en pruebas.
