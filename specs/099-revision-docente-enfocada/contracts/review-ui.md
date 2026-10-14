# Contrato UI 099

## Entrada

Mismas rutas de calificaciones, parámetros alumno/evaluación/pregunta/hoja y permisos actuales. No modificar endpoints ni payloads. La revisión solo cambia presentación y acceso a capacidades existentes.

## Portada compacta

Identidad + nota/escala + estado, sin repetir materia/evaluación innecesariamente. Si no hay decisión: «Nota sugerida por la IA». Si la hay: «Nota confirmada». Procesando/sin resultado: estado real, no cero.

Ejemplo de discrepancia pendiente: «La IA propone 2,52, pero los puntajes por respuesta suman 2,48. Revisa los puntajes antes de confirmar». El valor calculado debe respetar la escala y fórmula reales, no asumir que puntos brutos son la nota final. No atribuirlo al docente sin registro.

Un aviso prioritario con «Revisar ahora», dirigido a pregunta identificada o sección pertinente. «Ver todos los avisos» conserva el detalle completo. La ausencia de avisos no garantiza respuestas correctas. No cambiar condiciones de confirmación/publicación como efecto de esta reorganización.

## Navegación

Respuestas, Evidencia, Retroalimentación e Historial con controles de 44 px, adaptables sin scroll horizontal, sección seleccionada y nombre accesible. En celular un panel principal; en escritorio comparar foto/respuestas si el espacio lo permite. Volver a notas del grupo y Siguiente estudiante conservan guardas y contexto. Nombre disponible al revisar, no oculto por mensajes extensos.

Historial permite ver cambios/decisiones/versiones/avisos originales sin expandir todo inicialmente. Opciones conserva ajustes globales, liberación de referencias, publicación y reanálisis con permisos actuales. El flujo de edición por respuesta sigue comparando respuesta del alumno, referencia y puntaje.

## Quejas y reclamos

Acceso con contador de abiertos cuando hay registros; resueltos también consultables. Sin registros tras consulta correcta: no panel vacío, pero «Registrar reclamo» en opciones según autorización existente. Carga/error comunicados; «No pudimos consultar los reclamos» y Reintentar, sin afirmar ausencia. Conservar creación/resolución y borradores de formularios.

## Conservación y errores

Cambio de sección no recalifica ni modifica datos; no descarta borradores sin decisión. Fallo de evidencia/resultado conserva navegación y recuperación; permisos/session invalidan contenido privado. Teclado no queda bajo barra de acciones. Mensajes en español comprensible, sin identificadores internos visibles por defecto.
