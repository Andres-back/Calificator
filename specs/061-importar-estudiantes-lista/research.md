# Investigación: importación de estudiantes desde lista

## Extracción visual especializada

**Decisión**: crear un extractor de listados con un contrato de salida limitado a nombres, posición, confianza y señal de ilegibilidad.

**Razón**: el extractor vigente de evaluaciones espera preguntas y respuestas. Reutilizar su prompt puede convertir encabezados, fechas o marcas de asistencia en contenido académico incorrecto.

**Alternativas consideradas**:
- Reutilizar la digitalización de exámenes: rechazada por semántica y validación incompatibles.
- OCR local puro: útil como futuro respaldo, pero no resuelve con suficiente robustez tablas, escritura variable y exclusión semántica.

## Archivos y orientación

**Decisión**: reutilizar lectura limitada, validación por firma, almacenamiento privado y variantes de orientación/contraste.

**Razón**: ya son contratos probados para evidencia sensible y evitan confiar en la extensión del archivo.

**Alternativas consideradas**: guardar la foto públicamente o como URL directa; rechazado por datos de menores.

## Trabajo asíncrono

**Decisión**: seguir el patrón de trabajo persistente con snapshot de configuración de IA, claim, lease, reintento y recuperación de trabajos detenidos.

**Razón**: el docente debe continuar navegando y un reinicio no puede perder ni duplicar la importación.

**Alternativas consideradas**: mantener la solicitud HTTP abierta; rechazada porque bloquea el móvil y no tolera reinicios.

## Identidad sin correo real

**Decisión**: generar un correo interno único con nombre normalizado y sufijo aleatorio, almacenando además una marca explícita de correo interno.

**Razón**: conserva el inicio de sesión actual basado en correo sin fingir que existe un buzón ni intentar enviar recuperación.

**Alternativas consideradas**:
- Usar solo nombre de usuario: implicaría dos contratos de autenticación y cambios incompatibles.
- Usar el mismo correo genérico: imposible por unicidad y no identifica al alumno.

## Entrega de contraseñas

**Decisión**: generar una clave fuerte por alumno, persistir únicamente su hash y devolver el texto solo en la respuesta de confirmación o restablecimiento.

**Razón**: evita almacenar secretos recuperables. Si la respuesta se pierde, el titular puede emitir una nueva clave.

**Alternativas consideradas**: PDF permanente con claves o tabla cifrada recuperable; rechazadas por elevar la exposición de credenciales de menores.

## Duplicados

**Decisión**: detectar automáticamente la matrícula ya existente dentro de la misma materia; cualquier coincidencia por nombre fuera de ese vínculo requiere decisión humana.

**Razón**: dos estudiantes pueden llamarse igual. El nombre no es identidad suficiente.

**Alternativas consideradas**: fusionar por similitud; rechazada por riesgo de mezclar notas, entregas y datos.
