# Modelo de datos: presentación y captura existentes

No se añaden tablas, migraciones o contratos de servidor. Todo estado nuevo es de interfaz y no sustituye notas, entregas o asistencias guardadas.

## Asistencia

- `selectedDate`: fecha elegida, por defecto hoy; no se permiten fechas futuras.
- `AttendanceDraft`: diccionario por `estudiante_id` con estado o `null` y observación.
- `baseline`: jornada guardada para comparar cambios, no cambia por buscar o expandir ayuda.
- `summary`: total, presentes, tarde, ausentes, excusas y pendientes del borrador completo; no de las coincidencias visibles.
- `search`: filtro temporal por nombre/correo.
- Expansión de ayuda/desglose: estado nativo de presentación; no modifica el borrador ni inicia requests.

**Transiciones**: consulta → borrador de fecha → marcas/observaciones → lista completa → guardado explícito → nuevo baseline. Error de guardado conserva el borrador. Salida/fecha distinta con cambios conserva advertencias actuales.

## Contexto y candidatos de captura

- Identidad: materia derivada de evaluación autorizada, `evaluationId`, nombre de evaluación y `studentId` elegido explícitamente.
- Candidatos: matrícula actual menos alumnos con calificación/entrega aceptada en esa evaluación; se reutiliza `excludeSubmittedStudents`.
- Elegibilidad verificada: sin datos iniciales o ante refresco/fallo no se habilita enviar; después de primera carga válida el panel permanece montado para conservar el paquete.
- Key de aislamiento: evaluación + alumno + versión de descarte. No se transfiere un paquete a otra identidad sin advertencia y descarte explícito.

## Paquete existente

`EvidencePage`: `id`, `file`, `rotation` (0/90/180/270), `quality` opcional.

- Las fotos se cuentan y mantienen orden/rotaciones. El PDF es un único documento; el cliente no conoce necesariamente sus páginas y no las fabrica.
- Calidad de imagen `undefined`: análisis local pendiente; `good` o `warning`: resultado, preservando avisos; `unusable`: bloqueo; `null`: análisis no disponible o documento.
- Se mantienen límites, deduplicación y prohibición de mezclar fotos/PDF del selector vigente.
- La solicitud captura una copia estable de identidad, archivos y rotaciones al pulsar; callbacks tardíos no cambian el paquete enviado ni repueblan el siguiente contexto.

## Estado de envío

Vacío → alumno elegido → paquete en análisis/preparación → listo → enviando → aceptado o error.

- `listo`: alumno aún elegible, paquete válido y análisis terminado.
- `enviando`: exclusión síncrona y estado de mutation; no cambia destinatario, paquete o evaluación y no admite un segundo envío.
- `aceptado`: respuesta del servidor recibida; entonces se limpia paquete/dirty, se excluye alumno, se registra job y se permite siguiente captura.
- `error`: conserva identidad, archivos, orden y rotaciones; desbloquea reintento cuando los candidatos y calidad sean válidos.
- Aviso de aceptación: presentación del workspace identificada por evaluación y último alumno aceptado en la sesión, fuera del componente remount; no inventa nota ni publica.

Confirmación, publicación, reemplazo e historial de notas conservan sus ciclos actuales y son distintos del envío de evidencia.
