# Investigación: encolado seguro de calificaciones

## Línea base observada

- `backend/app/modules/calificaciones/router.py` tiene 1.795 líneas y combina contratos HTTP, preparación de entregas y coordinación de trabajos asíncronos.
- `_enqueue_persisted_grading` es una unidad de unas 70 líneas y tiene cinco consumidores: calificación por foto del docente, reintento de foto, modo salón, entrega online y archivo del estudiante.
- Cada recorrido individual crea un trabajo padre de resumen y un trabajo hijo por entrega. La calificación almacena el identificador del hijo.
- La transacción se confirma antes de publicar el mensaje Celery. Si la publicación falla, el hijo se marca `retrying` para recuperación, sin perder la evidencia ni inventar una nota.
- El endpoint por lote repite parte de la coordinación, pero crea todos los hijos dentro de una sola transacción multiestudiante y después publica cada uno. No es la misma unidad transaccional.
- `jobs_service.claim_job_running` reclama trabajos mediante una actualización atómica; dos mensajes del mismo trabajo no deben ejecutar dos inferencias.
- La recuperación de trabajos en cola usa leases y una marca de republicación para evitar que varios recuperadores publiquen simultáneamente el mismo trabajo.

## Decisión 1: extraer una frontera de dominio pequeña

**Decisión**: mover solamente `_enqueue_persisted_grading` a `grading_queue_service.py`.

**Razón**: el método ya representa una operación de dominio completa: transformar una entrega preparada en una calificación pendiente recuperable. Su extracción reduce el router sin cambiar reglas ni contratos.

**Alternativas consideradas**:

- Extraer todo el endpoint: descartado porque mezclaría validación HTTP, archivos y permisos.
- Extraer también el lote: pospuesto porque su atomicidad multiestudiante requiere una fase y pruebas propias.
- Crear un servicio genérico de Celery: descartado porque perdería las invariantes específicas entre entrega, calificación y trabajos.

## Decisión 2: conservar un alias de compatibilidad

**Decisión**: el router expondrá `_enqueue_persisted_grading` como alias del nuevo servicio.

**Razón**: permite que las cinco llamadas sigan idénticas y evita romper las pruebas que sustituyen ese símbolo. El alias se podrá retirar en una fase posterior cuando no tenga consumidores externos.

## Decisión 3: preservar el orden persistir → confirmar → publicar

**Decisión**: no modificar el orden actual ni agregar commits.

**Razón**: el worker solo debe recibir un identificador cuyos datos ya sean visibles en base de datos. Un fallo de publicación después del commit es recuperable; un mensaje previo al commit puede convertirse en una ejecución huérfana.

## Decisión 4: reutilizar la identidad del trabajo ante fallos

**Decisión**: si `apply_async` falla, marcar el mismo hijo como `retrying`.

**Razón**: la calificación ya referencia ese hijo. Reutilizarlo conserva trazabilidad, permite republicación y evita duplicar calificaciones, entregas o trabajos.

## Decisión 5: probar la frontera y sus protecciones externas

**Decisión**: añadir pruebas unitarias directas del nuevo servicio y conservar las pruebas existentes de consumidor, lote, worker y leases.

**Razón**: las unitarias detectan cambios de orden y manejo del broker; las regresiones prueban que la extracción no altera endpoints; las pruebas del worker y leases verifican la concurrencia real que el servicio delega.

## Conclusión

La extracción propuesta es mecánica y reversible. Reduce acoplamiento del router, hace explícito el contrato de encolado y mantiene la arquitectura asíncrona que evita bloquear al docente durante la inferencia. No requiere migraciones, nuevas dependencias ni cambios de interfaz.
