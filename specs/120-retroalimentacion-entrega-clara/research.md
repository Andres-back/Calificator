# Investigación: devolución docente clara

## Hallazgo reproducido

Consulta de solo lectura de 50 notas recientemente revisadas: 42 devoluciones listas, 4 con bloqueo de desglose (3 publicadas), 1 publicada con mensaje provisional y 3 de evaluaciones no disponibles. Es una muestra diagnóstica, no una tasa general del sistema. No se descargaron mensajes, notas, nombres o fotos para documentarlo.

`calificaciones.service.publicar_nota` condiciona parte de la autoridad del desglose a una bandera; `feedback_sharing.projection.build_projection` exige siempre desglose completo/coherente y `quality_policy.ensure_feedback_coherence` rechaza texto provisional. Así se puede publicar una nota sin convertir el mensaje ni el desglose original en una devolución entregable. No es un fallo exclusivo de un docente o caché.

## Decisiones

### 1. Aprobación de resumen separada

- Decisión: incorporar revisión privada de devolución con mensaje aprobado, alcance y huella de fuente. Reutilizar nota confirmada; no modificar la propuesta ni ocultar avisos originales.
- Motivo: publicación de nota y revisión de mensaje no son equivalentes. El docente puede decidir la nota sin validar todas las preguntas que produjo la IA.
- Alternativas: quitar toda la puerta de calidad o borrar alertas al confirmar permitiría divulgar errores; exigir editar todas las preguntas perpetúa el bloqueo para un simple resumen.

### 2. Captura e invalidación

- Decisión: huella de fuente separada de huella de publicación; incluir identidad/decisión docente, texto fuente, desglose/versión/contenido relevante, reglas de soluciones, preguntas/criterios/metas y evidencia. Al cambiar cualquiera, no reutilizar la revisión.
- Motivo: una aprobación no debe aplicarse a una recalificación posterior con el mismo identificador. Mantener locks en orden nota → revisión/publicación → acceso para no introducir interbloqueos.
- Alternativa: usar únicamente updated_at o un booleano es insuficiente para cambios de evaluación/evidencia.

### 3. Contexto de Xali y compatibilidad

- Decisión: el resumen autorizado incluye respuestas vacías y una explicación de alcance; el contexto del chat continúa derivado del payload permitido. Mantener intacta la proyección histórica de devoluciones ya elegibles; no forzar revisión nueva a todos.
- Motivo: `chat_service.build_prompt` usa lista blanca de `respuestas`; excluirlas en origen evita filtrarlas. `guard_access` vuelve a validar fuente/huella y vigencia en cada acceso.
- Alternativa: esconder solo componentes en frontend deja el contexto incorrecto accesible desde el backend.

### 4. Presentación reutilizable

- Decisión: función conservadora que agrupa títulos explícitos y marcadores inequívocos conservando fragmentos íntegros, con salida general cuando no existe estructura fiable. Un componente compartido para docente y familia y salida plana equivalente para paginación física.
- Motivo: la ficha actual pagina el texto por medidas reales y conserva todos sus caracteres; enriquecer la vista no debe romper Carta/A4 ni esconder contenido en continuaciones.
- Alternativas: resumir automáticamente o llamar a IA por apertura añade gasto y puede alterar contenido; no está autorizado.

## Comprobaciones técnicas

- Infraestructura disponible: `FeedbackPublication` (snapshot por enlace), `FeedbackAccess` (emisión/idempotencia), invalidación transaccional y cuota durable de 600 segundos.
- Las revisiones para impresión no deben depender de crear un enlace ni revelar una credencial.
- Reutilizar fixtures PostgreSQL `SPEC107_TEST_DATABASE_URL` aisladas y pruebas sintéticas; no usar SQLite para claims/locks.
- Sin hooks de extensión. El intento de delegación de investigación requerido por Plan no estuvo disponible por límite de uso; investigación completada directamente mediante lectura del código, sin delegar interpretación de instrucciones.

No quedan decisiones marcadas como desconocidas. La revisión humana de calidad de requisitos permanece pendiente.
